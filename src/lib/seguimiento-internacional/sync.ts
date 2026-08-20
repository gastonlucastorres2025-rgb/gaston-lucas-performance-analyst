import { createHash } from "node:crypto";
import { descargarArchivoDrive, fetchArchivosDeCarpeta, fetchNombreCarpeta, type ArchivoDrive } from "@/lib/google-drive";
import { createAdminClient } from "@/lib/supabase/admin";
import { leerSheetInformesIndividuales, type FilaJugadorSheet } from "@/lib/seguimiento-internacional/sheets";
import { extraerJugadoresDePdf, type FilaJugadorPdf } from "@/lib/seguimiento-internacional/pdf";
import { buscarCoincidencias, normalizarNombre, type JugadorExistente, type CandidatoJugador } from "@/lib/seguimiento-internacional/matching";
import { normalizarPosicion } from "@/lib/seguimiento-internacional/posiciones";

const FOLDER_MIME = "application/vnd.google-apps.folder";
const SHEET_MIME = "application/vnd.google-apps.spreadsheet";
const PDF_MIME = "application/pdf";

// Tipos ignorados a propósito (pedido explícito del usuario: nada de video), más los
// formatos fuente (Keynote/PowerPoint/Slides) que son el origen de los mismos PDF ya
// procesados — reprocesarlos sería duplicar la misma información dos veces.
// No hace falta una lista de "ignorados": simplemente no están en SHEET_MIME/PDF_MIME.

type FilaNormalizada = {
  nombreCompleto: string;
  nombre: string | null;
  apellido: string | null;
  dorsal: string | null;
  posicion: string | null;
  altura: number | null;
  pieHabil: "izquierdo" | "derecho" | "ambidiestro" | null;
  tactico: string | null;
  tecnico: string | null;
  fisico: string | null;
  otrasObservaciones: string | null;
  clubAlMomento: string | null;
  competencia: string | null;
  temporada: string | null;
};

function normalizarPie(v: string | null): "izquierdo" | "derecho" | "ambidiestro" | null {
  if (!v) return null;
  const s = v.toLowerCase();
  // No usa startsWith: a veces el campo arrastra alguna palabra suelta del párrafo
  // vecino antes del valor real (ej. "Arquero de per Derecho"), por una imprecisión de
  // límite de columna en el PDF (ver src/lib/seguimiento-internacional/pdf.ts).
  if (/\bderech[oa]\b/.test(s)) return "derecho";
  if (/\bizquierd[oa]\b/.test(s)) return "izquierdo";
  if (/\bambidi[e]?[s]?tr[oa]\b/.test(s)) return "ambidiestro";
  return null;
}

function parseAltura(v: string | null): number | null {
  if (!v) return null;
  const n = Number(v.replace(",", "."));
  return Number.isFinite(n) && n > 100 && n < 230 ? n : null;
}

function filaSheetANormalizada(fila: FilaJugadorSheet, competencia: string | null, temporada: string | null): FilaNormalizada {
  return {
    nombreCompleto: `${fila.nombre} ${fila.apellido}`.trim(),
    nombre: fila.nombre || null,
    apellido: fila.apellido || null,
    dorsal: fila.dorsal,
    posicion: fila.posicion,
    altura: null,
    pieHabil: null,
    tactico: fila.tactico,
    tecnico: fila.tecnico,
    fisico: fila.fisico,
    otrasObservaciones: fila.otrasObservaciones,
    clubAlMomento: fila.equipo || null,
    competencia,
    temporada,
  };
}

// El PDF viene con nombre completo en una sola celda; el apellido se aproxima como la
// última palabra (mejor esfuerzo — corregible a mano después, no se inventa una
// separación que el documento no da explícitamente).
function filaPdfANormalizada(fila: FilaJugadorPdf, clubAlMomento: string | null, competencia: string | null, temporada: string | null): FilaNormalizada {
  const partes = fila.nombre.trim().split(/\s+/);
  const apellido = partes.length > 1 ? partes[partes.length - 1] : null;
  const nombre = partes.length > 1 ? partes.slice(0, -1).join(" ") : fila.nombre;

  return {
    nombreCompleto: fila.nombre.trim(),
    nombre,
    apellido,
    dorsal: fila.dorsal,
    posicion: fila.posicion,
    altura: parseAltura(fila.altura),
    pieHabil: normalizarPie(fila.pieHabil),
    tactico: fila.tactico,
    tecnico: fila.tecnico,
    fisico: fila.fisico,
    otrasObservaciones: null,
    clubAlMomento,
    competencia,
    temporada,
  };
}

// "TIGRE - INDIVIDUALES.pdf" -> "TIGRE"; "RESUMEN INDIVIDUALES RIVAL F11 RUBIO ÑU.pdf" ->
// "RUBIO ÑU". Solo se usa cuando el PDF trae varios jugadores (indicio de que el
// documento es "de equipo"); con un solo jugador el nombre de archivo casi seguro es el
// del propio jugador, no un club, y ahí se descarta para no ensuciar el dato.
const RUIDO_PATRON = "resumen|individual(?:es)?|informe|rival|clausura|apertura|\\d{4}";

// "TIGRE - INDIVIDUALES.pdf" -> "TIGRE"; pero si después de sacar el ruido todavía queda
// una palabra del propio ruido (ej. el archivo decía "RESUMEN INDIVIDUAL OLIMPIA", en
// singular, que la versión anterior de este filtro no reconocía), se descarta del todo
// en vez de guardar basura como si fuera el nombre de un club — mejor sin dato que un
// dato visiblemente mal parseado. Instancias de regex separadas para el replace (global)
// y el chequeo final (sin estado "lastIndex" que arrastrar entre llamadas).
function inferirClubDesdeNombreArchivo(nombreArchivo: string): string | null {
  const limpio = nombreArchivo
    .replace(/\.(pdf)$/i, "")
    .replace(new RegExp(RUIDO_PATRON, "gi"), "")
    .replace(/\bF\d{1,2}\b/g, "")
    .replace(/[-–]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  if (!limpio || new RegExp(RUIDO_PATRON, "i").test(limpio)) return null;
  return limpio;
}

function parseCarpetaCompetencia(nombre: string): { competencia: string; temporada: string | null } {
  const partes = nombre.split(" - ");
  if (partes.length >= 2) {
    return { competencia: partes[0].trim(), temporada: partes[1].trim() };
  }
  return { competencia: nombre.trim(), temporada: null };
}

async function listarArchivosRecursivo(folderId: string): Promise<{ archivo: ArchivoDrive; folderId: string }[]> {
  const items = await fetchArchivosDeCarpeta(folderId);
  const resultado: { archivo: ArchivoDrive; folderId: string }[] = [];

  for (const item of items) {
    if (item.mimeType === FOLDER_MIME) {
      const dentro = await fetchArchivosDeCarpeta(item.id);
      for (const archivo of dentro) {
        if (archivo.mimeType === SHEET_MIME || archivo.mimeType === PDF_MIME) {
          resultado.push({ archivo: { ...archivo, name: archivo.name }, folderId: item.id });
        }
      }
    } else if (item.mimeType === SHEET_MIME || item.mimeType === PDF_MIME) {
      resultado.push({ archivo: item, folderId });
    }
  }

  return resultado;
}

export type ResumenSincronizacion = {
  documentosProcesados: number;
  jugadoresCreados: number;
  jugadoresActualizados: number;
  enviadosARevision: number;
  archivosSinCambios: number;
  errores: { archivo: string; error: string }[];
};

export async function sincronizarSeguimientoInternacional(folderIdRaiz: string, iniciadaPor: string | null): Promise<ResumenSincronizacion> {
  const admin = createAdminClient();
  const { data: team } = await admin.from("teams").select("id").limit(1).single();
  if (!team) throw new Error("No hay equipo configurado.");

  const { data: importacion } = await admin
    .from("si_importaciones")
    .insert({ team_id: team.id, origen: "drive_manual", iniciada_por: iniciadaPor, estado: "procesando" })
    .select("id")
    .single();

  const resumen: ResumenSincronizacion = {
    documentosProcesados: 0,
    jugadoresCreados: 0,
    jugadoresActualizados: 0,
    enviadosARevision: 0,
    archivosSinCambios: 0,
    errores: [],
  };

  // Se cargan una sola vez y se van sumando los jugadores creados en esta misma corrida,
  // para detectar duplicados también dentro de una misma sincronización (ej. el mismo
  // rival mencionado en dos documentos distintos), no solo contra lo que ya existía.
  const { data: existentesDb } = await admin
    .from("si_jugadores")
    .select("id, full_name, normalized_name, current_club, primary_position, height, preferred_foot")
    .eq("team_id", team.id);

  const existentes: JugadorExistente[] = (existentesDb ?? []).map((j) => ({
    id: j.id,
    fullName: j.full_name,
    normalizedName: j.normalized_name,
    currentClub: j.current_club,
    primaryPosition: j.primary_position,
    height: j.height,
    preferredFoot: j.preferred_foot,
  }));

  const archivos = await listarArchivosRecursivo(folderIdRaiz);
  const carpetasNombre = new Map<string, string>();

  for (const { archivo, folderId } of archivos) {
    try {
      let filasCrudas: FilaNormalizada[] = [];
      let contenidoParaHash: string;

      if (archivo.mimeType === SHEET_MIME) {
        const filasSheet = await leerSheetInformesIndividuales(archivo.id);
        contenidoParaHash = JSON.stringify(filasSheet);
        const { competencia, temporada } = await nombreCarpetaCacheado(folderId, folderIdRaiz, carpetasNombre);
        filasCrudas = filasSheet.map((f) => filaSheetANormalizada(f, competencia, temporada));
      } else {
        const buffer = Buffer.from(await descargarArchivoDrive(archivo.id));
        contenidoParaHash = buffer.toString("base64");
        const { filas, confianza } = await extraerJugadoresDePdf(buffer);
        const { competencia, temporada } = await nombreCarpetaCacheado(folderId, folderIdRaiz, carpetasNombre);
        const clubDelArchivo = filas.length > 1 ? inferirClubDesdeNombreArchivo(archivo.name) : null;
        filasCrudas = filas.map((f) => filaPdfANormalizada(f, clubDelArchivo, competencia, temporada));

        if (confianza < 0.5) {
          resumen.errores.push({ archivo: archivo.name, error: `Confianza de extracción baja (${Math.round(confianza * 100)}%), requiere revisión manual` });
        }
      }

      const hash = createHash("sha256").update(contenidoParaHash).digest("hex");

      const { data: docExistente } = await admin
        .from("si_documentos_fuente")
        .select("id, checksum")
        .eq("team_id", team.id)
        .eq("drive_file_id", archivo.id)
        .order("version", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (docExistente?.checksum === hash) {
        resumen.archivosSinCambios++;
        continue;
      }

      const version = docExistente ? await siguienteVersion(admin, team.id, archivo.id) : 1;
      const { data: documento, error: errorDoc } = await admin
        .from("si_documentos_fuente")
        .insert({
          team_id: team.id,
          drive_file_id: archivo.id,
          file_name: archivo.name,
          file_type: archivo.mimeType === SHEET_MIME ? "google_sheet" : "pdf",
          drive_url: archivo.webViewLink,
          folder_id: folderId,
          checksum: hash,
          version,
          processing_status: "procesando",
          imported_at: new Date().toISOString(),
        })
        .select("id")
        .single();

      if (errorDoc || !documento) {
        resumen.errores.push({ archivo: archivo.name, error: errorDoc?.message ?? "error desconocido registrando el documento" });
        continue;
      }

      let seEnvioARevisionEsteArchivo = false;

      for (const fila of filasCrudas) {
        if (!fila.nombreCompleto) continue;

        // El perfil consolidado (primary_position) usa la taxonomía fija; el texto
        // crudo tal como vino del documento se conserva sin tocar en
        // si_observaciones.position_observed, más abajo.
        const { primaria: posicionCanonica, secundarias: posicionesSecundarias } = normalizarPosicion(fila.posicion);

        const candidato: CandidatoJugador = {
          fullName: fila.nombreCompleto,
          currentClub: fila.clubAlMomento,
          primaryPosition: posicionCanonica,
          height: fila.altura,
          preferredFoot: fila.pieHabil,
        };

        const coincidencias = buscarCoincidencias(candidato, existentes);
        const mejor = coincidencias[0];

        let playerId: string;

        if (mejor && mejor.nivel === "alta") {
          playerId = mejor.jugador.id;
          resumen.jugadoresActualizados++;
          await actualizarCamposFaltantes(admin, playerId, candidato, iniciadaPor, documento.id);
        } else {
          const normalizedName = normalizarNombre(fila.nombreCompleto);
          const { data: nuevo, error: errorNuevo } = await admin
            .from("si_jugadores")
            .insert({
              team_id: team.id,
              full_name: fila.nombreCompleto,
              normalized_name: normalizedName,
              first_name: fila.nombre,
              last_name: fila.apellido,
              current_club: fila.clubAlMomento,
              primary_position: posicionCanonica,
              secondary_positions: posicionesSecundarias,
              height: fila.altura,
              preferred_foot: fila.pieHabil,
              tracking_status: "detectado",
              profile_state: mejor && mejor.nivel === "media" ? "pendiente_revision" : "incompleto",
            })
            .select("id")
            .single();

          if (errorNuevo || !nuevo) {
            resumen.errores.push({ archivo: archivo.name, error: errorNuevo?.message ?? "error creando jugador" });
            continue;
          }

          playerId = nuevo.id;
          resumen.jugadoresCreados++;
          existentes.push({
            id: playerId,
            fullName: fila.nombreCompleto,
            normalizedName,
            currentClub: fila.clubAlMomento,
            primaryPosition: posicionCanonica,
            height: fila.altura,
            preferredFoot: fila.pieHabil,
          });

          if (mejor && mejor.nivel === "media") {
            await admin.from("si_revisiones").insert({
              team_id: team.id,
              tipo: "posible_duplicado",
              player_id: playerId,
              player_candidato_id: mejor.jugador.id,
              source_document_id: documento.id,
              score_confianza: mejor.score,
              detalle: { camposCoincidentes: mejor.camposCoincidentes, camposDiferentes: mejor.camposDiferentes },
            });
            resumen.enviadosARevision++;
            seEnvioARevisionEsteArchivo = true;
          }
        }

        await admin.from("si_observaciones").insert({
          player_id: playerId,
          tactical_text: fila.tactico,
          technical_text: fila.tecnico,
          physical_text: fila.fisico,
          general_summary: fila.otrasObservaciones,
          position_observed: fila.posicion,
          club_at_time: fila.clubAlMomento,
          competition: fila.competencia,
          shirt_number_at_time: fila.dorsal,
          source_document_id: documento.id,
          validation_status: "pendiente",
          confidence_score: mejor?.score ?? null,
        });
      }

      await admin
        .from("si_documentos_fuente")
        .update({ processing_status: seEnvioARevisionEsteArchivo ? "procesado_con_observaciones" : "procesado" })
        .eq("id", documento.id);

      resumen.documentosProcesados++;
    } catch (e) {
      resumen.errores.push({ archivo: archivo.name, error: e instanceof Error ? e.message : String(e) });
    }
  }

  await admin
    .from("si_importaciones")
    .update({
      estado: resumen.errores.length > 0 ? "ok_con_avisos" : "ok",
      documentos_procesados: resumen.documentosProcesados,
      jugadores_creados: resumen.jugadoresCreados,
      jugadores_actualizados: resumen.jugadoresActualizados,
      enviados_a_revision: resumen.enviadosARevision,
      detalle: { errores: resumen.errores, archivosSinCambios: resumen.archivosSinCambios },
      finished_at: new Date().toISOString(),
    })
    .eq("id", importacion?.id);

  return resumen;
}

async function siguienteVersion(admin: ReturnType<typeof createAdminClient>, teamId: string, driveFileId: string): Promise<number> {
  const { data } = await admin
    .from("si_documentos_fuente")
    .select("version")
    .eq("team_id", teamId)
    .eq("drive_file_id", driveFileId)
    .order("version", { ascending: false })
    .limit(1)
    .maybeSingle();
  return (data?.version ?? 0) + 1;
}

// No sobreescribe nunca un valor ya cargado (manual o de una importación previa): solo
// completa campos que estén vacíos, y deja registro en si_cambios_historial.
async function actualizarCamposFaltantes(
  admin: ReturnType<typeof createAdminClient>,
  playerId: string,
  candidato: CandidatoJugador,
  autorId: string | null,
  sourceDocumentId: string,
): Promise<void> {
  const { data: jugador } = await admin.from("si_jugadores").select("*").eq("id", playerId).single();
  if (!jugador) return;

  const cambios: Record<string, unknown> = {};
  const historial: { campo: string; valor_anterior: string | null; valor_nuevo: string }[] = [];

  const candidatos: [string, unknown][] = [
    ["current_club", candidato.currentClub],
    ["primary_position", candidato.primaryPosition],
    ["height", candidato.height],
    ["preferred_foot", candidato.preferredFoot],
  ];

  for (const [campo, valorNuevo] of candidatos) {
    if (valorNuevo != null && (jugador as Record<string, unknown>)[campo] == null) {
      cambios[campo] = valorNuevo;
      historial.push({ campo, valor_anterior: null, valor_nuevo: String(valorNuevo) });
    }
  }

  if (Object.keys(cambios).length > 0) {
    await admin.from("si_jugadores").update({ ...cambios, updated_at: new Date().toISOString() }).eq("id", playerId);
    for (const h of historial) {
      await admin.from("si_cambios_historial").insert({
        player_id: playerId,
        campo: h.campo,
        valor_anterior: h.valor_anterior,
        valor_nuevo: h.valor_nuevo,
        origen: "importacion_pdf",
        autor_id: autorId,
        source_document_id: sourceDocumentId,
      });
    }
  }
}

async function nombreCarpetaCacheado(
  folderId: string,
  folderIdRaiz: string,
  cache: Map<string, string>,
): Promise<{ competencia: string | null; temporada: string | null }> {
  if (folderId === folderIdRaiz) return { competencia: null, temporada: null };
  if (!cache.has(folderId)) {
    const nombre = await fetchNombreCarpeta(folderId);
    cache.set(folderId, nombre);
  }
  return parseCarpetaCompetencia(cache.get(folderId)!);
}

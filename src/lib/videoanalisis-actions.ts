"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { decodificarXml, parsearXmlNacsport } from "@/lib/videoanalisis/xml-parser";
import { extraerYoutubeId } from "@/lib/videoanalisis/youtube";
import { fetchPartidosSheetRows, type PartidoSheetRow } from "@/lib/videoanalisis/sheet";
import {
  descargarArchivoDrive,
  extraerFileIdDeUrl,
  extraerFolderIdDeUrl,
  fetchArchivosDeCarpeta,
} from "@/lib/google-drive";
import { buscarOCrearRival } from "@/lib/rivales";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export type CrearPartidoVAState = { error: string | null };

async function getTeamId() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: staff } = await supabase.from("staff_users").select("team_id").eq("id", user.id).single();
  return staff?.team_id ?? null;
}

async function guardarLogoCompetencia(teamId: string, nombre: string, file: File): Promise<string | null> {
  if (!file.type.startsWith("image/")) return null;

  const admin = createAdminClient();
  const ext = file.name.split(".").pop() || "png";
  const path = `${teamId}/${nombre.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${Date.now()}.${ext}`;
  const bytes = Buffer.from(await file.arrayBuffer());

  const { error: uploadError } = await admin.storage.from("videoanalisis-logos").upload(path, bytes, {
    contentType: file.type,
  });
  if (uploadError) return null;

  const {
    data: { publicUrl },
  } = admin.storage.from("videoanalisis-logos").getPublicUrl(path);

  await admin.from("va_competencia_logos").upsert(
    { team_id: teamId, nombre, logo_url: publicUrl },
    { onConflict: "team_id,nombre" },
  );

  return publicUrl;
}

export async function crearPartidoVA(
  _prevState: CrearPartidoVAState,
  formData: FormData,
): Promise<CrearPartidoVAState> {
  const teamId = await getTeamId();
  if (!teamId) return { error: "No autenticado." };

  const fecha = formData.get("fecha") as string;
  const rivalSeleccionado = (formData.get("rival") as string)?.trim();
  const rivalOtro = (formData.get("rival_otro") as string)?.trim();
  const rival = rivalSeleccionado === "__otro__" ? rivalOtro : rivalSeleccionado;
  const competencia = (formData.get("competencia") as string)?.trim() || null;
  const competenciaLogoFile = formData.get("competencia_logo") as File | null;
  const categoria = (formData.get("categoria") as string)?.trim() || null;
  const condicion = (formData.get("condicion") as string) || null;
  const golesFavorRaw = formData.get("goles_favor") as string;
  const golesContraRaw = formData.get("goles_contra") as string;
  const youtubeInput = (formData.get("youtube") as string)?.trim();
  const xmlFile = formData.get("xml") as File | null;

  if (!fecha || !rival) return { error: "Completá al menos la fecha y el rival." };

  if (competencia && competenciaLogoFile && competenciaLogoFile.size > 0) {
    await guardarLogoCompetencia(teamId, competencia, competenciaLogoFile);
  }

  const youtubeId = youtubeInput ? extraerYoutubeId(youtubeInput) : null;
  if (!youtubeId) return { error: "El link de YouTube no parece válido." };

  if (!xmlFile || xmlFile.size === 0) return { error: "Subí el XML exportado del partido." };

  let xmlTexto: string;
  try {
    xmlTexto = decodificarXml(await xmlFile.arrayBuffer());
  } catch {
    return { error: "No se pudo leer el archivo XML." };
  }

  let parseado: ReturnType<typeof parsearXmlNacsport>;
  try {
    parseado = parsearXmlNacsport(xmlTexto);
  } catch (e) {
    return { error: `No se pudo interpretar el XML: ${(e as Error).message}` };
  }

  const admin = createAdminClient();
  const xmlPath = `${teamId}/${Date.now()}-${xmlFile.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
  const { error: uploadError } = await admin.storage.from("videoanalisis-xml").upload(xmlPath, xmlTexto, {
    contentType: "text/xml",
  });
  if (uploadError) return { error: `No se pudo guardar el XML: ${uploadError.message}` };

  const supabase = await createClient();
  const rivalId = await buscarOCrearRival(supabase, teamId, rival);
  const { data: partido, error: insertError } = await supabase
    .from("partidos_va")
    .insert({
      team_id: teamId,
      fecha,
      rival,
      rival_id: rivalId,
      competencia,
      categoria,
      condicion,
      goles_favor: golesFavorRaw ? Number(golesFavorRaw) : null,
      goles_contra: golesContraRaw ? Number(golesContraRaw) : null,
      youtube_video_id: youtubeId,
      xml_storage_path: xmlPath,
      xml_procesado_en: new Date().toISOString(),
    })
    .select("id")
    .single();

  if (insertError || !partido) {
    return { error: `No se pudo crear el partido: ${insertError?.message}` };
  }

  const { error: categoriasError } = await supabase.from("va_categorias").insert(
    parseado.categorias.map((c) => ({
      team_id: teamId,
      partido_id: partido.id,
      codigo: c.codigo,
      color_hex: c.colorHex,
    })),
  );
  if (categoriasError) return { error: `No se pudieron guardar las categorías: ${categoriasError.message}` };

  const { error: accionesError } = await supabase.from("va_acciones").insert(
    parseado.acciones.map((a) => ({
      team_id: teamId,
      partido_id: partido.id,
      codigo: a.codigo,
      inicio_seg: a.inicio,
      fin_seg: a.fin,
    })),
  );
  if (accionesError) return { error: `No se pudieron guardar las acciones: ${accionesError.message}` };

  revalidatePath("/videoanalisis");
  redirect(`/videoanalisis/${partido.id}`);
}

export type SincronizarSheetResult = {
  error: string | null;
  creados: number;
  saltados: number;
  xmlCompletados: number;
  fallidos: { fila: string; motivo: string }[];
};

function coincideCodigoConRival(codigo: string, rivalNombre: string): boolean {
  const limpio = rivalNombre
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase();
  return limpio.split(/\s+/).some((palabra) => palabra.startsWith(codigo));
}

/**
 * Los XML de Nacsport suelen nombrarse "{TORNEO} F{n} {COD1}-{COD2}.xml", donde
 * uno de los códigos es nuestro equipo y el otro el rival, en el orden en que
 * jugaron de local. Si el link de la fila es una carpeta (no un archivo puntual),
 * buscamos ahí el único archivo cuyo orden local/visitante coincida con la
 * columna "Local/Visita" de esa fila Y cuyo código de rival coincida con el
 * nombre de la fila. Si hay más de un candidato o ninguno, no se adivina: esa
 * fila queda con el motivo del error para resolverla a mano.
 */
async function resolverXmlPorCarpeta(
  filas: PartidoSheetRow[],
): Promise<{ resueltos: Map<string, string>; errores: Map<string, string> }> {
  const nuestroCodigo = (process.env.STATSBOMB_OUR_TEAM_NAME || "").slice(0, 3).toUpperCase();
  const resueltos = new Map<string, string>();
  const errores = new Map<string, string>();

  const filasPorCarpeta = new Map<string, PartidoSheetRow[]>();
  for (const fila of filas) {
    if (!fila.xmlDriveLink) continue;
    if (extraerFileIdDeUrl(fila.xmlDriveLink)) continue;
    const folderId = extraerFolderIdDeUrl(fila.xmlDriveLink);
    if (!folderId) {
      errores.set(fila.sheetRowId, "el link de Drive a XML no es ni un archivo ni una carpeta reconocibles");
      continue;
    }
    if (!filasPorCarpeta.has(folderId)) filasPorCarpeta.set(folderId, []);
    filasPorCarpeta.get(folderId)!.push(fila);
  }

  for (const [folderId, filasCarpeta] of filasPorCarpeta) {
    let archivos: Awaited<ReturnType<typeof fetchArchivosDeCarpeta>>;
    try {
      archivos = await fetchArchivosDeCarpeta(folderId);
    } catch (e) {
      for (const fila of filasCarpeta) errores.set(fila.sheetRowId, `no se pudo leer la carpeta de Drive: ${(e as Error).message}`);
      continue;
    }
    archivos = archivos.filter((a) => a.name.toLowerCase().endsWith(".xml"));

    const usados = new Set<string>();
    for (const fila of filasCarpeta) {
      if (!nuestroCodigo) {
        errores.set(fila.sheetRowId, "falta configurar STATSBOMB_OUR_TEAM_NAME para poder identificar nuestro equipo en el nombre del archivo");
        continue;
      }
      const esperaNuestroPrimero = fila.condicion === "local";
      const candidatos = archivos.filter((a) => {
        if (usados.has(a.id)) return false;
        const base = a.name.replace(/\.xml$/i, "");
        const equipos = base.split(" ").pop() ?? "";
        const [primero, segundo] = equipos.split("-");
        if (!primero || !segundo) return false;
        if (![primero, segundo].includes(nuestroCodigo)) return false;
        if ((primero === nuestroCodigo) !== esperaNuestroPrimero) return false;
        const codigoRival = primero === nuestroCodigo ? segundo : primero;
        return fila.rival ? coincideCodigoConRival(codigoRival, fila.rival) : false;
      });

      if (candidatos.length === 1) {
        resueltos.set(fila.sheetRowId, candidatos[0].id);
        usados.add(candidatos[0].id);
      } else if (candidatos.length === 0) {
        errores.set(fila.sheetRowId, "no encontré un XML en la carpeta cuyo código de rival y orden local/visitante coincidan con esta fila");
      } else {
        errores.set(fila.sheetRowId, `hay ${candidatos.length} archivos ambiguos en la carpeta para esta fila, pegá el link directo al XML correcto`);
      }
    }
  }

  return { resueltos, errores };
}

export async function sincronizarPartidosVADesdeSheet(): Promise<SincronizarSheetResult> {
  const vacio: SincronizarSheetResult = { error: null, creados: 0, saltados: 0, xmlCompletados: 0, fallidos: [] };
  const teamId = await getTeamId();
  if (!teamId) return { ...vacio, error: "No autenticado." };

  let filas: Awaited<ReturnType<typeof fetchPartidosSheetRows>>;
  try {
    filas = await fetchPartidosSheetRows();
  } catch (e) {
    return {
      ...vacio,
      error: `${(e as Error).message} Verificá que esté compartida con ${process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL}.`,
    };
  }

  const supabase = await createClient();
  const admin = createAdminClient();

  const { data: existentes } = await supabase
    .from("partidos_va")
    .select("id, sheet_row_id, xml_storage_path")
    .eq("team_id", teamId)
    .not("sheet_row_id", "is", null);
  const yaImportados = new Map((existentes ?? []).map((r) => [r.sheet_row_id, r]));
  const filasNuevas = filas.filter((f) => !yaImportados.has(f.sheetRowId));
  const saltados = filas.length - filasNuevas.length;

  // Partidos que ya se importaron desde el Sheet en su momento SIN xml (la fila no tenía el
  // link todavía) y que ahora sí lo tienen: antes quedaban saltados para siempre porque el
  // dedupe solo miraba si el sheet_row_id ya existía, sin importar si le faltaba el xml.
  const filasParaCompletarXml = filas.filter((f) => {
    const existente = yaImportados.get(f.sheetRowId);
    return existente && !existente.xml_storage_path && f.xmlDriveLink;
  });

  const { resueltos: xmlPorCarpeta, errores: erroresCarpeta } = await resolverXmlPorCarpeta([
    ...filasNuevas,
    ...filasParaCompletarXml,
  ]);

  let creados = 0;
  let xmlCompletados = 0;
  const fallidos: { fila: string; motivo: string }[] = [];

  for (const fila of filasParaCompletarXml) {
    const partidoExistente = yaImportados.get(fila.sheetRowId)!;
    try {
      const xmlFileId = extraerFileIdDeUrl(fila.xmlDriveLink!) ?? xmlPorCarpeta.get(fila.sheetRowId) ?? null;
      if (!xmlFileId) throw new Error(erroresCarpeta.get(fila.sheetRowId) ?? "link de Drive a XML inválido");

      const xmlBytes = await descargarArchivoDrive(xmlFileId);
      const xmlTexto = decodificarXml(xmlBytes);
      const parseado = parsearXmlNacsport(xmlTexto);

      const xmlPath = `${teamId}/${Date.now()}-sheet-${fila.sheetRowId.replace(/[^a-zA-Z0-9._-]/g, "_")}.xml`;
      const { error: uploadError } = await admin.storage.from("videoanalisis-xml").upload(xmlPath, xmlTexto, {
        contentType: "text/xml",
      });
      if (uploadError) throw new Error(`no se pudo guardar el XML: ${uploadError.message}`);

      const { error: categoriasError } = await supabase.from("va_categorias").insert(
        parseado.categorias.map((c) => ({
          team_id: teamId,
          partido_id: partidoExistente.id,
          codigo: c.codigo,
          color_hex: c.colorHex,
        })),
      );
      if (categoriasError) throw new Error(`no se pudieron guardar las categorías: ${categoriasError.message}`);

      const { error: accionesError } = await supabase.from("va_acciones").insert(
        parseado.acciones.map((a) => ({
          team_id: teamId,
          partido_id: partidoExistente.id,
          codigo: a.codigo,
          inicio_seg: a.inicio,
          fin_seg: a.fin,
        })),
      );
      if (accionesError) throw new Error(`no se pudieron guardar las acciones: ${accionesError.message}`);

      const { error: updateError } = await supabase
        .from("partidos_va")
        .update({ xml_storage_path: xmlPath, xml_procesado_en: new Date().toISOString() })
        .eq("id", partidoExistente.id);
      if (updateError) throw new Error(`no se pudo actualizar el partido: ${updateError.message}`);

      xmlCompletados++;
    } catch (e) {
      fallidos.push({ fila: `${fila.sheetRowId} (${fila.rival ?? "?"})`, motivo: (e as Error).message });
    }
  }

  for (const fila of filasNuevas) {
    try {
      if (!fila.fecha) throw new Error("fecha vacía o con formato irreconocible");
      if (!fila.rival) throw new Error("falta el rival");

      const youtubeId = fila.youtubeLink ? extraerYoutubeId(fila.youtubeLink) : null;
      if (!youtubeId) throw new Error("link de YouTube inválido o vacío");

      let xmlPath: string | null = null;
      if (fila.xmlDriveLink) {
        const xmlFileId = extraerFileIdDeUrl(fila.xmlDriveLink) ?? xmlPorCarpeta.get(fila.sheetRowId) ?? null;
        if (!xmlFileId) throw new Error(erroresCarpeta.get(fila.sheetRowId) ?? "link de Drive a XML inválido");

        const xmlBytes = await descargarArchivoDrive(xmlFileId);
        const xmlTexto = decodificarXml(xmlBytes);
        const parseado = parsearXmlNacsport(xmlTexto);

        xmlPath = `${teamId}/${Date.now()}-sheet-${fila.sheetRowId.replace(/[^a-zA-Z0-9._-]/g, "_")}.xml`;
        const { error: uploadError } = await admin.storage.from("videoanalisis-xml").upload(xmlPath, xmlTexto, {
          contentType: "text/xml",
        });
        if (uploadError) throw new Error(`no se pudo guardar el XML: ${uploadError.message}`);

        const rivalId = await buscarOCrearRival(supabase, teamId, fila.rival);
        const { data: partido, error: insertError } = await supabase
          .from("partidos_va")
          .insert({
            team_id: teamId,
            fecha: fila.fecha,
            rival: fila.rival,
            rival_id: rivalId,
            competencia: fila.competencia,
            categoria: null,
            condicion: fila.condicion,
            goles_favor: fila.golesFavor,
            goles_contra: fila.golesContra,
            youtube_video_id: youtubeId,
            xml_storage_path: xmlPath,
            xml_procesado_en: new Date().toISOString(),
            sheet_row_id: fila.sheetRowId,
          })
          .select("id")
          .single();
        if (insertError || !partido) throw new Error(insertError?.message ?? "no se pudo crear el partido");

        const { error: categoriasError } = await supabase.from("va_categorias").insert(
          parseado.categorias.map((c) => ({
            team_id: teamId,
            partido_id: partido.id,
            codigo: c.codigo,
            color_hex: c.colorHex,
          })),
        );
        if (categoriasError) throw new Error(`no se pudieron guardar las categorías: ${categoriasError.message}`);

        const { error: accionesError } = await supabase.from("va_acciones").insert(
          parseado.acciones.map((a) => ({
            team_id: teamId,
            partido_id: partido.id,
            codigo: a.codigo,
            inicio_seg: a.inicio,
            fin_seg: a.fin,
          })),
        );
        if (accionesError) throw new Error(`no se pudieron guardar las acciones: ${accionesError.message}`);
      } else {
        const rivalId = await buscarOCrearRival(supabase, teamId, fila.rival);
        const { error: insertError } = await supabase.from("partidos_va").insert({
          team_id: teamId,
          fecha: fila.fecha,
          rival: fila.rival,
          rival_id: rivalId,
          competencia: fila.competencia,
          categoria: null,
          condicion: fila.condicion,
          goles_favor: fila.golesFavor,
          goles_contra: fila.golesContra,
          youtube_video_id: youtubeId,
          xml_storage_path: null,
          xml_procesado_en: null,
          sheet_row_id: fila.sheetRowId,
        });
        if (insertError) throw new Error(insertError.message);
      }

      creados++;
    } catch (e) {
      fallidos.push({ fila: `${fila.sheetRowId} (${fila.rival ?? "?"})`, motivo: (e as Error).message });
    }
  }

  if (creados > 0 || xmlCompletados > 0) revalidatePath("/videoanalisis");
  return { error: null, creados, saltados, xmlCompletados, fallidos };
}

export async function eliminarPartidoVA(id: string) {
  const supabase = await createClient();
  const { data: partido } = await supabase.from("partidos_va").select("xml_storage_path").eq("id", id).maybeSingle();

  await supabase.from("partidos_va").delete().eq("id", id);

  if (partido?.xml_storage_path) {
    const admin = createAdminClient();
    await admin.storage.from("videoanalisis-xml").remove([partido.xml_storage_path]);
  }

  revalidatePath("/videoanalisis");
}

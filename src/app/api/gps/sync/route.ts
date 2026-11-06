import { createHash } from "node:crypto";
import * as XLSX from "xlsx";
import { createAdminClient } from "@/lib/supabase/admin";
import { CLUB_ACTUAL } from "@/lib/gps/club";
import { guardarArchivoGps, parsearCsvGps } from "@/lib/gps/importar-csv";

const BUCKET = "gps-snapshots";

// La plataforma corre en local: el Apps Script del usuario (sección 6, docs/gps-modulo-diseno.md)
// no puede pegarle a un servidor nuestro, así que sube los CSV directo a Supabase Storage
// (un servicio en la nube, siempre alcanzable) usando GPS_WEBHOOK_SECRET como prefijo de
// carpeta. Esta ruta corre en la app local y hace el trabajo inverso: lista lo que haya
// en ese prefijo, y aterriza cada archivo nuevo (snapshot + catálogo de columnas +
// importación) y, si el nombre del archivo trae la fecha de la sesión (YYYY-MM-DD-...), lo convierte
// en gps_sesiones / gps_registros del club actual con el mismo código que usa
// scripts/importar-gps-csv.mjs. Un archivo que no se puede mapear queda "sin_mapear" para revisarlo.
export async function GET() {
  const prefix = process.env.GPS_WEBHOOK_SECRET;
  if (!prefix) return Response.json({ error: "Falta GPS_WEBHOOK_SECRET." }, { status: 500 });

  const admin = createAdminClient();
  const { data: team } = await admin.from("teams").select("id").limit(1).single();
  if (!team) return Response.json({ error: "No hay equipo configurado." }, { status: 500 });

  const { data: archivos, error: listError } = await admin.storage.from(BUCKET).list(prefix, { limit: 1000 });
  if (listError) return Response.json({ error: `No se pudo listar el bucket: ${listError.message}` }, { status: 500 });

  const resultados: { archivo: string; estado: string; filas?: number; error?: string }[] = [];

  for (const archivo of archivos ?? []) {
    const path = `${prefix}/${archivo.name}`;
    const { data: blob, error: downloadError } = await admin.storage.from(BUCKET).download(path);
    if (downloadError || !blob) {
      resultados.push({ archivo: archivo.name, estado: "error", error: downloadError?.message });
      continue;
    }

    const contenido = Buffer.from(await blob.arrayBuffer());
    const hash = createHash("sha256").update(contenido).digest("hex");

    const { data: existente } = await admin
      .from("gps_archivos_snapshot")
      .select("id")
      .eq("team_id", team.id)
      .eq("hash_contenido", hash)
      .maybeSingle();
    if (existente) {
      resultados.push({ archivo: archivo.name, estado: "sin_cambios" });
      continue;
    }

    let filas: Record<string, unknown>[] = [];
    try {
      const workbook = XLSX.read(contenido.toString("utf-8"), { type: "string" });
      const hoja = workbook.Sheets[workbook.SheetNames[0]];
      filas = XLSX.utils.sheet_to_json(hoja, { defval: null });
    } catch (e) {
      resultados.push({ archivo: archivo.name, estado: "error", error: `No se pudo leer el CSV: ${e instanceof Error ? e.message : String(e)}` });
      continue;
    }

    const columnas = filas.length > 0 ? Object.keys(filas[0]) : [];

    const { data: snapshot, error: snapshotError } = await admin
      .from("gps_archivos_snapshot")
      .insert({
        team_id: team.id,
        storage_path: path,
        nombre_original: archivo.name,
        hash_contenido: hash,
        filas: filas.length,
        columnas,
      })
      .select("id")
      .single();
    if (snapshotError || !snapshot) {
      resultados.push({ archivo: archivo.name, estado: "error", error: snapshotError?.message });
      continue;
    }

    const hoy = new Date().toISOString().slice(0, 10);
    for (const clave of columnas) {
      await admin
        .from("gps_metricas_catalogo")
        .upsert({ team_id: team.id, clave, ultima_vez_visto: hoy }, { onConflict: "team_id,clave", ignoreDuplicates: false });
    }

    const parseado = parsearCsvGps(contenido.toString("utf-8"), archivo.name);
    const { data: importacion } = await admin
      .from("gps_importaciones")
      .insert({
        team_id: team.id,
        snapshot_id: snapshot.id,
        origen: "apps_script",
        estado: parseado ? "procesando" : "sin_mapear",
        detalle: { columnas, club: CLUB_ACTUAL, muestra: filas.slice(0, 5) },
        finished_at: parseado ? null : new Date().toISOString(),
      })
      .select("id")
      .single();

    if (parseado && importacion) {
      try {
        const r = await guardarArchivoGps(admin, team.id, importacion.id, parseado, CLUB_ACTUAL);
        await admin
          .from("gps_importaciones")
          .update({ estado: "ok", filas_nuevas: r.registrosNuevos, filas_actualizadas: r.registrosActualizados, finished_at: new Date().toISOString() })
          .eq("id", importacion.id);
      } catch (e) {
        const mensaje = e instanceof Error ? e.message : String(e);
        await admin
          .from("gps_importaciones")
          .update({ estado: "error", detalle: { columnas, club: CLUB_ACTUAL, error: mensaje }, finished_at: new Date().toISOString() })
          .eq("id", importacion.id);
        resultados.push({ archivo: archivo.name, estado: "error", error: mensaje });
        continue;
      }
    }

    resultados.push({ archivo: archivo.name, estado: "importado", filas: filas.length });
  }

  return Response.json({ procesados: resultados.length, resultados });
}

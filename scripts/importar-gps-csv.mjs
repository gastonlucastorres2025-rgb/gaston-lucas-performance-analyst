// Importa una carpeta de CSV del proveedor GPS (un archivo por sesión: YYYY-MM-DD-....csv) a
// gps_sesiones / gps_registros. Usa exactamente el mismo código que /api/gps/sync
// (src/lib/gps/importar-csv.ts), así una carga masiva y la carga automática dan lo mismo.
//
//   node scripts/importar-gps-csv.mjs <carpeta> --club <Club> [--desde YYYY-MM-DD] [--hasta YYYY-MM-DD]
//
// --club es obligatorio a propósito: los datos de cada club quedan separados y se ven con el selector
// del módulo GPS (ej. --club Nacional para el historial anterior, --club Junior para el actual).
//
// Reimportar los mismos archivos no duplica nada.
import { createClient } from "@supabase/supabase-js";
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { datosDelNombre, guardarArchivoGps, parsearCsvGps } from "../src/lib/gps/importar-csv.ts";

const args = process.argv.slice(2);
const carpeta = args.find((a) => !a.startsWith("--"));
const opcion = (nombre) => {
  const i = args.indexOf(nombre);
  return i >= 0 ? args[i + 1] : null;
};
const club = opcion("--club");
const desde = opcion("--desde");
const hasta = opcion("--hasta");
if (!carpeta || !club) {
  console.error("Uso: node scripts/importar-gps-csv.mjs <carpeta con los .csv> --club <Club> [--desde YYYY-MM-DD] [--hasta YYYY-MM-DD]");
  process.exit(1);
}

const env = Object.fromEntries(
  readFileSync(".env.local", "utf8")
    .split("\n")
    .filter((l) => l.includes("=") && !l.trim().startsWith("#"))
    .map((l) => {
      const i = l.indexOf("=");
      const v = l.slice(i + 1).trim();
      return [l.slice(0, i).trim(), v.startsWith('"') ? JSON.parse(v) : v];
    }),
);
const admin = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

const archivos = readdirSync(carpeta)
  .filter((f) => f.toLowerCase().endsWith(".csv"))
  .filter((f) => {
    const d = datosDelNombre(f);
    return d && (!desde || d.fecha >= desde) && (!hasta || d.fecha <= hasta);
  })
  .sort();
console.log(`Club: ${club} · archivos a importar: ${archivos.length}`);
if (archivos.length === 0) process.exit(0);

const { data: team } = await admin.from("teams").select("id").limit(1).single();
const { data: importacion, error: impError } = await admin
  .from("gps_importaciones")
  .insert({ team_id: team.id, origen: "manual", estado: "procesando", detalle: { tipo: "carga por script", club, carpeta: path.basename(carpeta), desde, hasta, archivos: archivos.length } })
  .select("id")
  .single();
if (impError) throw new Error(impError.message);

let sesiones = 0;
let nuevos = 0;
let actualizados = 0;
let sinFilas = 0;
const jugadores = new Set();
const columnas = new Set();
for (const archivo of archivos) {
  const parseado = parsearCsvGps(readFileSync(path.join(carpeta, archivo), "utf-8"), archivo);
  if (!parseado || parseado.registros.length === 0) {
    sinFilas += 1;
    continue;
  }
  parseado.columnas.forEach((c) => columnas.add(c));
  parseado.registros.forEach((r) => jugadores.add(r.nombreCrudo));
  const r = await guardarArchivoGps(admin, team.id, importacion.id, parseado, club);
  if (r.sesionCreada) sesiones += 1;
  nuevos += r.registrosNuevos;
  actualizados += r.registrosActualizados;
}

await admin
  .from("gps_importaciones")
  .update({
    estado: sinFilas ? "ok_con_avisos" : "ok",
    filas_nuevas: nuevos,
    filas_actualizadas: actualizados,
    columnas_nuevas: [],
    finished_at: new Date().toISOString(),
  })
  .eq("id", importacion.id);

console.log(`Sesiones nuevas: ${sesiones} · registros nuevos: ${nuevos} · actualizados: ${actualizados} · archivos sin filas: ${sinFilas} · jugadores distintos: ${jugadores.size}`);

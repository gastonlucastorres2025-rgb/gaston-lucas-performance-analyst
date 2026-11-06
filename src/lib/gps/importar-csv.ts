// Importador de los CSV del proveedor GPS -> gps_sesiones / gps_registros.
//
// Sin imports con alias ("@/...") ni sintaxis solo-TS a propósito: lo usan la ruta /api/gps/sync
// (Next) y scripts/importar-gps-csv.mjs (Node con type-stripping), y los dos tienen que dar
// exactamente el mismo resultado. El jugador se identifica por el nombre tal cual lo manda el
// proveedor (nombre_proveedor_crudo): el módulo GPS no depende de la tabla `players`.

import type { SupabaseClient } from "@supabase/supabase-js";
import * as XLSX from "xlsx";

export type RegistroCsv = {
  nombreCrudo: string;
  duracionMin: number | null;
  distanciaTotalM: number | null;
  velocidadMaximaKmh: number | null;
  distAltaVelocidadM: number | null;
  distMuyAltaVelocidadM: number | null;
  aceleracionesCant: number | null;
  desaceleracionesCant: number | null;
  metricasExtra: Record<string, unknown>;
};

export type ArchivoGps = {
  fecha: string;
  turno: "M" | "V" | null;
  nombreBloque: string;
  registros: RegistroCsv[];
  columnas: string[];
};

const num = (v: unknown): number | null => (typeof v === "number" ? v : v ? Number(v) : null);
const redondear = (v: number, dec: number): number => Math.round(v * 10 ** dec) / 10 ** dec;

/** "2026-03-24-Matutino-Futbol.csv" -> fecha 2026-03-24, turno M, bloque "Matutino-Futbol". Devuelve
 * null si el nombre no empieza con una fecha (no es un archivo de sesión). */
export function datosDelNombre(nombreArchivo: string): { fecha: string; turno: "M" | "V" | null; nombreBloque: string } | null {
  const m = nombreArchivo.match(/^(\d{4}-\d{2}-\d{2})/);
  if (!m) return null;
  const bajo = nombreArchivo.toLowerCase();
  return {
    fecha: m[1],
    turno: bajo.includes("vespertino") ? "V" : bajo.includes("matutino") ? "M" : null,
    nombreBloque: nombreArchivo.replace(/^\d{4}-\d{2}-\d{2}-?/, "").replace(/\.csv$/i, ""),
  };
}

/** Lee un CSV del proveedor y arma un registro por jugador. Cada jugador trae una fila "Sesion" (el
 * total del día que arma el proveedor) más una fila por drill. Si existe "Sesion" se usa esa (puede
 * incluir transiciones que no están en ningún drill); si no existe (los días de partido traen solo
 * "Primer Tiempo" y "Segundo Tiempo") el total es la SUMA de todos los drills, nunca solo el primero. */
export function parsearCsvGps(contenido: string, nombreArchivo: string): ArchivoGps | null {
  const datos = datosDelNombre(nombreArchivo);
  if (!datos) return null;

  const hoja = XLSX.read(contenido, { type: "string" });
  const filas = XLSX.utils.sheet_to_json<Record<string, unknown>>(hoja.Sheets[hoja.SheetNames[0]], { defval: null });
  if (filas.length === 0) return { ...datos, registros: [], columnas: [] };

  const porJugador = new Map<string, Record<string, unknown>[]>();
  for (const fila of filas) {
    const nombre = String(fila["Player Name"] ?? "").trim();
    if (!nombre) continue;
    if (!porJugador.has(nombre)) porJugador.set(nombre, []);
    porJugador.get(nombre)!.push(fila);
  }

  const registros: RegistroCsv[] = [];
  for (const [nombreCrudo, filasJugador] of porJugador) {
    const filaSesion = filasJugador.find((f) => String(f["Drill Title"] ?? "").trim().toLowerCase() === "sesion");
    const valores = (campo: string) => filasJugador.map((f) => num(f[campo])).filter((v): v is number => v !== null);
    const suma = (campo: string) => {
      const v = valores(campo);
      return v.length ? redondear(v.reduce((a, b) => a + b, 0), 2) : null;
    };
    const max = (campo: string) => {
      const v = valores(campo);
      return v.length ? redondear(Math.max(...v), 2) : null;
    };
    const total = (campo: string) => (filaSesion ? num(filaSesion[campo]) : suma(campo));

    registros.push({
      nombreCrudo,
      duracionMin: total("Total Time"),
      distanciaTotalM: total("Total Distance"),
      velocidadMaximaKmh: filaSesion ? num(filaSesion["Max Speed"]) : max("Max Speed"),
      distAltaVelocidadM: total("High Speed Running (Absolute)"),
      distMuyAltaVelocidadM: total("Distance Zone 6 (Absolute)"),
      aceleracionesCant: total("Accelerations (Absolute)"),
      desaceleracionesCant: total("Decelerations (Absolute)"),
      metricasExtra: {
        entradas_zona6: total("Entries Zone 6 (Absolute)"),
        hml_esfuerzos: total("HML Efforts"),
        hml_distancia_m: total("HML Distance"),
        drills: filasJugador.map((f) => ({
          nombre: String(f["Drill Title"] ?? "").trim(),
          tiempo_min: num(f["Total Time"]),
          distancia_m: num(f["Total Distance"]),
          distancia_alta_velocidad_m: num(f["High Speed Running (Absolute)"]),
          distancia_zona6_m: num(f["Distance Zone 6 (Absolute)"]),
          velocidad_maxima_kmh: num(f["Max Speed"]),
          entradas_zona6: num(f["Entries Zone 6 (Absolute)"]),
          aceleraciones: num(f["Accelerations (Absolute)"]),
          desaceleraciones: num(f["Decelerations (Absolute)"]),
          hml_esfuerzos: num(f["HML Efforts"]),
          hml_distancia_m: num(f["HML Distance"]),
        })),
      },
    });
  }

  return { ...datos, registros, columnas: Object.keys(filas[0]) };
}

export type ResultadoGuardado = { sesionCreada: boolean; registrosNuevos: number; registrosActualizados: number };

/** Guarda un archivo ya parseado en el club indicado: crea (o reutiliza) la sesión de ese día/turno/bloque y inserta o
 * actualiza el registro de cada jugador. Reimportar el mismo archivo no duplica nada. */
export async function guardarArchivoGps(admin: SupabaseClient, teamId: string, importacionId: string, archivo: ArchivoGps, club: string): Promise<ResultadoGuardado> {
  let consulta = admin
    .from("gps_sesiones")
    .select("id")
    .eq("team_id", teamId)
    .eq("club", club)
    .eq("fecha", archivo.fecha)
    .eq("modalidad", "colectiva")
    .eq("nombre_bloque", archivo.nombreBloque);
  consulta = archivo.turno ? consulta.eq("turno", archivo.turno) : consulta.is("turno", null);
  const { data: existente } = await consulta.maybeSingle();

  let sesionId = existente?.id;
  let sesionCreada = false;
  if (!sesionId) {
    const { data: creada, error } = await admin
      .from("gps_sesiones")
      .insert({ team_id: teamId, club, fecha: archivo.fecha, tipo: "entrenamiento", modalidad: "colectiva", turno: archivo.turno, nombre_bloque: archivo.nombreBloque })
      .select("id")
      .single();
    if (error || !creada) throw new Error(`Sesión ${archivo.fecha} ${archivo.nombreBloque}: ${error?.message ?? "sin datos"}`);
    sesionId = creada.id;
    sesionCreada = true;
  }

  let registrosNuevos = 0;
  let registrosActualizados = 0;
  for (const r of archivo.registros) {
    const fila = {
      gps_sesion_id: sesionId,
      player_id: null,
      importacion_id: importacionId,
      nombre_proveedor_crudo: r.nombreCrudo,
      duracion_min: r.duracionMin,
      distancia_total_m: r.distanciaTotalM,
      distancia_por_min: r.duracionMin && r.distanciaTotalM ? redondear(r.distanciaTotalM / r.duracionMin, 2) : null,
      velocidad_maxima_kmh: r.velocidadMaximaKmh,
      dist_alta_velocidad_m: r.distAltaVelocidadM,
      dist_muy_alta_velocidad_m: r.distMuyAltaVelocidadM,
      aceleraciones_cant: r.aceleracionesCant,
      desaceleraciones_cant: r.desaceleracionesCant,
      metricas_extra: r.metricasExtra,
      estado_calidad: "ok",
    };
    // No hay índice único usable para (sesión, jugador sin player_id): se busca primero.
    const { data: previo } = await admin.from("gps_registros").select("id").eq("gps_sesion_id", sesionId).eq("nombre_proveedor_crudo", r.nombreCrudo).maybeSingle();
    const { error } = previo ? await admin.from("gps_registros").update(fila).eq("id", previo.id) : await admin.from("gps_registros").insert(fila);
    if (error) throw new Error(`Registro ${r.nombreCrudo} (${archivo.fecha}): ${error.message}`);
    if (previo) registrosActualizados += 1;
    else registrosNuevos += 1;
  }

  return { sesionCreada, registrosNuevos, registrosActualizados };
}

// Carga histórica única de los CSV de GPS reales del período de trabajo del cuerpo técnico en
// Nacional (24/03/2026 al 15/08/2026, partido vs Racing — confirmado por el usuario). No es el
// pipeline en vivo de src/app/api/gps/sync/route.ts (ese asume un archivo por vez, llegando de a
// poco vía Drive); esto es una carga masiva de un ZIP histórico ya completo, así que arma
// directamente gps_sesiones/gps_registros en vez de dejarlos "sin_mapear" para revisión manual —
// el mapeo de jugadores ya se resolvió a mano con el usuario antes de correr esto.
import { createClient } from "@supabase/supabase-js";
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import * as XLSX from "xlsx";

const CARPETA_CSV = process.argv[2];
if (!CARPETA_CSV) {
  console.error("Uso: node scripts/import-gps-historico.mjs <carpeta con los .csv>");
  process.exit(1);
}

const INICIO = "2026-03-24";
const FIN = "2026-08-15";

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
const admin = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

function normalizar(s) {
  return s
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .toUpperCase();
}

// Confirmado a mano con el usuario (no se adivina ningún mapeo).
const ALIAS_A_JUGADOR_REAL = {
  "VERON LUPI": "TOMAS VERON LUPI",
  "MAXIMILIANO GOMEZ": "MAXI GOMEZ",
};
const JUGADORES_NUEVOS = [
  { nombreGps: "LUCIANO GONZALEZ", nombre: "Luciano", apellido: "González" },
  { nombreGps: "LUCIANO MONTAOS", nombre: "Luciano", apellido: "Montaos" },
  { nombreGps: "RODRIGUEZ LUCIANO", nombre: "Luciano", apellido: "Rodríguez" },
];
// El usuario pidió explícitamente no cargar estos — no son de su período o no le interesan.
const EXCLUIDOS = new Set(["ROMAN CLEMATTE", "JHON GUZMAN", "SANTIAGO RICA", "RUBEN BOTTA"]);

async function main() {
  const { data: team } = await admin.from("teams").select("id").limit(1).single();
  const teamId = team.id;

  const { data: jugadoresReales } = await admin.from("players").select("id, nombre, apellido").eq("team_id", teamId);
  const porNombreNormalizado = new Map(jugadoresReales.map((j) => [normalizar(`${j.nombre} ${j.apellido}`), j]));

  // Crea los 3 jugadores nuevos (juveniles) si todavía no existen, por nombre+apellido exacto.
  for (const nuevo of JUGADORES_NUEVOS) {
    const clave = normalizar(`${nuevo.nombre} ${nuevo.apellido}`);
    if (porNombreNormalizado.has(clave)) continue;
    const { data: creado, error } = await admin
      .from("players")
      .insert({ team_id: teamId, nombre: nuevo.nombre, apellido: nuevo.apellido })
      .select("id, nombre, apellido")
      .single();
    if (error) throw new Error(`No se pudo crear el jugador ${nuevo.nombre} ${nuevo.apellido}: ${error.message}`);
    porNombreNormalizado.set(clave, creado);
    console.log(`Jugador nuevo creado: ${nuevo.nombre} ${nuevo.apellido} (${creado.id})`);
  }

  // Resuelve cada nombre-del-GPS -> player real, o null si está excluido.
  function resolverJugador(nombreGpsCrudo) {
    const n = normalizar(nombreGpsCrudo);
    if (EXCLUIDOS.has(n)) return null;
    if (ALIAS_A_JUGADOR_REAL[n]) {
      const real = porNombreNormalizado.get(ALIAS_A_JUGADOR_REAL[n]);
      if (!real) throw new Error(`Alias configurado para "${nombreGpsCrudo}" pero no se encontró el jugador real.`);
      return real;
    }
    const nuevo = JUGADORES_NUEVOS.find((j) => normalizar(j.nombreGps) === n);
    if (nuevo) return porNombreNormalizado.get(normalizar(`${nuevo.nombre} ${nuevo.apellido}`));
    const directo = porNombreNormalizado.get(n);
    if (directo) return directo;
    throw new Error(`Nombre del GPS sin resolver y no está en la lista de excluidos: "${nombreGpsCrudo}"`);
  }

  // gps_alias: deja constancia del mapeo usado (para que quede trazable, no repetido a mano después).
  const aliasCreados = new Set();
  async function asegurarAlias(nombreGpsCrudo, playerId) {
    if (aliasCreados.has(nombreGpsCrudo)) return;
    aliasCreados.add(nombreGpsCrudo);
    await admin
      .from("gps_alias")
      .upsert(
        { team_id: teamId, nombre_proveedor: nombreGpsCrudo, player_id: playerId, confirmado: true },
        { onConflict: "team_id,nombre_proveedor" },
      );
  }

  const archivos = readdirSync(CARPETA_CSV)
    .filter((f) => f.endsWith(".csv"))
    .filter((f) => {
      const m = f.match(/^(\d{4}-\d{2}-\d{2})/);
      return m && m[1] >= INICIO && m[1] <= FIN;
    })
    .sort();

  console.log(`Archivos a importar: ${archivos.length}`);

  const columnasVistas = new Set();
  let sesionesCreadas = 0;
  let registrosCreados = 0;
  let filasExcluidas = 0;

  const { data: importacion, error: impError } = await admin
    .from("gps_importaciones")
    .insert({
      team_id: teamId,
      origen: "manual",
      estado: "procesando",
      detalle: { tipo: "carga historica", periodo: `${INICIO} a ${FIN}`, archivos: archivos.length },
    })
    .select("id")
    .single();
  if (impError) throw new Error(impError.message);
  const importacionId = importacion.id;

  for (const archivo of archivos) {
    const fecha = archivo.match(/^(\d{4}-\d{2}-\d{2})/)[1];
    const nombreBloque = archivo.replace(/^\d{4}-\d{2}-\d{2}-/, "").replace(/\.csv$/i, "");
    const bajo = archivo.toLowerCase();
    const turno = bajo.includes("vespertino") ? "V" : bajo.includes("matutino") ? "M" : null;

    const contenido = readFileSync(path.join(CARPETA_CSV, archivo), "utf-8");
    const wb = XLSX.read(contenido, { type: "string" });
    const hoja = wb.Sheets[wb.SheetNames[0]];
    const filas = XLSX.utils.sheet_to_json(hoja, { defval: null });
    if (filas.length === 0) continue;

    for (const clave of Object.keys(filas[0])) columnasVistas.add(clave);

    // Crea (o reutiliza) la sesión de este archivo.
    let sesionQuery = admin
      .from("gps_sesiones")
      .select("id")
      .eq("team_id", teamId)
      .eq("fecha", fecha)
      .eq("modalidad", "colectiva")
      .eq("nombre_bloque", nombreBloque);
    sesionQuery = turno ? sesionQuery.eq("turno", turno) : sesionQuery.is("turno", null);
    const { data: sesionExistente } = await sesionQuery.maybeSingle();

    let gpsSesionId = sesionExistente?.id;
    if (!gpsSesionId) {
      const { data: sesionCreada, error: sesionError } = await admin
        .from("gps_sesiones")
        .insert({ team_id: teamId, fecha, tipo: "entrenamiento", modalidad: "colectiva", turno, nombre_bloque: nombreBloque })
        .select("id")
        .single();
      if (sesionError) throw new Error(`Sesión ${archivo}: ${sesionError.message}`);
      gpsSesionId = sesionCreada.id;
      sesionesCreadas += 1;
    }

    // Agrupa las filas por jugador (una fila "Sesion" = total, más una fila por cada drill).
    const porJugador = new Map();
    for (const fila of filas) {
      const nombreCrudo = String(fila["Player Name"] ?? "").trim();
      if (!nombreCrudo) continue;
      if (!porJugador.has(nombreCrudo)) porJugador.set(nombreCrudo, []);
      porJugador.get(nombreCrudo).push(fila);
    }

    for (const [nombreCrudo, filasJugador] of porJugador) {
      let jugador;
      try {
        jugador = resolverJugador(nombreCrudo);
      } catch (e) {
        throw new Error(`${archivo}: ${e.message}`);
      }
      if (!jugador) {
        filasExcluidas += filasJugador.length;
        continue;
      }
      await asegurarAlias(nombreCrudo, jugador.id);

      const filaSesion = filasJugador.find((f) => String(f["Drill Title"] ?? "").trim().toLowerCase() === "sesion") ?? filasJugador[0];
      const num = (v) => (typeof v === "number" ? v : v ? Number(v) : null);

      const duracionMin = num(filaSesion["Total Time"]);
      const distanciaTotal = num(filaSesion["Total Distance"]);

      const registro = {
        gps_sesion_id: gpsSesionId,
        player_id: jugador.id,
        importacion_id: importacionId,
        nombre_proveedor_crudo: nombreCrudo,
        duracion_min: duracionMin,
        distancia_total_m: distanciaTotal,
        distancia_por_min: duracionMin && distanciaTotal ? Math.round((distanciaTotal / duracionMin) * 100) / 100 : null,
        velocidad_maxima_kmh: num(filaSesion["Max Speed"]),
        dist_alta_velocidad_m: num(filaSesion["High Speed Running (Absolute)"]),
        dist_muy_alta_velocidad_m: num(filaSesion["Distance Zone 6 (Absolute)"]),
        aceleraciones_cant: num(filaSesion["Accelerations (Absolute)"]),
        desaceleraciones_cant: num(filaSesion["Decelerations (Absolute)"]),
        metricas_extra: {
          entradas_zona6: num(filaSesion["Entries Zone 6 (Absolute)"]),
          hml_esfuerzos: num(filaSesion["HML Efforts"]),
          hml_distancia_m: num(filaSesion["HML Distance"]),
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
        estado_calidad: "ok",
      };

      // No hay un índice único "de verdad" en (gps_sesion_id, player_id) — es parcial (solo cuando
      // player_id no es null), y ON CONFLICT no infiere índices parciales sin repetir el WHERE acá.
      // Más simple y explícito: buscar primero, insertar o actualizar según corresponda.
      const { data: existente } = await admin
        .from("gps_registros")
        .select("id")
        .eq("gps_sesion_id", gpsSesionId)
        .eq("player_id", jugador.id)
        .maybeSingle();
      const { error: regError } = existente
        ? await admin.from("gps_registros").update(registro).eq("id", existente.id)
        : await admin.from("gps_registros").insert(registro);
      if (regError) throw new Error(`${archivo} / ${nombreCrudo}: ${regError.message}`);
      registrosCreados += 1;
    }
  }

  const hoy = new Date().toISOString().slice(0, 10);
  for (const clave of columnasVistas) {
    await admin.from("gps_metricas_catalogo").upsert(
      { team_id: teamId, clave, ultima_vez_visto: hoy },
      { onConflict: "team_id,clave", ignoreDuplicates: false },
    );
  }

  await admin
    .from("gps_importaciones")
    .update({
      estado: "ok",
      filas_nuevas: registrosCreados,
      columnas_nuevas: [...columnasVistas],
      detalle: {
        tipo: "carga historica",
        periodo: `${INICIO} a ${FIN}`,
        archivos: archivos.length,
        sesiones_creadas: sesionesCreadas,
        registros_creados: registrosCreados,
        filas_excluidas: filasExcluidas,
        jugadores_excluidos: [...EXCLUIDOS],
      },
      finished_at: new Date().toISOString(),
    })
    .eq("id", importacionId);

  console.log("\n=== Resumen ===");
  console.log(`Archivos procesados: ${archivos.length}`);
  console.log(`Sesiones creadas: ${sesionesCreadas}`);
  console.log(`Registros de jugador creados: ${registrosCreados}`);
  console.log(`Filas excluidas (jugadores fuera del período/no de interés): ${filasExcluidas}`);
  console.log(`Columnas detectadas: ${[...columnasVistas].join(", ")}`);
}

main().catch((e) => {
  console.error("ERROR:", e.message);
  process.exit(1);
});

import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";
import XLSX from "xlsx";

const XLSX_PATH = process.argv[2] || "/Users/carloslucas/Desktop/Team Stats Nacional-2.xlsx";
const SEASON_START_DATE = "2026-03-25";

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

const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

// 16 clubes uruguayos -> id de escudo en ESPN (mismo mapeo que usa la app)
const ESCUDOS_ESPN = {
  "deportivo maldonado": "10000",
  racing: "9903",
  "peñarol": "2683",
  albion: "21403",
  nacional: "2684",
  "central español": "131688",
  torque: "19002",
  wanderers: "5501",
  liverpool: "5492",
  "cerro largo": "9902",
  "defensor sporting": "1007",
  "boston river": "9999",
  danubio: "4817",
  juventud: "8416",
  progreso: "6866",
  cerro: "5490",
};
function escudoRival(nombre) {
  const id = ESCUDOS_ESPN[nombre.toLowerCase().trim()];
  return id ? `https://a.espncdn.com/i/teamlogos/soccer/500/${id}.png` : null;
}

function parsePartido(texto) {
  // "Danubio - Nacional 0:0" | "Nacional - Juventud 2:1" | "Peñarol - Nacional (P) 0:0"
  const sinMarcador = texto.replace(/\s*\(P\)\s*/gi, " ").trim();
  const match = sinMarcador.match(/^(.+?)\s*-\s*(.+?)\s+\d+:\d+$/);
  if (!match) return null;
  const [, local, visitante] = match;
  const esNacionalLocal = local.trim().toLowerCase() === "nacional";
  const rival = esNacionalLocal ? visitante.trim() : local.trim();
  return { rival, condicion: esNacionalLocal ? "local" : "visitante" };
}

function num(v) {
  return typeof v === "number" ? v : null;
}

/**
 * Mapa columna-por-nombre en vez de índices fijos: el export de Wyscout cambió de formato
 * (agregó una columna "Equipo" y sacó/renombró otras) sin previo aviso, y los índices fijos
 * que tenía este script antes quedaron corridos — eso hizo que se cargara mal el partido
 * vs. Progreso (formación = "Nacional", goles = null). Buscando cada columna por su nombre
 * de encabezado real, el script no se rompe si vuelven a cambiar el orden de las columnas.
 */
function mapaColumnas(header) {
  const mapa = {};
  header.forEach((h, i) => {
    if (h && !(h in mapa)) mapa[h] = i;
  });
  return mapa;
}

function statsDesdeFila(row, M) {
  const g = (nombreCol, keySub) => {
    const i = M[nombreCol];
    if (i === undefined) return { total: null, [keySub]: null, pct: null };
    return { total: num(row[i]), [keySub]: num(row[i + 1]), pct: num(row[i + 2]) };
  };
  const v = (nombreCol) => (M[nombreCol] !== undefined ? num(row[M[nombreCol]]) : null);
  const cuarteto = (nombreCol) => {
    const i = M[nombreCol];
    if (i === undefined) return { total: null, bajos: null, medios: null, altos: null };
    return { total: num(row[i]), bajos: num(row[i + 1]), medios: num(row[i + 2]), altos: num(row[i + 3]) };
  };

  return {
    formacion: M["Seleccionar esquema"] !== undefined ? row[M["Seleccionar esquema"]] : null,
    goles: v("Goles"),
    xg: v("xG"),
    tiros: g("Tiros / a la portería ", "a_puerta"),
    pases: g("Pases / logrados", "logrados"),
    posesion: v("Posesión del balón, %"),
    balones_perdidos: cuarteto("Balones perdidos / bajos / medios / altos"),
    balones_recuperados: cuarteto("Balones recuperados /bajos / medios / altos"),
    duelos: g("Duelos / ganados", "ganados"),
    tiros_fuera_area: g("Tiros de fuera del área / a la portería", "a_puerta"),
    corners: g("Córneres / con remate", "con_remate"),
    // "Tiros libres" del export = lo más cercano a "balón parado con remate" que tenemos ahora.
    balon_parado: g("Tiros libres / con remate", "con_remate"),
    centros: g("Centros / precisos", "precisos"),
    duelos_ofensivos: g("Duelos ofensivos / ganados", "ganados"),
    goles_recibidos: v("Goles recibidos"),
    tiros_en_contra: g("Tiros en contra / a la portería", "a_puerta"),
    duelos_defensivos: g("Duelos defensivos / ganados", "ganados"),
    faltas: v("Faltas"),
    amarillas: v("Tarjetas amarillas"),
    pases_adelante: g("Pases hacia adelante / logrados", "logrados"),
    pases_ultimo_tercio: g("Pases en el último tercio / logrados", "logrados"),
    pases_progresivos: g("Pases progresivos / precisos", "precisos"),
    saques_meta: v("Saques de meta"),
    intensidad_paso: v("Intensidad de paso"),
    pases_por_posesion: v("Promedio pases por posesión del balón"),
    ppda: v("PPDA"),
  };
}

function complementoDuelo(g) {
  if (g.total === null || g.ganados === null) return { total: g.total, ganados: null, pct: null };
  const ganados = g.total - g.ganados;
  return { total: g.total, ganados, pct: g.total > 0 ? Math.round((ganados / g.total) * 10000) / 100 : null };
}

/** Fallback si no hay fila espejo del rival para este partido (no debería pasar con el export actual). */
function statsRivalDerivados(n) {
  return {
    goles: n.goles_recibidos,
    goles_recibidos: n.goles,
    posesion: n.posesion !== null ? Math.round((100 - n.posesion) * 100) / 100 : null,
    tiros: n.tiros_en_contra,
    tiros_en_contra: n.tiros,
    duelos: complementoDuelo(n.duelos),
    duelos_ofensivos: complementoDuelo(n.duelos_defensivos),
    duelos_defensivos: complementoDuelo(n.duelos_ofensivos),
  };
}

async function main() {
  const wb = XLSX.readFile(XLSX_PATH);
  const ws = wb.Sheets["TeamStats"];
  const filas = XLSX.utils.sheet_to_json(ws, { header: 1, raw: true });

  const header = filas[0];
  if (!header) throw new Error("La planilla no tiene fila de encabezados.");
  const M = mapaColumnas(header);
  const idxEquipo = M["Equipo"]; // puede no existir en exports viejos sin esta columna

  const { data: team } = await supabase.from("teams").select("id").limit(1).single();
  const { data: existentes } = await supabase.from("match_stats").select("fecha, rival");
  const clave = (fecha, rival) => `${fecha}__${rival.toLowerCase()}`;
  const yaCargados = new Set((existentes ?? []).map((e) => clave(e.fecha, e.rival)));

  const { data: partidos } = await supabase.from("matches").select("id, fecha, rival");

  // El export trae, por cada partido, una fila con las stats de "Nacional" y otra fila espejo
  // con las stats del rival (mismo Fecha+Partido, columna "Equipo" distinta) — antes el script
  // no distinguía las dos filas y cargaba el mismo partido dos veces. Ahora solo se recorren las
  // filas de Nacional, y se busca su fila espejo para sacar las stats reales del rival (en vez
  // de derivarlas/estimarlas a partir de las nuestras).
  const filasDeDatos = filas.slice(1).filter((row) => row && row[0] && String(row[0]).trim() >= SEASON_START_DATE);
  const filasNacional = idxEquipo !== undefined ? filasDeDatos.filter((row) => String(row[idxEquipo] ?? "").trim() === "Nacional") : filasDeDatos;

  const nuevos = [];
  const vistosEnEstaCorrida = new Set();

  for (const row of filasNacional) {
    const fecha = String(row[0]).trim();
    const partido = parsePartido(String(row[1] ?? ""));
    if (!partido) {
      console.warn("No se pudo interpretar el partido:", row[1]);
      continue;
    }
    const key = clave(fecha, partido.rival);
    if (yaCargados.has(key) || vistosEnEstaCorrida.has(key)) continue;
    vistosEnEstaCorrida.add(key);

    const statsNacional = statsDesdeFila(row, M);

    let statsRival;
    if (idxEquipo !== undefined) {
      const filaRival = filasDeDatos.find(
        (r) => r[0] === row[0] && r[1] === row[1] && String(r[idxEquipo] ?? "").trim() !== "Nacional",
      );
      statsRival = filaRival ? statsDesdeFila(filaRival, M) : statsRivalDerivados(statsNacional);
    } else {
      statsRival = statsRivalDerivados(statsNacional);
    }

    const matchLink = (partidos ?? []).find(
      (m) => m.fecha === fecha && m.rival?.toLowerCase().includes(partido.rival.toLowerCase()),
    );

    nuevos.push({
      team_id: team.id,
      match_id: matchLink?.id ?? null,
      fecha,
      rival: partido.rival,
      competencia: row[2] ?? null,
      condicion: partido.condicion,
      duracion: num(row[3]),
      escudo_rival_url: escudoRival(partido.rival),
      goles_favor: statsNacional.goles,
      goles_contra: statsNacional.goles_recibidos,
      xg_favor: statsNacional.xg,
      xg_contra: statsRival.xg ?? null,
      posesion: statsNacional.posesion,
      stats_nacional: statsNacional,
      stats_rival: statsRival,
    });
  }

  if (nuevos.length === 0) {
    console.log("No hay partidos nuevos para cargar. Todo al día.");
    return;
  }

  const { data, error } = await supabase.from("match_stats").insert(nuevos).select("fecha, rival, condicion");
  if (error) throw error;
  console.log(`Cargados ${data.length} partido(s) nuevo(s):`);
  data.forEach((d) => console.log(`  ${d.fecha} vs ${d.rival} (${d.condicion})`));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

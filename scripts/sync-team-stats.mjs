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
function grupo3(row, i) {
  return { total: num(row[i]), a_puerta_o_precisos_o_logrados: num(row[i + 1]), pct: num(row[i + 2]) };
}

function statsNacionalDesdeFila(row) {
  const g = (i, keyTotal, keySub) => ({ total: num(row[i]), [keySub]: num(row[i + 1]), pct: num(row[i + 2]) });
  return {
    formacion: row[4],
    goles: num(row[5]),
    xg: num(row[6]),
    tiros: g(7, "total", "a_puerta"),
    pases: g(10, "total", "logrados"),
    posesion: num(row[13]),
    balones_perdidos: { total: num(row[14]), bajos: num(row[15]), medios: num(row[16]), altos: num(row[17]) },
    balones_recuperados: { total: num(row[18]), bajos: num(row[19]), medios: num(row[20]), altos: num(row[21]) },
    duelos: g(22, "total", "ganados"),
    tiros_fuera_area: g(25, "total", "a_puerta"),
    corners: g(28, "total", "con_remate"),
    // "Tiros libres" del export = lo más cercano a "balón parado con remate" que tenemos ahora.
    balon_parado: g(31, "total", "con_remate"),
    centros: g(34, "total", "precisos"),
    duelos_ofensivos: g(37, "total", "ganados"),
    goles_recibidos: num(row[40]),
    tiros_en_contra: g(41, "total", "a_puerta"),
    duelos_defensivos: g(44, "total", "ganados"),
    faltas: num(row[47]),
    amarillas: num(row[48]),
    pases_adelante: g(49, "total", "logrados"),
    pases_ultimo_tercio: g(52, "total", "logrados"),
    pases_progresivos: g(55, "total", "precisos"),
    saques_meta: num(row[58]),
    intensidad_paso: num(row[59]),
    pases_por_posesion: num(row[60]),
    ppda: num(row[61]),
  };
}

function complementoDuelo(g) {
  if (g.total === null || g.ganados === null) return { total: g.total, ganados: null, pct: null };
  const ganados = g.total - g.ganados;
  return { total: g.total, ganados, pct: g.total > 0 ? Math.round((ganados / g.total) * 10000) / 100 : null };
}

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

  const { data: team } = await supabase.from("teams").select("id").limit(1).single();
  const { data: existentes } = await supabase.from("match_stats").select("fecha, rival");
  const clave = (fecha, rival) => `${fecha}__${rival.toLowerCase()}`;
  const yaCargados = new Set((existentes ?? []).map((e) => clave(e.fecha, e.rival)));

  const { data: partidos } = await supabase.from("matches").select("id, fecha, rival");

  const nuevos = [];
  for (const row of filas.slice(2)) {
    // filas[0] = encabezados, filas[1] = "Nacional" (rótulo), datos desde filas[2]
    if (!row || !row[0]) continue;
    const fecha = String(row[0]).trim();
    if (fecha < SEASON_START_DATE) continue;

    const partido = parsePartido(String(row[1] ?? ""));
    if (!partido) {
      console.warn("No se pudo interpretar el partido:", row[1]);
      continue;
    }
    if (yaCargados.has(clave(fecha, partido.rival))) continue;

    const statsNacional = statsNacionalDesdeFila(row);
    const statsRival = statsRivalDerivados(statsNacional);
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
      xg_contra: null,
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

// Calcula el promedio y desvío estándar de liga para cada métrica del catálogo,
// usando el mismo criterio de muestra que los informes (últimos 6 partidos
// disponibles por equipo). Corre manualmente / periódicamente — no en cada
// generación de informe, porque implica ~16 equipos x 6 partidos de llamadas
// reales a StatsBomb (puede tardar varios minutos).
import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";

const SAMPLE_SIZE = 6;

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

const auth = "Basic " + Buffer.from(`${env.STATSBOMB_API_USERNAME}:${env.STATSBOMB_API_PASSWORD}`).toString("base64");
const base = env.STATSBOMB_API_BASE_URL;

async function get(path) {
  const res = await fetch(`${base}${path}`, { headers: { Authorization: auth, Accept: "application/json" } });
  if (!res.ok) throw new Error(`StatsBomb respondió ${res.status} para ${path}`);
  return res.json();
}

function promedio(valores) {
  const validos = valores.filter((v) => typeof v === "number");
  if (validos.length === 0) return null;
  return validos.reduce((a, b) => a + b, 0) / validos.length;
}

function desvioEstandar(valores, media) {
  if (valores.length < 2) return 0;
  const variance = valores.reduce((acc, v) => acc + (v - media) ** 2, 0) / (valores.length - 1);
  return Math.sqrt(variance);
}

async function main() {
  const metricDefs = JSON.parse(readFileSync("statsbomb/config/metric_definitions.json", "utf-8")).metrics;
  // Por defecto usa la competencia de Nacional (.env.local); acepta competitionId/seasonId
  // por argumento para calcular el baseline de la competencia de un rival internacional
  // (ej. `node scripts/compute-statsbomb-league-baseline.mjs 81 316` para Liga Profesional Argentina).
  const competitionId = Number(process.argv[2] ?? env.STATSBOMB_COMPETITION_ID);
  const seasonId = Number(process.argv[3] ?? env.STATSBOMB_SEASON_ID);

  console.log(`Calculando baseline de liga: competencia ${competitionId}, temporada ${seasonId}...`);
  const matches = await get(`/api/v6/competitions/${competitionId}/seasons/${seasonId}/matches`);

  const nombresPorId = new Map();
  for (const m of matches) {
    nombresPorId.set(m.home_team.home_team_id, m.home_team.home_team_name);
    nombresPorId.set(m.away_team.away_team_id, m.away_team.away_team_name);
  }
  const teamIds = [...nombresPorId.keys()];

  const escala = (unit) => (unit === "%" ? 100 : 1);
  const porMetrica = Object.fromEntries(metricDefs.map((d) => [d.id, []]));
  const valoresPorEquipo = []; // { metric_id, statsbomb_team_id, statsbomb_team_name, valor }

  let i = 0;
  for (const teamId of teamIds) {
    i++;
    const disponibles = matches
      .filter((m) => m.match_status === "available" && (m.home_team.home_team_id === teamId || m.away_team.away_team_id === teamId))
      .sort((a, b) => b.match_date.localeCompare(a.match_date))
      .slice(0, SAMPLE_SIZE);

    const filas = [];
    for (const m of disponibles) {
      const stats = await get(`/api/v3/matches/${m.match_id}/team-stats`);
      const fila = stats.find((s) => s.team_id === teamId);
      if (fila) filas.push(fila);
    }
    if (filas.length === 0) continue;

    for (const def of metricDefs) {
      const valor = promedio(filas.map((f) => f[def.source]));
      if (valor !== null) {
        const valorEscalado = valor * escala(def.unit);
        porMetrica[def.id].push(valorEscalado);
        valoresPorEquipo.push({
          metric_id: def.id,
          statsbomb_team_id: teamId,
          statsbomb_team_name: nombresPorId.get(teamId),
          valor: valorEscalado,
        });
      }
    }
    console.log(`  [${i}/${teamIds.length}] ${nombresPorId.get(teamId)}: ${filas.length} partido(s) de muestra`);
  }

  const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { data: team } = await supabase.from("teams").select("id").limit(1).single();

  const filas = metricDefs
    .map((def) => {
      const valores = porMetrica[def.id];
      if (valores.length === 0) return null;
      const media = promedio(valores);
      return {
        team_id: team.id,
        competition_id: competitionId,
        season_id: seasonId,
        metric_id: def.id,
        promedio: media,
        desvio_estandar: desvioEstandar(valores, media),
        minimo: Math.min(...valores),
        maximo: Math.max(...valores),
        equipos_muestreados: valores.length,
      };
    })
    .filter(Boolean);

  await supabase
    .from("statsbomb_league_baseline")
    .delete()
    .eq("team_id", team.id)
    .eq("competition_id", competitionId)
    .eq("season_id", seasonId);
  const { error } = await supabase.from("statsbomb_league_baseline").insert(filas);
  if (error) throw error;

  await supabase
    .from("statsbomb_league_team_values")
    .delete()
    .eq("team_id", team.id)
    .eq("competition_id", competitionId)
    .eq("season_id", seasonId);
  const filasEquipo = valoresPorEquipo.map((v) => ({
    team_id: team.id,
    competition_id: competitionId,
    season_id: seasonId,
    ...v,
  }));
  const { error: errorEquipo } = await supabase.from("statsbomb_league_team_values").insert(filasEquipo);
  if (errorEquipo) throw errorEquipo;

  console.log(`Baseline guardado: ${filas.length} métricas, ${teamIds.length} equipos muestreados.`);
  console.log(`Valores por equipo guardados: ${filasEquipo.length} filas (para scatter plots).`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

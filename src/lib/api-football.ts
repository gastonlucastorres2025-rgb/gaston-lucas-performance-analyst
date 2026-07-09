const BASE_URL = "https://v3.football.api-sports.io";
const REVALIDATE_SECONDS = 1800; // 30 min: suficiente para no golpear el límite diario del plan

export const SEASON_ACTUAL = 2026;
export const LEAGUE_APERTURA = 268;
export const LEAGUE_CLAUSURA = 270;
export const LEAGUE_SUDAMERICANA = 11;
export const TEAM_NACIONAL = 2356;
export const TEAM_TIGRE = 452;

async function afFetch<T>(path: string, params: Record<string, string | number>): Promise<T> {
  const search = new URLSearchParams(Object.entries(params).map(([k, v]) => [k, String(v)]));
  const res = await fetch(`${BASE_URL}/${path}?${search.toString()}`, {
    headers: { "x-apisports-key": process.env.API_FOOTBALL_KEY! },
    next: { revalidate: REVALIDATE_SECONDS },
  });
  if (!res.ok) throw new Error(`API-Football ${path}: ${res.status}`);
  const json = await res.json();
  if (json.errors && Object.keys(json.errors).length > 0) {
    throw new Error(`API-Football ${path}: ${JSON.stringify(json.errors)}`);
  }
  return json.response as T;
}

export type StandingRow = {
  rank: number;
  teamId: number;
  nombre: string;
  escudo: string;
  jugados: number;
  puntos: number;
  diferencia: number;
  form: string | null;
};

function mapStandingRow(row: {
  rank: number;
  team: { id: number; name: string; logo: string };
  points: number;
  goalsDiff: number;
  form: string | null;
  all: { played: number };
}): StandingRow {
  return {
    rank: row.rank,
    teamId: row.team.id,
    nombre: row.team.name,
    escudo: row.team.logo,
    jugados: row.all.played,
    puntos: row.points,
    diferencia: row.goalsDiff,
    form: row.form,
  };
}

type StandingsApiResponse = {
  league: {
    standings: {
      rank: number;
      team: { id: number; name: string; logo: string };
      points: number;
      goalsDiff: number;
      form: string | null;
      all: { played: number };
      group?: string;
    }[][];
  };
}[];

export async function fetchStandings(leagueId: number, season = SEASON_ACTUAL): Promise<StandingRow[]> {
  const data = await afFetch<StandingsApiResponse>("standings", { league: leagueId, season });
  if (!data.length) return [];
  return data[0].league.standings[0].map(mapStandingRow);
}

export type GroupStanding = { grupo: string; equipos: StandingRow[] };

export async function fetchGroupStandings(leagueId: number, season = SEASON_ACTUAL): Promise<GroupStanding[]> {
  const data = await afFetch<StandingsApiResponse>("standings", { league: leagueId, season });
  if (!data.length) return [];
  return data[0].league.standings.map((grupo) => ({
    grupo: grupo[0]?.group ?? "",
    equipos: grupo.map(mapStandingRow),
  }));
}

export type JugadorStat = {
  nombre: string;
  foto: string;
  goles: number;
  asistencias: number;
};

type PlayersApiResponse = {
  player: { name: string; photo: string };
  statistics: { goals: { total: number | null; assists: number | null } }[];
}[];

export async function fetchTopJugadores(
  teamId: number,
  season = SEASON_ACTUAL,
): Promise<{ goleadores: JugadorStat[]; asistidores: JugadorStat[] }> {
  const primera = await afFetch<PlayersApiResponse & { paging?: never }>("players", {
    team: teamId,
    season,
    page: 1,
  });

  // La API pagina de a 20 jugadores; buscamos si hay una segunda página.
  const res2 = await fetch(
    `${BASE_URL}/players?team=${teamId}&season=${season}&page=2`,
    { headers: { "x-apisports-key": process.env.API_FOOTBALL_KEY! }, next: { revalidate: REVALIDATE_SECONDS } },
  );
  const json2 = res2.ok ? await res2.json() : { response: [] };
  const todos = [...primera, ...(json2.response as PlayersApiResponse)];

  const jugadores: JugadorStat[] = todos.map((p) => ({
    nombre: p.player.name,
    foto: p.player.photo,
    goles: p.statistics.reduce((sum, s) => sum + (s.goals.total ?? 0), 0),
    asistencias: p.statistics.reduce((sum, s) => sum + (s.goals.assists ?? 0), 0),
  }));

  const goleadores = [...jugadores].sort((a, b) => b.goles - a.goles).slice(0, 5);
  const asistidores = [...jugadores].sort((a, b) => b.asistencias - a.asistencias).slice(0, 5);

  return { goleadores, asistidores };
}

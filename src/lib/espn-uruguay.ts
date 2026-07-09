const ESPN_URL = "https://site.api.espn.com/apis/v2/sports/soccer/uru.1/standings";
const REVALIDATE_SECONDS = 1800;

export type EspnStandingRow = {
  teamId: string;
  nombre: string;
  escudo: string;
  jugados: number;
  puntos: number;
  diferencia: number;
};

export type EspnGrupo = { nombre: string; equipos: EspnStandingRow[] };

type EspnStandingsResponse = {
  children: {
    name: string;
    standings: {
      entries: {
        team: { id: string; displayName: string; logos?: { href: string }[] };
        stats: { name: string; value: number }[];
      }[];
    };
  }[];
};

function stat(stats: { name: string; value: number }[], name: string): number {
  return stats.find((s) => s.name === name)?.value ?? 0;
}

export async function fetchIntermedioGrupos(): Promise<EspnGrupo[]> {
  const res = await fetch(ESPN_URL, { next: { revalidate: REVALIDATE_SECONDS } });
  if (!res.ok) return [];
  const data = (await res.json()) as EspnStandingsResponse;

  return data.children
    .filter((c) => c.name.toLowerCase().includes("intermedio"))
    .map((child) => ({
      nombre: child.name.includes("Group A") ? "Serie A" : child.name.includes("Group B") ? "Serie B" : child.name,
      equipos: child.standings.entries
        .map((e) => ({
          teamId: e.team.id,
          nombre: e.team.displayName,
          escudo: e.team.logos?.[0]?.href ?? "",
          jugados: stat(e.stats, "gamesPlayed"),
          puntos: stat(e.stats, "points"),
          diferencia: stat(e.stats, "pointDifferential"),
        }))
        .sort((a, b) => b.puntos - a.puntos),
    }));
}

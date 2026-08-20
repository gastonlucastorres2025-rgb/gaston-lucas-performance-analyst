import type { StatsBombConnector } from "@/lib/statsbomb/connector";
import type { StatsBombEnv } from "@/lib/statsbomb/env";
import type {
  StatsBombCompetition,
  StatsBombEvent,
  StatsBombLineup,
  StatsBombMatch,
  StatsBombPlayerSeasonStats,
  StatsBombTeamMatchStats,
} from "@/lib/statsbomb/types";

/**
 * Verificado contra la cuenta real del club (2026-07-14, ver
 * statsbomb/STATSBOMB_SETUP.md): HTTP Basic Auth con usuario/contraseña
 * funciona contra `https://data.statsbomb.com`. Ese es el dominio correcto
 * de la cuenta real — las variantes `data.statsbombservices.com` (Competitions/
 * Matches/Events/Lineups) y `data.statsbom.com` (Team Match Stats v3) que
 * aparecían en los PDFs oficiales no se usan; el dominio sigue viniendo de
 * `STATSBOMB_API_BASE_URL` para no volver a hardcodear uno equivocado si
 * StatsBomb cambia de infraestructura.
 *
 * Endpoints de competitions/matches quedaron confirmados con datos reales
 * (Primera División Uruguay: competition_id=111, season_id=316; Nacional:
 * team_id=1985). Team Match Stats/Events/Lineups usan las mismas
 * credenciales y el mismo dominio, pero todavía no se probó cada endpoint
 * individualmente contra un match_id real — no asumir que ya están
 * verificados hasta hacerlo.
 */
function authHeader(env: StatsBombEnv): string {
  if (env.token) return `Bearer ${env.token}`;
  const raw = `${env.username}:${env.password}`;
  return `Basic ${Buffer.from(raw).toString("base64")}`;
}

async function request<T>(env: StatsBombEnv, path: string): Promise<T> {
  const res = await fetch(`${env.baseUrl}${path}`, {
    headers: { Authorization: authHeader(env), Accept: "application/json" },
    cache: "no-store",
  });

  if (!res.ok) {
    // Mensaje seguro: nunca incluir headers, credenciales ni el token en el error.
    throw new Error(`StatsBomb API respondió ${res.status} para ${path}`);
  }

  return (await res.json()) as T;
}

export function createRealStatsBombConnector(env: StatsBombEnv): StatsBombConnector {
  return {
    mode: "real",
    getCompetitions() {
      return request<StatsBombCompetition[]>(env, "/api/v4/competitions");
    },
    getMatches(competitionId, seasonId) {
      return request<StatsBombMatch[]>(env, `/api/v6/competitions/${competitionId}/seasons/${seasonId}/matches`);
    },
    getTeamMatchStats(matchId) {
      return request<StatsBombTeamMatchStats[]>(env, `/api/v3/matches/${matchId}/team-stats`);
    },
    getEvents(matchId) {
      return request<StatsBombEvent[]>(env, `/api/v10/events/${matchId}`);
    },
    getLineups(matchId) {
      return request<StatsBombLineup[]>(env, `/api/v5/lineups/${matchId}`);
    },
    getPlayerSeasonStats(competitionId, seasonId) {
      return request<StatsBombPlayerSeasonStats[]>(
        env,
        `/api/v6/competitions/${competitionId}/seasons/${seasonId}/player-stats`,
      );
    },
  };
}

import type {
  StatsBombCompetition,
  StatsBombEvent,
  StatsBombLineup,
  StatsBombMatch,
  StatsBombPlayerSeasonStats,
  StatsBombTeamMatchStats,
} from "@/lib/statsbomb/types";
import { readStatsBombEnv } from "@/lib/statsbomb/env";
import { createMockStatsBombConnector } from "@/lib/statsbomb/mock-connector";
import { createRealStatsBombConnector } from "@/lib/statsbomb/real-connector";

/**
 * Puerto que separa el resto del módulo (analytics, reports, UI) del origen
 * real de los datos. Fase 2 solo debe consumir esta interfaz, nunca `fetch`
 * directo a StatsBomb ni el mock connector.
 */
export interface StatsBombConnector {
  readonly mode: "real" | "mock";
  getCompetitions(): Promise<StatsBombCompetition[]>;
  getMatches(competitionId: number, seasonId: number): Promise<StatsBombMatch[]>;
  getTeamMatchStats(matchId: number): Promise<StatsBombTeamMatchStats[]>;
  getEvents(matchId: number): Promise<StatsBombEvent[]>;
  getLineups(matchId: number): Promise<StatsBombLineup[]>;
  getPlayerSeasonStats(competitionId: number, seasonId: number): Promise<StatsBombPlayerSeasonStats[]>;
}

/**
 * Fábrica: usa el conector real solo si todas las variables de entorno están
 * presentes; de lo contrario cae al mock explícito. Nunca debe reportarse
 * como conexión real funcionando sin haber pasado por `real-connector.ts`.
 */
export function getStatsBombConnector(): StatsBombConnector {
  const env = readStatsBombEnv();
  if (!env) return createMockStatsBombConnector();
  return createRealStatsBombConnector(env);
}

import { readFileSync } from "node:fs";
import path from "node:path";
import type { StatsBombConnector } from "@/lib/statsbomb/connector";
import type {
  StatsBombCompetition,
  StatsBombEvent,
  StatsBombLineup,
  StatsBombMatch,
  StatsBombPlayerSeasonStats,
  StatsBombTeamMatchStats,
} from "@/lib/statsbomb/types";

const FIXTURES_DIR = path.join(process.cwd(), "statsbomb", "fixtures");

function loadFixture<T>(file: string): T {
  return JSON.parse(readFileSync(path.join(FIXTURES_DIR, file), "utf-8")) as T;
}

/**
 * Conector explícito de datos simulados. Usa fixtures anonimizados en
 * statsbomb/fixtures/, nunca datos reales del club ni de StatsBomb.
 * Se activa automáticamente cuando faltan variables de entorno de StatsBomb
 * (ver `getStatsBombConnector` en connector.ts) — NUNCA debe presentarse en
 * la UI como si fuera la conexión real.
 */
export function createMockStatsBombConnector(): StatsBombConnector {
  return {
    mode: "mock",
    async getCompetitions() {
      return loadFixture<StatsBombCompetition[]>("competitions.json");
    },
    async getMatches(competitionId, seasonId) {
      const all = loadFixture<StatsBombMatch[]>("matches.json");
      return all.filter((m) => m.competition.competition_id === competitionId && m.season.season_id === seasonId);
    },
    async getTeamMatchStats(matchId) {
      const all = loadFixture<StatsBombTeamMatchStats[]>("team-match-stats.json");
      return all.filter((s) => s.match_id === matchId);
    },
    async getEvents(matchId) {
      void matchId;
      return loadFixture<StatsBombEvent[]>("events.json");
    },
    async getLineups(matchId) {
      void matchId;
      return loadFixture<StatsBombLineup[]>("lineups.json");
    },
    async getPlayerSeasonStats(competitionId, seasonId) {
      void competitionId;
      void seasonId;
      return loadFixture<StatsBombPlayerSeasonStats[]>("player-season-stats.json");
    },
  };
}

// Lectura y validación de las variables de entorno de StatsBomb.
// Nunca loguear valores de credenciales; solo indicar qué falta.

export type StatsBombEnv = {
  baseUrl: string;
  username: string;
  password: string;
  token: string | null;
  competitionId: number;
  seasonId: number;
  ourTeamId: number;
  ourTeamName: string;
};

const REQUIRED_KEYS = [
  "STATSBOMB_API_BASE_URL",
  "STATSBOMB_API_USERNAME",
  "STATSBOMB_API_PASSWORD",
  "STATSBOMB_COMPETITION_ID",
  "STATSBOMB_SEASON_ID",
  "STATSBOMB_OUR_TEAM_ID",
  "STATSBOMB_OUR_TEAM_NAME",
] as const;

export class StatsBombConfigError extends Error {}

/** Devuelve la config validada, o null si falta alguna variable (sin exponer cuáles tienen valor). */
export function readStatsBombEnv(): StatsBombEnv | null {
  const missing = REQUIRED_KEYS.filter((k) => !process.env[k]);
  if (missing.length > 0) return null;

  return {
    baseUrl: process.env.STATSBOMB_API_BASE_URL!.replace(/\/+$/, ""),
    username: process.env.STATSBOMB_API_USERNAME!,
    password: process.env.STATSBOMB_API_PASSWORD!,
    token: process.env.STATSBOMB_API_TOKEN || null,
    competitionId: Number(process.env.STATSBOMB_COMPETITION_ID),
    seasonId: Number(process.env.STATSBOMB_SEASON_ID),
    ourTeamId: Number(process.env.STATSBOMB_OUR_TEAM_ID),
    ourTeamName: process.env.STATSBOMB_OUR_TEAM_NAME!,
  };
}

/** Nombres de variables faltantes, para mensajes de error seguros (nunca valores). */
export function missingStatsBombEnvKeys(): string[] {
  return REQUIRED_KEYS.filter((k) => !process.env[k]);
}

export function isStatsBombConfigured(): boolean {
  return readStatsBombEnv() !== null;
}

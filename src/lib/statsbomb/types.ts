// Contratos tipados de la API de StatsBomb.
// Cada tipo está basado en la documentación oficial provista por el usuario
// (~/Desktop/API StatsBomb/*.pdf). Los campos marcados "sin verificar" no
// aparecían en los PDFs leídos y deben confirmarse antes de asumir su presencia.
//
// Docs verificados: Competitions v4, Matches v6, Team Match Stats v3, Events v10,
// Lineups v5, Player Season Stats v6.
// Docs pendientes de lectura: Player Match Stats v7, Team Season Stats v3, Player Mapping v1.

export type StatsBombCompetition = {
  competition_id: number;
  season_id: number;
  country_name: string;
  competition_name: string;
  competition_gender: string;
  competition_youth: boolean;
  competition_international: boolean;
  season_name: string;
  match_updated: string;
  match_updated_360: string | null;
  match_available: string;
  match_available_360: string | null;
};

export type StatsBombMatchStatus = "available" | "deleted" | "scheduled";

export type StatsBombMatch = {
  match_id: number;
  match_date: string;
  kick_off: string | null;
  competition: { competition_id: number; country_name: string; competition_name: string };
  season: { season_id: number; season_name: string };
  home_team: { home_team_id: number; home_team_name: string; home_team_gender: string; country: { id: number; name: string } };
  away_team: { away_team_id: number; away_team_name: string; away_team_gender: string; country: { id: number; name: string } };
  home_score: number | null;
  away_score: number | null;
  match_status: StatsBombMatchStatus;
  match_status_360: string | null;
  last_updated: string;
  last_updated_360: string | null;
  match_week: number | null;
  competition_stage: { id: number; name: string };
  stadium: { id: number; name: string; country: { id: number; name: string } } | null;
  referee: { id: number; name: string; country: { id: number; name: string } } | null;
};

/**
 * Subconjunto de Team Match Stats v3 verificado contra una respuesta real
 * (partido Wanderers, 2026-07-11, cuenta del club). La respuesta real trae
 * 195 campos — acá solo se transcriben los que usa
 * statsbomb/config/metric_definitions.json. Los nombres exactos (ej.
 * `team_match_np_shots`, no `team_match_shots`) están confirmados contra
 * datos reales, no adivinados del PDF.
 */
export type StatsBombTeamMatchStats = {
  match_id: number;
  team_id: number;
  team_name: string;
  opposition_id: number;
  opposition_name: string;
  team_match_goals: number | null;
  team_match_goals_conceded: number | null;
  team_match_gd: number | null;
  team_match_xgd: number | null;
  team_match_passes: number | null;
  team_match_successful_passes: number | null;
  team_match_directness: number | null;
  team_match_aggression: number | null;
  team_match_np_shots: number | null;
  team_match_np_xg: number | null;
  team_match_np_xg_per_shot: number | null;
  team_match_possession: number | null;
  team_match_ppda: number | null;
  team_match_deep_completions: number | null;
  team_match_deep_progressions: number | null;
  team_match_obv: number | null;
  team_match_obv_pass: number | null;
  team_match_obv_defensive_action: number | null;
  team_match_pressures: number | null;
  team_match_counterpressures: number | null;
  team_match_passing_ratio: number | null;
  team_match_completed_dribbles: number | null;
  team_match_dribble_ratio: number | null;
  team_match_crosses_into_box: number | null;
  team_match_successful_box_cross_ratio: number | null;
  team_match_corners: number | null;
  team_match_corners_conceded: number | null;
  team_match_corner_xg: number | null;
  team_match_free_kicks: number | null;
  team_match_free_kick_xg: number | null;
  team_match_aerial_team_rating: number | null;
  team_match_yellow_cards: number | null;
  team_match_red_cards: number | null;
  team_match_fhalf_pressures: number | null;
  team_match_fhalf_pressures_ratio: number | null;
  team_match_fhalf_counterpressures_ratio: number | null;
  team_match_defensive_distance: number | null;
  // Transiciones: campos reales de contraataque (no derivados de eventos).
  team_match_counter_attacking_shots: number | null;
  team_match_counter_attacking_shots_conceded: number | null;
  team_match_shots_in_clear: number | null;
  team_match_shots_in_clear_conceded: number | null;
  team_match_high_press_shots: number | null;
  team_match_high_press_shots_conceded: number | null;
  // Balón parado, desglose completo.
  team_match_sp: number | null;
  team_match_sp_goals: number | null;
  team_match_sp_conceded: number | null;
  team_match_sp_goals_conceded: number | null;
  team_match_free_kick_xg_conceded: number | null;
  team_match_corner_xg_conceded: number | null;
  team_match_throw_ins: number | null;
  team_match_throw_in_xg: number | null;
  team_match_penalties_won: number | null;
  team_match_penalties_conceded: number | null;
  team_match_aerial_unit_rating: number | null;
  // Campos "_conceded" describen lo sufrido por este equipo en ese partido.
  team_match_np_shots_conceded: number | null;
  team_match_np_xg_conceded: number | null;
  team_match_deep_completions_conceded: number | null;
  team_match_deep_progressions_conceded: number | null;
};

export type StatsBombPlayPattern =
  | "Regular Play"
  | "From Corner"
  | "From Free Kick"
  | "From Throw In"
  | "From Kick Off"
  | "From Goal Kick"
  | "From Counter"
  | "From Keeper";

export type StatsBombLocation = [number, number];

/**
 * Evento simplificado: la especificación real define ~30 tipos de evento con
 * campos anidados específicos por tipo (Pass, Shot, Carry, Duel, Pressure...).
 * Este tipo cubre los campos comunes a todo evento; los sub-objetos por tipo
 * se agregan cuando el analytics engine (Fase 3) los necesite, citando la
 * sección exacta del PDF de Events v10 usada.
 */
export type StatsBombEvent = {
  id: string;
  index: number;
  period: 1 | 2 | 3 | 4 | 5;
  timestamp: string;
  minute: number;
  second: number;
  type: { id: number; name: string };
  possession: number;
  possession_team: { id: number; name: string };
  play_pattern: { id: number; name: StatsBombPlayPattern };
  team: { id: number; name: string };
  player?: { id: number; name: string };
  position?: { id: number; name: string };
  location?: StatsBombLocation;
  duration?: number;
  under_pressure?: boolean;
  shot?: StatsBombShotDetail;
  pass?: StatsBombPassDetail;
  // Verificado contra un partido real (type.name === "Substitution"): outcome.name es "Injury" o "Tactical".
  substitution?: { outcome: { id: number; name: string }; replacement: { id: number; name: string } };
  // "sin verificar": presente en Events v10 pero no transcripto exhaustivamente aquí.
  carry?: Record<string, unknown>;
  // Verificado contra un partido real (type.name === "Interception"): outcome.name ej. "Won"/"Lost".
  interception?: { outcome: { id: number; name: string } };
  // Verificado contra un partido real (type.name === "Foul Committed"): card presente solo cuando hay amonestación/expulsión.
  foul_committed?: { card?: { id: number; name: string }; offensive?: boolean };
  // Verificado contra un partido real (type.name === "Bad Behaviour"): tarjeta sin falta asociada (ej. protesta).
  bad_behaviour?: { card: { id: number; name: string } };
};

export type StatsBombLineupPosition = {
  position_id: number;
  position: string;
  from: string;
  to: string | null;
  from_period: 1 | 2 | 3 | 4 | 5;
  to_period: 1 | 2 | 3 | 4 | 5 | null;
  start_reason: string;
  end_reason: string | null;
};

export type StatsBombLineup = {
  team_id: number;
  team_name: string;
  lineup: Array<{
    player_id: number;
    player_name: string;
    player_nickname: string | null;
    jersey_number: number;
    country: { id: number; name: string };
    positions: StatsBombLineupPosition[];
    stats: { goals: number; assists: number; own_goals: number; penalties_missed: number; penalties_saved: number; penalties_scored: number };
  }>;
  formations: Array<{ period: 1 | 2 | 3 | 4 | 5; timestamp: string; reason: "Starting XI" | "Tactical Shift"; formation: number }>;
};

/**
 * Subconjunto de Player Season Stats v6 verificado contra una respuesta real
 * (464 jugadores de la Primera División Uruguay 2026). Nota real distinta al
 * PDF: `primary_position` llega como string (ej. "Goalkeeper"), no como
 * integer como documenta el PDF — se tipa según lo observado.
 * `player_season_left_foot_ratio` es el único campo real de pierna hábil:
 * >0.60 = zurdo, <0.40 = diestro, entre medio = ambidiestro (criterio del
 * propio PDF de StatsBomb).
 */
export type StatsBombPlayerSeasonStats = {
  player_id: number;
  player_name: string;
  player_known_name: string | null;
  team_id: number;
  team_name: string;
  birth_date: string | null;
  player_height: number | null;
  player_weight: number | null;
  primary_position: string | null;
  secondary_position: string | null;
  player_season_minutes: number | null;
  player_season_appearances: number | null;
  player_season_starting_appearances: number | null;
  player_season_left_foot_ratio: number | null;
  player_season_goals_90: number | null;
  player_season_npg_90: number | null;
  player_season_assists_90: number | null;
  player_season_np_xg_90: number | null;
  player_season_xa_90: number | null;
  player_season_key_passes_90: number | null;
  player_season_deep_progressions_90: number | null;
  player_season_dribbles_90: number | null;
  player_season_dribble_ratio: number | null;
  player_season_tackles_90: number | null;
  player_season_interceptions_90: number | null;
  player_season_padj_tackles_and_interceptions_90: number | null;
  player_season_pressures_90: number | null;
  player_season_obv_90: number | null;
  player_season_aerial_ratio: number | null;
  player_season_average_x_defensive_action: number | null;
  player_season_average_x_pass: number | null;
  player_season_op_passes_90: number | null;
  player_season_passing_ratio: number | null;
  player_season_lbp_90: number | null;
  player_season_lbp_completed_90: number | null;
  player_season_lbp_ratio: number | null;
};

/**
 * Sub-objeto real de un evento tipo "Shot" (Events v10). Coordenadas 0-120 x
 * 0-80, origen esquina superior izquierda del propio equipo atacante.
 */
export type StatsBombShotDetail = {
  statsbomb_xg: number;
  outcome: { id: number; name: string };
  body_part: { id: number; name: string };
  type?: { id: number; name: string };
  first_time?: boolean;
};

/** Sub-objeto real de un evento tipo "Pass" (Events v10). */
export type StatsBombPassDetail = {
  recipient?: { id: number; name: string };
  length: number;
  angle: number;
  height: { id: number; name: string };
  outcome?: { id: number; name: string };
  end_location?: StatsBombLocation;
  cross?: boolean;
  cut_back?: boolean;
  through_ball?: boolean;
  switch?: boolean;
  /** true si este pase terminó directamente en gol (asistencia real). Verificado contra datos reales. */
  goal_assist?: boolean;
  /** true si este pase terminó en remate (con o sin gol) — incluye los goal_assist. Verificado contra datos reales. */
  shot_assist?: boolean;
};

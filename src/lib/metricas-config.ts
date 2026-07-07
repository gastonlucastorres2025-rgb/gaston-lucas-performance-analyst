export const SEASON_START_DATE = "2026-03-25"; // debut del cuerpo técnico actual (vs. Cerro Largo)

type Stats = Record<string, unknown>;

function num(v: unknown): number | null {
  return typeof v === "number" ? v : null;
}

function group(stats: Stats, key: string, sub: string): number | null {
  const g = stats?.[key] as Record<string, unknown> | undefined;
  return g ? num(g[sub]) : null;
}

export type MetricDef = {
  key: string;
  label: string;
  suffix?: string;
  invert?: boolean;
  extract: (stats: Stats) => number | null;
};

export const OFENSIVA_METRICS: MetricDef[] = [
  { key: "goles", label: "Goles", extract: (s) => num(s.goles) },
  { key: "xg", label: "xG", extract: (s) => num(s.xg) },
  { key: "tiros", label: "Tiros", extract: (s) => group(s, "tiros", "total") },
  { key: "tiros_puerta", label: "Tiros a puerta", extract: (s) => group(s, "tiros", "a_puerta") },
  { key: "tiros_fuera_area", label: "Tiros fuera del área", extract: (s) => group(s, "tiros_fuera_area", "total") },
  { key: "corners", label: "Córners", extract: (s) => group(s, "corners", "total") },
  { key: "centros_precisos", label: "Centros precisos", extract: (s) => group(s, "centros", "precisos") },
  { key: "duelos_of_ganados", label: "Duelos ofensivos ganados", extract: (s) => group(s, "duelos_ofensivos", "ganados") },
  { key: "balon_parado_remate", label: "Balón parado con remate", extract: (s) => group(s, "balon_parado", "con_remate") },
  { key: "pases_profundidad", label: "Pases en profundidad", extract: (s) => num(s.pases_profundidad) },
];

export const DEFENSIVA_METRICS: MetricDef[] = [
  { key: "goles_recibidos", label: "Goles recibidos", invert: true, extract: (s) => num(s.goles_recibidos) },
  { key: "tiros_contra", label: "Tiros en contra", invert: true, extract: (s) => group(s, "tiros_en_contra", "total") },
  { key: "tiros_contra_puerta", label: "Tiros en contra a puerta", invert: true, extract: (s) => group(s, "tiros_en_contra", "a_puerta") },
  { key: "duelos_def_ganados", label: "Duelos defensivos ganados", extract: (s) => group(s, "duelos_defensivos", "ganados") },
  { key: "balones_recuperados", label: "Balones recuperados", extract: (s) => group(s, "balones_recuperados", "total") },
  { key: "ppda", label: "PPDA (presión)", invert: true, extract: (s) => num(s.ppda) },
  { key: "faltas", label: "Faltas", invert: true, extract: (s) => num(s.faltas) },
  { key: "amarillas", label: "Tarjetas amarillas", invert: true, extract: (s) => num(s.amarillas) },
];

export const CONSTRUCCION_METRICS: MetricDef[] = [
  { key: "posesion", label: "Posesión", suffix: "%", extract: (s) => num(s.posesion) },
  { key: "pases_totales", label: "Pases totales", extract: (s) => group(s, "pases", "total") },
  { key: "pases_logrados", label: "Pases logrados", extract: (s) => group(s, "pases", "logrados") },
  { key: "pases_pct", label: "Precisión de pase", suffix: "%", extract: (s) => group(s, "pases", "pct") },
  { key: "pases_ultimo_tercio", label: "Pases al último tercio", extract: (s) => group(s, "pases_ultimo_tercio", "logrados") },
  { key: "pases_progresivos", label: "Pases progresivos", extract: (s) => group(s, "pases_progresivos", "precisos") },
  { key: "balones_perdidos", label: "Balones perdidos", invert: true, extract: (s) => group(s, "balones_perdidos", "total") },
  { key: "pases_por_posesion", label: "Pases por posesión", extract: (s) => num(s.pases_por_posesion) },
  { key: "intensidad_paso", label: "Intensidad de paso", extract: (s) => num(s.intensidad_paso) },
];

// Taxonomía fija para no tener 20 variantes distintas de "mediocampista" flotando en
// los filtros (pedido del usuario, con ejemplos reales del propio Drive: "Defensor" y
// "Central izquierdo"/"Central derecho" son todos "Central"; "Mediocampista central" y
// "Volante central" son la misma posición).
export const POSICIONES_CANONICAS = [
  "Golero",
  "Central",
  "Lateral",
  "Mediocampista central",
  "Volante",
  "Extremo",
  "Delantero",
] as const;

export type PosicionCanonica = (typeof POSICIONES_CANONICAS)[number];

function normalizarTexto(s: string): string {
  return s
    .normalize("NFD")
    .replace(/\p{Mn}/gu, "")
    .toLowerCase();
}

// Frases de dos o más palabras: se chequean primero y se "consumen" del texto para que
// no vuelvan a matchear como si fueran una palabra suelta (ej. "volante central" no debe
// contarse también como "volante").
const FRASES_ESPECIFICAS: [RegExp, PosicionCanonica][] = [
  [/\bvolante central\b/, "Mediocampista central"],
  [/\bmediocampista central\b/, "Mediocampista central"],
  [/\bvolante ofensivo\b/, "Volante"],
  [/\bvolante derecho\b/, "Volante"],
  [/\bvolante izquierdo\b/, "Volante"],
  [/\bmedia punta\b/, "Volante"],
  [/\blateral derecho\b/, "Lateral"],
  [/\blateral izquierdo\b/, "Lateral"],
  [/\bextremo derecho\b/, "Extremo"],
  [/\bextremo izquierdo\b/, "Extremo"],
];

const PALABRAS_SIMPLES: [RegExp, PosicionCanonica][] = [
  [/\bgolero\b|\barquero\b|\bportero\b/, "Golero"],
  [/\bcentral\b|\bdefensor\b|\bzaguero\b/, "Central"],
  [/\blateral\b|\bcarrilero\b/, "Lateral"],
  [/\bmediocampista\b|\bmedio\b|\bpivote\b/, "Mediocampista central"],
  [/\bvolante\b|\binterior\b|\benganche\b/, "Volante"],
  [/\bextremo\b|\bpuntero\b|\bwing\b/, "Extremo"],
  [/\bdelantero\b|\bariete\b|\bpunta\b/, "Delantero"],
];

// Una posición cruda puede traer más de una (ej. "Central/Lateral", "Delantero-extremo"):
// se devuelven todas las reconocidas, en el orden en que aparecen los patrones, la
// primera como posición principal y el resto como secundarias.
export function normalizarPosicion(raw: string | null): { primaria: PosicionCanonica | null; secundarias: PosicionCanonica[] } {
  if (!raw || !raw.trim()) return { primaria: null, secundarias: [] };

  let texto = normalizarTexto(raw);
  const encontradas: PosicionCanonica[] = [];

  for (const [patron, canonica] of FRASES_ESPECIFICAS) {
    if (patron.test(texto) && !encontradas.includes(canonica)) {
      encontradas.push(canonica);
      texto = texto.replace(patron, " ");
    }
  }
  for (const [patron, canonica] of PALABRAS_SIMPLES) {
    if (patron.test(texto) && !encontradas.includes(canonica)) {
      encontradas.push(canonica);
    }
  }

  return { primaria: encontradas[0] ?? null, secundarias: encontradas.slice(1) };
}

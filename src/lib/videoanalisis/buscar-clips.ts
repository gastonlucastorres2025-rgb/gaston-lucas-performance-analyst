const PALABRAS_VACIAS = new Set([
  "todas",
  "todos",
  "las",
  "los",
  "la",
  "el",
  "de",
  "del",
  "que",
  "cada",
  "clip",
  "clips",
  "dure",
  "duren",
  "demore",
  "demoren",
  "dura",
  "duracion",
  "duración",
  "segundo",
  "segundos",
  "seg",
  "minuto",
  "minutos",
  "min",
  "luego",
  "despues",
  "después",
  "antes",
  "partir",
  "video",
  "videos",
  "partido",
  "partidos",
  "descargar",
  "buscar",
  "mostrar",
  "mostrame",
  "buscame",
  "quiero",
  "necesito",
  "ver",
  "en",
  "con",
  "y",
  "a",
  "para",
]);

const RE_DURACION = /(\d+)\s*(segundo|seg)s?/i;
const RE_DESDE = [
  /(?:despues|después|luego)\s+de\s+(\d+)\s*(?:minutos?|min)?/i,
  /(?:a partir del?|desde el?)\s+minuto\s+(\d+)/i,
];
const RE_HASTA = [/antes\s+de\s+(\d+)\s*(?:minutos?|min)?/i, /hasta el?\s+minuto\s+(\d+)/i];

function normalizar(s: string): string {
  return s
    .normalize("NFD")
    .replace(/\p{Mn}/gu, "")
    .toLowerCase()
    .trim();
}

export function extraerDuracionSegundos(texto: string): number | null {
  const match = texto.match(RE_DURACION);
  return match ? Number(match[1]) : null;
}

export function extraerFranjaMinutos(texto: string): { desdeMin: number | null; hastaMin: number | null } {
  let desdeMin: number | null = null;
  for (const re of RE_DESDE) {
    const m = texto.match(re);
    if (m) {
      desdeMin = Number(m[1]);
      break;
    }
  }
  let hastaMin: number | null = null;
  for (const re of RE_HASTA) {
    const m = texto.match(re);
    if (m) {
      hastaMin = Number(m[1]);
      break;
    }
  }
  return { desdeMin, hastaMin };
}

// Saca las frases de duración/franja de minutos antes de tokenizar, para que
// los números y palabras clave (20, minutos, luego...) no ensucien el
// matching de categorías.
function limpiarParaTokens(texto: string): string {
  let limpio = texto.replace(RE_DURACION, " ");
  for (const re of [...RE_DESDE, ...RE_HASTA]) limpio = limpio.replace(re, " ");
  return limpio;
}

function tokensSignificativos(texto: string): string[] {
  return normalizar(limpiarParaTokens(texto))
    .split(/[^a-z0-9]+/)
    .filter((t) => t && !PALABRAS_VACIAS.has(t));
}

// Variantes simples para tolerar plurales del español (corner/corners,
// pérdida/pérdidas, recuperación/recuperaciones).
function variantesToken(token: string): string[] {
  const variantes = new Set([token]);
  if (token.endsWith("es") && token.length > 3) variantes.add(token.slice(0, -2));
  if (token.endsWith("s") && token.length > 2) variantes.add(token.slice(0, -1));
  return [...variantes];
}

function categoriaContieneToken(categoriaNormalizada: string, token: string): boolean {
  return variantesToken(token).some((v) => categoriaNormalizada.includes(v));
}

function combinaciones<T>(arr: T[], size: number): T[][] {
  if (size === 0) return [[]];
  if (size > arr.length) return [];
  const [primero, ...resto] = arr;
  const conPrimero = combinaciones(resto, size - 1).map((c) => [primero, ...c]);
  const sinPrimero = combinaciones(resto, size);
  return [...conPrimero, ...sinPrimero];
}

export function encontrarCategoriasCoincidentes(consulta: string, categorias: string[]): string[] {
  const tokens = tokensSignificativos(consulta);
  if (tokens.length === 0) return [];

  const categoriasNormalizadas = categorias.map((c) => ({ original: c, normalizado: normalizar(c) }));

  // Probamos con el mayor subconjunto de palabras posible, para descartar
  // palabras "de relleno" que no corresponden a ninguna categoría real,
  // en vez de asumir que siempre sobra la última palabra.
  for (let size = tokens.length; size >= 1; size--) {
    for (const subset of combinaciones(tokens, size)) {
      const coincidencias = categoriasNormalizadas.filter((c) =>
        subset.every((t) => categoriaContieneToken(c.normalizado, t)),
      );
      if (coincidencias.length > 0) return coincidencias.map((c) => c.original);
    }
  }
  return [];
}

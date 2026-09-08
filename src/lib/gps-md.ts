// Clasificación de días de microciclo (MD), igual a la definición ya especificada en
// docs/gps-modulo-diseno.md sección 13 — no es una convención nueva inventada para el
// dashboard. MD es el partido (referencia cero); MD+1/MD+2 son los días después del último
// partido jugado (recuperación); MD-1..MD-N son los días antes del próximo partido. Se calcula
// por distancia en días real contra las fechas de `partidos_va`, nunca asumiendo "ayer = MD-1".

export type PartidoRef = { fecha: string };

function aFechaUtc(fecha: string): number {
  // Date.UTC espera el mes 0-indexado (0 = enero); "2026-03-28".split("-") da mes "03" tal cual,
  // así que hay que restarle 1 — si no, cada fecha queda corrida un mes hacia adelante. Como
  // TODAS las fechas se corrían igual, una resta entre dos fechas del mismo mes daba bien de
  // casualidad, pero entre fechas de meses distintos (el caso normal acá: entrenamiento de fin
  // de mes vs. partido del mes siguiente) el resultado salía mal porque los meses no tienen
  // todos la misma cantidad de días.
  const [year, month, day] = fecha.split("-").map(Number);
  return Date.UTC(year, month - 1, day);
}

function diffDias(a: string, b: string): number {
  return Math.round((aFechaUtc(a) - aFechaUtc(b)) / 86_400_000);
}

/** Devuelve la etiqueta MD de una fecha de sesión (p. ej. "MD", "MD+1", "MD-2"), o null si no
 * hay ningún partido real en el período (nada contra qué calcular). */
export function calcularMdRelativo(fechaSesion: string, partidos: PartidoRef[]): string | null {
  if (partidos.length === 0) return null;
  const fechas = partidos.map((p) => p.fecha).sort();
  if (fechas.includes(fechaSesion)) return "MD";

  let prev: string | null = null;
  let next: string | null = null;
  for (const f of fechas) {
    if (f < fechaSesion) prev = f;
    if (f > fechaSesion && next === null) next = f;
  }

  const distPrev = prev ? diffDias(fechaSesion, prev) : Infinity;
  const distNext = next ? diffDias(next, fechaSesion) : Infinity;
  if (distPrev === Infinity && distNext === Infinity) return null;

  return distPrev <= distNext ? `MD+${distPrev}` : `MD-${distNext}`;
}

/** Convierte una etiqueta MD a un valor numérico ordenable (MD=0, MD+1=1, MD-1=-1, ...) — útil
 * para ordenar una línea de tiempo de microciclo de izquierda a derecha. */
export function ordenMd(etiqueta: string): number {
  if (etiqueta === "MD") return 0;
  const signo = etiqueta.includes("+") ? 1 : -1;
  const n = Number(etiqueta.replace(/[^0-9]/g, ""));
  return signo * n;
}

import { COLORS } from "@/lib/pdf-theme";

/** % real de un valor contra una referencia (el máximo histórico del jugador, el máximo de la
 * temporada, etc.) — nunca inventado, y null cuando no hay con qué comparar. */
export function porcentajeDeReferencia(valor: number | null, referencia: number | null): number | null {
  if (valor === null || referencia === null || referencia === 0) return null;
  return Math.round((valor / referencia) * 100);
}

/** Semáforo de 4 niveles (>80% / 60-80% / 40-60% / <40%), igual a la convención ya usada en los
 * reportes de carga del cuerpo técnico — no es una escala inventada para esta pantalla. */
export function colorSemaforo(pct: number | null): string {
  if (pct === null) return COLORS.grayTint;
  if (pct > 80) return COLORS.nivelAlto;
  if (pct > 60) return COLORS.nivelMedioAlto;
  if (pct > 40) return COLORS.nivelMedio;
  return COLORS.nivelBajo;
}

export function promedio(valores: number[]): number | null {
  const reales = valores.filter((v) => v !== null && v !== undefined && !Number.isNaN(v));
  if (reales.length === 0) return null;
  return reales.reduce((a, b) => a + b, 0) / reales.length;
}

export function maximo(valores: (number | null)[]): number | null {
  const reales = valores.filter((v): v is number => v !== null && v !== undefined && !Number.isNaN(v));
  if (reales.length === 0) return null;
  return Math.max(...reales);
}

/** Intensidad de color para una celda de tabla tipo "heatmap" — el valor más alto de la columna
 * se ve más marcado, el más bajo casi sin tinte. Puramente visual: no cambia qué dato se
 * muestra, solo cómo se resalta un valor alto de un vistazo (igual a las tablas de reportes de
 * rendimiento profesionales). Usa el azul de Nacional, no un color inventado para la ocasión. */
export function fondoHeatmap(valor: number, min: number, max: number): string {
  if (max <= min) return "transparent";
  const t = Math.max(0, Math.min(1, (valor - min) / (max - min)));
  const opacidad = 0.05 + t * 0.28;
  return `rgba(11, 61, 145, ${opacidad.toFixed(3)})`;
}

/** Min/max reales de una columna, ignorando los valores que no correspondan (p. ej. "sesiones"). */
export function rangoColumna(valores: number[]): { min: number; max: number } {
  if (valores.length === 0) return { min: 0, max: 0 };
  return { min: Math.min(...valores), max: Math.max(...valores) };
}

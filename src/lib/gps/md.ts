import { diasEntre } from "@/lib/gps/calculos";

// Clasificación de días de microciclo (MD): MD es el partido (referencia cero), MD+N los N días
// después del último partido y MD-N los N días antes del próximo. Se calcula por distancia real en
// días contra las fechas de los partidos, nunca asumiendo que "ayer = MD-1".

/** Etiqueta MD de una fecha ("MD", "MD+1", "MD-2"), o null si no hay ningún partido contra el que
 * calcular. Si el partido anterior y el siguiente están a igual distancia gana el anterior. */
export function calcularMdRelativo(fecha: string, fechasPartidos: string[]): string | null {
  if (fechasPartidos.length === 0) return null;
  const fechas = [...fechasPartidos].sort();
  if (fechas.includes(fecha)) return "MD";

  let previo: string | null = null;
  let siguiente: string | null = null;
  for (const f of fechas) {
    if (f < fecha) previo = f;
    if (f > fecha && siguiente === null) siguiente = f;
  }
  const distPrevio = previo ? diasEntre(previo, fecha) : Infinity;
  const distSiguiente = siguiente ? diasEntre(fecha, siguiente) : Infinity;
  if (distPrevio === Infinity && distSiguiente === Infinity) return null;
  return distPrevio <= distSiguiente ? `MD+${distPrevio}` : `MD-${distSiguiente}`;
}

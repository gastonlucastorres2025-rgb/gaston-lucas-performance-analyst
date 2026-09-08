import type { GpsRegistroConSesion } from "@/lib/gps-data";
import { agregarMetrica, cambioPorcentual, METRICAS, type ClaveMetrica } from "@/lib/gps-metricas";

export function agruparPorJugador(registros: GpsRegistroConSesion[]): Map<string, GpsRegistroConSesion[]> {
  const mapa = new Map<string, GpsRegistroConSesion[]>();
  for (const r of registros) {
    const lista = mapa.get(r.nombre) ?? [];
    lista.push(r);
    mapa.set(r.nombre, lista);
  }
  return mapa;
}

export type ResumenPeriodo = { sesiones: number } & Partial<Record<ClaveMetrica, number | null>>;

/** Agrega un conjunto de registros (de un jugador, o de todo el equipo) para todas las métricas
 * del catálogo — la misma forma de agregación que usa el resto del módulo. */
export function resumirPeriodo(registros: GpsRegistroConSesion[]): ResumenPeriodo {
  const resumen: ResumenPeriodo = { sesiones: registros.length };
  for (const def of METRICAS) resumen[def.clave] = agregarMetrica(registros, def.clave);
  return resumen;
}

export type ComparacionPeriodo = {
  actual: ResumenPeriodo;
  anterior: ResumenPeriodo | null;
  cambioPct: Partial<Record<ClaveMetrica, number | null>>;
};

/** Compara un período contra otro (p. ej. jugador en MD-2 de esta semana vs MD-2 de la semana
 * pasada, o equipo esta semana vs semana anterior). El cambio % es real, calculado sobre los
 * agregados — nunca un número inventado. */
export function compararPeriodos(actual: GpsRegistroConSesion[], anterior: GpsRegistroConSesion[] | null): ComparacionPeriodo {
  const resumenActual = resumirPeriodo(actual);
  const resumenAnterior = anterior ? resumirPeriodo(anterior) : null;
  const cambioPct: Partial<Record<ClaveMetrica, number | null>> = {};
  for (const def of METRICAS) {
    cambioPct[def.clave] = resumenAnterior ? cambioPorcentual(resumenActual[def.clave] ?? null, resumenAnterior[def.clave] ?? null) : null;
  }
  return { actual: resumenActual, anterior: resumenAnterior, cambioPct };
}

/** Filtra los registros de un jugador por etiqueta MD exacta (p. ej. todas sus sesiones "MD-2"),
 * para comparar "la misma sesión de la semana" entre semanas distintas. */
export function filtrarPorMd(registros: GpsRegistroConSesion[], md: string): GpsRegistroConSesion[] {
  return registros.filter((r) => r.md === md);
}

/** Las últimas N sesiones de un jugador (por fecha), para promedios de referencia tipo
 * "promedio de las últimas 5 sesiones". */
export function ultimasNSesiones(registrosJugador: GpsRegistroConSesion[], n: number): GpsRegistroConSesion[] {
  return registrosJugador
    .slice()
    .sort((a, b) => b.fecha.localeCompare(a.fecha))
    .slice(0, n);
}

export const PERIODOS_JUGADOR = [
  { clave: "MD-1", label: "M-1" },
  { clave: "MD-2", label: "M-2" },
  { clave: "MD-3", label: "M-3" },
  { clave: "MD-4", label: "M-4" },
  { clave: "MD+1", label: "M+1" },
  { clave: "MD+2", label: "M+2" },
  { clave: "ultimas5", label: "Últimas 5 sesiones" },
  { clave: "ultimas10", label: "Últimas 10 sesiones" },
  { clave: "todo", label: "Todo el período" },
] as const;

/** Resuelve un período seleccionable para la comparación "jugador consigo mismo": una etiqueta
 * MD real (todas sus sesiones MD-2, por ejemplo), un promedio de últimas N sesiones, o todo el
 * período. No incluye "último partido": la carga de partido se saca de los drills "Primer
 * Tiempo"/"Segundo Tiempo" (ver `obtenerCargaPartido` en gps-partidos.ts), una fuente distinta a
 * las sesiones de entrenamiento que arma este período. */
export function resolverPeriodoJugador(registrosJugador: GpsRegistroConSesion[], clave: string): GpsRegistroConSesion[] {
  if (clave === "ultimas5") return ultimasNSesiones(registrosJugador, 5);
  if (clave === "ultimas10") return ultimasNSesiones(registrosJugador, 10);
  if (clave === "todo") return registrosJugador;
  return filtrarPorMd(registrosJugador, clave);
}

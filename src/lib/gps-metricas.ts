import type { GpsRegistro } from "@/lib/gps-data";

/** Catálogo único de métricas de carga que existen realmente en los datos (ver auditoría: las
 * columnas `player_load`, `sprint_distancia_m`, `sprints_cant`, `porcentaje_vmax_individual` y
 * las "intensas" están en el esquema pero sin un solo valor cargado por el proveedor — por eso
 * no aparecen acá). Cada métrica define cómo se agrega: "suma" para volumen acumulado en un
 * período, "max" para picos (velocidad), "promedio" para intensidades relativas. Es la única
 * fuente de verdad para el dashboard, la tabla, los gráficos y las comparativas — así ningún
 * componente decide por su cuenta cómo agregar un dato. */
export type ClaveMetrica =
  | "distanciaTotalM"
  | "distanciaPorMin"
  | "distAltaVelocidadM"
  | "distMuyAltaVelocidadM"
  | "velocidadMaximaKmh"
  | "aceleracionesCant"
  | "desaceleracionesCant"
  | "sprintEntradasCant"
  | "duracionMin";

export type DefMetrica = {
  clave: ClaveMetrica;
  label: string;
  corto: string;
  unidad: string;
  agregacion: "suma" | "max" | "promedio";
  decimales: number;
};

export const METRICAS: DefMetrica[] = [
  { clave: "distanciaTotalM", label: "Distancia total", corto: "Distancia", unidad: "m", agregacion: "suma", decimales: 0 },
  { clave: "distanciaPorMin", label: "Distancia por minuto", corto: "m/min", unidad: "m/min", agregacion: "promedio", decimales: 1 },
  { clave: "distAltaVelocidadM", label: "Distancia a alta velocidad (HSR)", corto: "HSR", unidad: "m", agregacion: "suma", decimales: 0 },
  { clave: "distMuyAltaVelocidadM", label: "Distancia en sprint (zona 6)", corto: "Sprint", unidad: "m", agregacion: "suma", decimales: 0 },
  { clave: "velocidadMaximaKmh", label: "Velocidad máxima", corto: "Vel. máx.", unidad: "km/h", agregacion: "max", decimales: 1 },
  { clave: "aceleracionesCant", label: "Aceleraciones", corto: "Acel.", unidad: "", agregacion: "suma", decimales: 0 },
  { clave: "desaceleracionesCant", label: "Desaceleraciones", corto: "Desac.", unidad: "", agregacion: "suma", decimales: 0 },
  { clave: "sprintEntradasCant", label: "Entradas a sprint", corto: "Entr. sprint", unidad: "", agregacion: "suma", decimales: 0 },
  { clave: "duracionMin", label: "Duración", corto: "Duración", unidad: "min", agregacion: "suma", decimales: 0 },
];

export function defMetrica(clave: ClaveMetrica): DefMetrica {
  const def = METRICAS.find((m) => m.clave === clave);
  if (!def) throw new Error(`Métrica desconocida: ${clave}`);
  return def;
}

export function valorMetrica(registro: GpsRegistro, clave: ClaveMetrica): number | null {
  return registro[clave];
}

function agregar(valores: number[], modo: DefMetrica["agregacion"]): number {
  if (valores.length === 0) return 0;
  if (modo === "suma") return valores.reduce((a, b) => a + b, 0);
  if (modo === "max") return Math.max(...valores);
  return valores.reduce((a, b) => a + b, 0) / valores.length;
}

/** Agrega un conjunto de registros según el modo de la métrica, ignorando valores nulos (nunca
 * los trata como cero salvo que la métrica sea de tipo "suma" y no haya ningún valor real). */
export function agregarMetrica(registros: GpsRegistro[], clave: ClaveMetrica): number | null {
  const def = defMetrica(clave);
  const valores = registros.map((r) => valorMetrica(r, clave)).filter((v): v is number => v !== null);
  if (valores.length === 0) return null;
  return redondear(agregar(valores, def.agregacion), def.decimales);
}

export function redondear(valor: number, decimales: number): number {
  const factor = 10 ** decimales;
  return Math.round(valor * factor) / factor;
}

/** Variación porcentual real entre dos valores agregados — nunca inventada; si falta cualquiera
 * de los dos lados, o el período anterior es cero, no hay comparación posible (null). */
export function cambioPorcentual(actual: number | null, anterior: number | null): number | null {
  if (actual === null || anterior === null || anterior === 0) return null;
  return redondear(((actual - anterior) / anterior) * 100, 1);
}

/** Promedio simple de una métrica sobre un grupo de registros, sin importar el modo de
 * agregación propio de la métrica — se usa para "carga promedio de la sesión" (un valor por
 * jugador presente ese día), donde lo que importa es comparar sesiones entre sí más allá de
 * cuántos jugadores hayan participado. */
export function promedioSimple(registros: { [K in ClaveMetrica]?: number | null }[], clave: ClaveMetrica): number | null {
  const valores = registros.map((r) => r[clave]).filter((v): v is number => v !== null && v !== undefined);
  if (valores.length === 0) return null;
  const def = defMetrica(clave);
  return redondear(valores.reduce((a, b) => a + b, 0) / valores.length, def.decimales);
}

export function formatearValor(valor: number | null, def: DefMetrica): string {
  if (valor === null) return "—";
  const texto = valor.toLocaleString("es-UY", { minimumFractionDigits: def.decimales, maximumFractionDigits: def.decimales });
  return def.unidad ? `${texto} ${def.unidad}` : texto;
}

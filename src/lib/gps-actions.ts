"use server";

import { listarRegistrosDetallado, listarRegistrosEnRango, obtenerSesionDetalle, type GpsRegistro, type GpsSesionDetalle } from "@/lib/gps-data";
import {
  obtenerCargaPartido,
  obtenerCargaPartidoPorPeriodo,
  obtenerCargaPartidosComoRegistros,
  obtenerPartidosReales,
  type CargaPartidoJugador,
  type PartidoGps,
} from "@/lib/gps-partidos";
import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";

const METRICAS_VOLUMEN = ["distanciaTotalM", "distAltaVelocidadM", "distMuyAltaVelocidadM", "sprintsCant", "aceleracionesCant", "desaceleracionesCant"] as const;
export type MetricaVolumen = (typeof METRICAS_VOLUMEN)[number];
export type VolumenTotal = Record<MetricaVolumen, number | null>;

function sumarEquipo(jugadores: CargaPartidoJugador[]): VolumenTotal {
  const totales = {} as VolumenTotal;
  for (const clave of METRICAS_VOLUMEN) {
    const valores = jugadores.map((j) => j[clave]).filter((v): v is number => v !== null);
    totales[clave] = valores.length > 0 ? valores.reduce((a, b) => a + b, 0) : null;
  }
  return totales;
}

export type DatosPdfPartido = {
  partido: PartidoGps;
  jugadores: CargaPartidoJugador[];
  primerTiempo: CargaPartidoJugador[];
  segundoTiempo: CargaPartidoJugador[];
  volumenTotal: VolumenTotal;
  volumenPrimerTiempo: VolumenTotal;
  volumenSegundoTiempo: VolumenTotal;
  /** El máximo real de cada métrica entre TODOS los partidos con archivo GPS de la temporada —
   * referencia para el semáforo de color (no un umbral inventado, es el propio techo del equipo
   * en este período). */
  maximoTemporada: VolumenTotal;
  /** Máximo histórico real de cada jugador (entrenamientos + partidos), para colorear su fila en
   * la tabla individual contra su propio techo, no el del equipo. */
  maximosPorJugador: Record<string, VolumenTotal>;
};

/** Junta todos los datos reales para el PDF de un partido: carga del equipo completo, separada
 * por período, y el máximo real de la temporada de cada métrica (para las celdas de color). Un
 * partido sin archivo GPS de ese día simplemente no tiene volumen — no se inventa nada. */
export async function obtenerDatosPdfPartido(partidoId: string): Promise<DatosPdfPartido> {
  const supabase = await createClient();
  const partidos = await obtenerPartidosReales(supabase);
  const partido = partidos.find((p) => p.id === partidoId);
  if (!partido) notFound();

  const [jugadores, porPeriodo, cargaTodosLosPartidos, maximosPorJugadorMapa] = await Promise.all([
    obtenerCargaPartido(supabase, partido.fecha),
    obtenerCargaPartidoPorPeriodo(supabase, partido.fecha),
    Promise.all(partidos.map((p) => obtenerCargaPartido(supabase, p.fecha))),
    obtenerMaximosHistoricosPorJugador(supabase, `partido-${partido.id}`),
  ]);

  const totalesPorPartido = cargaTodosLosPartidos.map(sumarEquipo);
  const maximoTemporada = {} as VolumenTotal;
  for (const clave of METRICAS_VOLUMEN) {
    const valores = totalesPorPartido.map((t) => t[clave]).filter((v): v is number => v !== null);
    maximoTemporada[clave] = valores.length > 0 ? Math.max(...valores) : null;
  }

  return {
    partido,
    jugadores,
    primerTiempo: porPeriodo.primerTiempo,
    segundoTiempo: porPeriodo.segundoTiempo,
    volumenTotal: sumarEquipo(jugadores),
    volumenPrimerTiempo: sumarEquipo(porPeriodo.primerTiempo),
    volumenSegundoTiempo: sumarEquipo(porPeriodo.segundoTiempo),
    maximoTemporada,
    maximosPorJugador: Object.fromEntries(maximosPorJugadorMapa),
  };
}

/** `GpsRegistro`/`GpsRegistroConSesion` (entrenamientos, y partidos ya convertidos a la misma
 * forma) usan `sprintEntradasCant` en vez de `sprintsCant` — mismo dato, distinto nombre. */
const CAMPO_ENTRENAMIENTO: Record<MetricaVolumen, keyof GpsRegistro> = {
  distanciaTotalM: "distanciaTotalM",
  distAltaVelocidadM: "distAltaVelocidadM",
  distMuyAltaVelocidadM: "distMuyAltaVelocidadM",
  sprintsCant: "sprintEntradasCant",
  aceleracionesCant: "aceleracionesCant",
  desaceleracionesCant: "desaceleracionesCant",
};

function sumarEquipoEntrenamiento(registros: GpsRegistro[]): VolumenTotal {
  const totales = {} as VolumenTotal;
  for (const clave of METRICAS_VOLUMEN) {
    const valores = registros.map((r) => r[CAMPO_ENTRENAMIENTO[clave]] as number | null).filter((v): v is number => v !== null);
    totales[clave] = valores.length > 0 ? valores.reduce((a, b) => a + b, 0) : null;
  }
  return totales;
}

/** El máximo histórico REAL de cada jugador, en cada métrica, mirando todo el CSV de la
 * temporada — entrenamientos y partidos combinados (misma persona, mismo techo real, venga de
 * donde venga el dato). Referencia para el semáforo de color de las tablas por jugador.
 *
 * `excluirSesionId` saca esa sesión/partido puntual del cálculo — así el reporte de ESE día
 * compara contra el techo que el jugador tenía ANTES de esa sesión. Si ese día lo superó, el %
 * puede pasar de 100 (ej. 110%) en vez de quedar pegado siempre a 100 por incluirse a sí mismo.
 * Al reporte de la sesión siguiente ya no se le excluye nada de esta, así que ese nuevo valor más
 * alto pasa a ser automáticamente el máximo de referencia de ahí en adelante — no hay que guardar
 * nada aparte, el propio historial real ya lo resuelve. */
async function obtenerMaximosHistoricosPorJugador(
  supabase: Awaited<ReturnType<typeof createClient>>,
  excluirSesionId?: string,
): Promise<Map<string, VolumenTotal>> {
  const [entrenamientos, partidos] = await Promise.all([listarRegistrosDetallado(supabase), obtenerPartidosReales(supabase)]);
  const cargaPartidos = await obtenerCargaPartidosComoRegistros(supabase, partidos);
  const todos = [...entrenamientos, ...cargaPartidos].filter((r) => r.sesionId !== excluirSesionId);

  const porJugador = new Map<string, typeof todos>();
  for (const r of todos) {
    const lista = porJugador.get(r.nombre) ?? [];
    lista.push(r);
    porJugador.set(r.nombre, lista);
  }

  const resultado = new Map<string, VolumenTotal>();
  for (const [nombre, registros] of porJugador) {
    const maximos = {} as VolumenTotal;
    for (const clave of METRICAS_VOLUMEN) {
      const valores = registros.map((r) => r[CAMPO_ENTRENAMIENTO[clave]] as number | null).filter((v): v is number => v !== null);
      maximos[clave] = valores.length > 0 ? Math.max(...valores) : null;
    }
    resultado.set(nombre, maximos);
  }
  return resultado;
}

export type DatosPdfSesion = {
  sesion: GpsSesionDetalle;
  volumenTotal: VolumenTotal;
  /** El máximo real de cada métrica entre TODAS las sesiones de entrenamiento de la temporada —
   * referencia para el semáforo de color, calculada de los datos reales, no un umbral inventado. */
  maximoTemporada: VolumenTotal;
  /** Máximo histórico real de cada jugador (entrenamientos + partidos), para colorear su fila en
   * la tabla individual contra su propio techo, no el del equipo. */
  maximosPorJugador: Record<string, VolumenTotal>;
};

/** Junta los datos reales para el PDF de una sesión de entrenamiento: carga total del equipo esa
 * sesión, por jugador, y el máximo real entre todas las sesiones de la temporada (para el mismo
 * semáforo de color que usa el PDF de partido). */
export async function obtenerDatosPdfSesion(sesionId: string): Promise<DatosPdfSesion> {
  const supabase = await createClient();
  const sesion = await obtenerSesionDetalle(supabase, sesionId);
  if (!sesion) notFound();

  const [todosLosRegistros, maximosPorJugadorMapa] = await Promise.all([listarRegistrosDetallado(supabase), obtenerMaximosHistoricosPorJugador(supabase, sesionId)]);
  const porSesion = new Map<string, GpsRegistro[]>();
  for (const r of todosLosRegistros) {
    const lista = porSesion.get(r.sesionId) ?? [];
    lista.push(r);
    porSesion.set(r.sesionId, lista);
  }
  const totalesPorSesion = Array.from(porSesion.values()).map(sumarEquipoEntrenamiento);
  const maximoTemporada = {} as VolumenTotal;
  for (const clave of METRICAS_VOLUMEN) {
    const valores = totalesPorSesion.map((t) => t[clave]).filter((v): v is number => v !== null);
    maximoTemporada[clave] = valores.length > 0 ? Math.max(...valores) : null;
  }

  return {
    sesion,
    volumenTotal: sumarEquipoEntrenamiento(sesion.registros),
    maximoTemporada,
    maximosPorJugador: Object.fromEntries(maximosPorJugadorMapa),
  };
}

export type BloqueParaPdf = {
  id: string;
  fecha: string;
  turno: string | null;
  registros: Awaited<ReturnType<typeof listarRegistrosEnRango>>[number]["registros"];
};

/** Trae los datos de GPS de un rango de fechas para armar el PDF (un día, una semana/microciclo, o
 * cualquier rango) — usado desde el botón de exportar, que corre en el cliente. Un mismo día
 * puede tener más de una sesión GPS real (subgrupos de plantel subidos por separado, mismo turno
 * o sin turno) — por eso el id de la sesión viaja acá, no alcanza con fecha+turno para
 * distinguirlas. */
export async function obtenerBloquesGpsParaPdf(desde?: string, hasta?: string): Promise<BloqueParaPdf[]> {
  const supabase = await createClient();
  const bloques = await listarRegistrosEnRango(supabase, desde, hasta);
  return bloques.map(({ sesion, registros }) => ({ id: sesion.id, fecha: sesion.fecha, turno: sesion.turno, registros }));
}

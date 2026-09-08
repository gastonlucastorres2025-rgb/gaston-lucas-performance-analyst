import type { SupabaseClient } from "@supabase/supabase-js";
import { calcularMdRelativo } from "@/lib/gps-md";
import { obtenerPartidosReales } from "@/lib/gps-partidos";

// El módulo GPS es independiente de "Jugadores" a propósito (ver commit de limpieza de datos): la
// identidad del jugador vive directo en cada registro (nombre_proveedor_crudo), no depende de que
// exista una fila en `players` — así el historial de carga física sobrevive aunque se vacíe el
// plantel al cambiar de club.

export type GpsRegistro = {
  id: string;
  nombre: string;
  duracionMin: number | null;
  distanciaTotalM: number | null;
  distanciaPorMin: number | null;
  velocidadMaximaKmh: number | null;
  distAltaVelocidadM: number | null;
  distMuyAltaVelocidadM: number | null;
  aceleracionesCant: number | null;
  desaceleracionesCant: number | null;
  sprintEntradasCant: number | null;
  hmlEsfuerzosCant: number | null;
  hmlDistanciaM: number | null;
};

export type GpsSesionResumen = {
  id: string;
  fecha: string;
  turno: string | null;
  nombreBloque: string | null;
  cantidadJugadores: number;
  md: string | null;
};

export type GpsSesionDetalle = GpsSesionResumen & { registros: GpsRegistro[] };

export type GpsResumenJugador = {
  nombre: string;
  sesiones: number;
  distanciaTotalM: number;
  distanciaPromedioM: number;
  velocidadMaximaKmh: number;
  aceleracionesProm: number;
  desaceleracionesProm: number;
};

/** Un registro con el contexto de su sesión (fecha, turno, MD) — la forma "plana" que usan el
 * dashboard, la tabla, los gráficos y las comparativas. */
export type GpsRegistroConSesion = GpsRegistro & {
  sesionId: string;
  fecha: string;
  turno: string | null;
  nombreBloque: string | null;
  md: string | null;
};

type MetricasExtra = { entradas_zona6?: number; hml_esfuerzos?: number; hml_distancia_m?: number };

function aRegistro(r: {
  id: string;
  nombre_proveedor_crudo: string | null;
  duracion_min: number | null;
  distancia_total_m: number | null;
  distancia_por_min: number | null;
  velocidad_maxima_kmh: number | null;
  dist_alta_velocidad_m: number | null;
  dist_muy_alta_velocidad_m: number | null;
  aceleraciones_cant: number | null;
  desaceleraciones_cant: number | null;
  metricas_extra?: MetricasExtra | null;
}): GpsRegistro {
  const extra = r.metricas_extra ?? {};
  return {
    id: r.id,
    nombre: r.nombre_proveedor_crudo ?? "Sin nombre",
    duracionMin: r.duracion_min,
    distanciaTotalM: r.distancia_total_m,
    distanciaPorMin: r.distancia_por_min,
    velocidadMaximaKmh: r.velocidad_maxima_kmh,
    distAltaVelocidadM: r.dist_alta_velocidad_m,
    distMuyAltaVelocidadM: r.dist_muy_alta_velocidad_m,
    aceleracionesCant: r.aceleraciones_cant,
    desaceleracionesCant: r.desaceleraciones_cant,
    sprintEntradasCant: extra.entradas_zona6 ?? null,
    hmlEsfuerzosCant: extra.hml_esfuerzos ?? null,
    hmlDistanciaM: extra.hml_distancia_m ?? null,
  };
}

const TAMANO_PAGINA = 1000;

/** Supabase/PostgREST corta cualquier consulta en 1000 filas por default, sin avisar — con 2636+
 * registros de GPS reales, una consulta sin paginar para "todo el período" se queda con las
 * primeras 1000 nomás (en el orden que Postgres devuelva, no necesariamente por fecha), y
 * cualquier filtro que dependa de sesiones fuera de esas 1000 (M-3, jugadores de fin de
 * temporada, etc.) queda vacío o incompleto sin ningún error visible. Esto pagina de verdad. */
export async function traerTodasLasFilas<T>(
  pedirPagina: (desde: number, hasta: number) => PromiseLike<{ data: T[] | null; error: { message: string } | null }>,
): Promise<T[]> {
  let desde = 0;
  let todas: T[] = [];
  for (;;) {
    const { data, error } = await pedirPagina(desde, desde + TAMANO_PAGINA - 1);
    if (error) throw new Error(error.message);
    const fila = data ?? [];
    todas = todas.concat(fila);
    if (fila.length < TAMANO_PAGINA) break;
    desde += TAMANO_PAGINA;
  }
  return todas;
}

const REGISTRO_SELECT =
  "id, gps_sesion_id, nombre_proveedor_crudo, duracion_min, distancia_total_m, distancia_por_min, velocidad_maxima_kmh, dist_alta_velocidad_m, dist_muy_alta_velocidad_m, aceleraciones_cant, desaceleraciones_cant, metricas_extra";

export async function listarSesiones(supabase: SupabaseClient, desde?: string, hasta?: string): Promise<GpsSesionResumen[]> {
  const [data, partidos] = await Promise.all([
    traerTodasLasFilas((rangoDesde, rangoHasta) => {
      let query = supabase
        .from("gps_sesiones")
        .select("id, fecha, turno, nombre_bloque, gps_registros(count)")
        .order("fecha", { ascending: false });
      if (desde) query = query.gte("fecha", desde);
      if (hasta) query = query.lte("fecha", hasta);
      return query.range(rangoDesde, rangoHasta);
    }),
    obtenerPartidosReales(supabase),
  ]);
  return data.map((s) => ({
    id: s.id,
    fecha: s.fecha,
    turno: s.turno,
    nombreBloque: s.nombre_bloque,
    cantidadJugadores: (s.gps_registros as { count: number }[] | null)?.[0]?.count ?? 0,
    md: calcularMdRelativo(s.fecha, partidos),
  }));
}

export async function obtenerSesionDetalle(supabase: SupabaseClient, id: string): Promise<GpsSesionDetalle | null> {
  const { data: sesion } = await supabase.from("gps_sesiones").select("id, fecha, turno, nombre_bloque").eq("id", id).maybeSingle();
  if (!sesion) return null;
  const [{ data: registros }, partidos] = await Promise.all([
    supabase.from("gps_registros").select(REGISTRO_SELECT).eq("gps_sesion_id", id).order("distancia_total_m", { ascending: false }),
    obtenerPartidosReales(supabase),
  ]);
  return {
    id: sesion.id,
    fecha: sesion.fecha,
    turno: sesion.turno,
    nombreBloque: sesion.nombre_bloque,
    cantidadJugadores: registros?.length ?? 0,
    md: calcularMdRelativo(sesion.fecha, partidos),
    registros: (registros ?? []).map(aRegistro),
  };
}

/** Un registro por sesión, para armar el resumen por jugador y el PDF de rango de fechas. */
export async function listarRegistrosEnRango(
  supabase: SupabaseClient,
  desde?: string,
  hasta?: string,
): Promise<{ sesion: GpsSesionResumen; registros: GpsRegistro[] }[]> {
  const sesiones = await listarSesiones(supabase, desde, hasta);
  if (sesiones.length === 0) return [];
  const idsSesion = sesiones.map((s) => s.id);
  const registros = await traerTodasLasFilas((desde, hasta) =>
    supabase
      .from("gps_registros")
      .select(REGISTRO_SELECT)
      .in("gps_sesion_id", idsSesion)
      .range(desde, hasta),
  );
  const porSesion = new Map<string, GpsRegistro[]>();
  for (const r of registros) {
    const lista = porSesion.get(r.gps_sesion_id) ?? [];
    lista.push(aRegistro(r));
    porSesion.set(r.gps_sesion_id, lista);
  }
  return sesiones
    .slice()
    .sort((a, b) => a.fecha.localeCompare(b.fecha))
    .map((sesion) => ({ sesion, registros: porSesion.get(sesion.id) ?? [] }));
}

/** Igual que `listarRegistrosEnRango` pero en formato plano (un registro = una fila, con su
 * fecha/turno/MD ya adentro) — la forma que usan el dashboard, la tabla y las comparativas. */
export async function listarRegistrosDetallado(
  supabase: SupabaseClient,
  desde?: string,
  hasta?: string,
): Promise<GpsRegistroConSesion[]> {
  const bloques = await listarRegistrosEnRango(supabase, desde, hasta);
  return bloques.flatMap(({ sesion, registros }) =>
    registros.map((r) => ({
      ...r,
      sesionId: sesion.id,
      fecha: sesion.fecha,
      turno: sesion.turno,
      nombreBloque: sesion.nombreBloque,
      md: sesion.md,
    })),
  );
}

export function resumenPorJugador(bloques: { registros: GpsRegistro[] }[]): GpsResumenJugador[] {
  const porNombre = new Map<string, GpsRegistro[]>();
  for (const { registros } of bloques) {
    for (const r of registros) {
      const lista = porNombre.get(r.nombre) ?? [];
      lista.push(r);
      porNombre.set(r.nombre, lista);
    }
  }
  return Array.from(porNombre.entries())
    .map(([nombre, registros]) => {
      const distancias = registros.map((r) => r.distanciaTotalM ?? 0);
      const velocidades = registros.map((r) => r.velocidadMaximaKmh ?? 0);
      const suma = (xs: number[]) => xs.reduce((a, b) => a + b, 0);
      const prom = (xs: number[]) => (xs.length > 0 ? suma(xs) / xs.length : 0);
      return {
        nombre,
        sesiones: registros.length,
        distanciaTotalM: Math.round(suma(distancias)),
        distanciaPromedioM: Math.round(prom(distancias)),
        velocidadMaximaKmh: Math.round(Math.max(0, ...velocidades) * 100) / 100,
        aceleracionesProm: Math.round(prom(registros.map((r) => r.aceleracionesCant ?? 0)) * 10) / 10,
        desaceleracionesProm: Math.round(prom(registros.map((r) => r.desaceleracionesCant ?? 0)) * 10) / 10,
      };
    })
    .sort((a, b) => b.distanciaTotalM - a.distanciaTotalM);
}

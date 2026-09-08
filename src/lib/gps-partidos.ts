import type { SupabaseClient } from "@supabase/supabase-js";
import { resolverEscudoRival } from "@/lib/rivales-escudo";
import { redondear } from "@/lib/gps-metricas";
import type { GpsRegistroConSesion } from "@/lib/gps-data";

export type PartidoGps = {
  id: string;
  fecha: string;
  rival: string;
  rivalEscudo: string | null;
  competencia: string;
  condicion: "local" | "visitante";
  golesFavor: number;
  golesContra: number;
};

/** Trae los partidos reales del período (de `partidos_va`, la planilla de base de partidos que
 * alimenta Videoanálisis — GPS no tiene su propia tabla de partidos, y no repoblamos `matches`
 * a propósito, ver docs/gps-modulo-diseno.md). La planilla tiene 2 filas de más: el mismo
 * partido cargado dos veces por una subida XML suelta antes de que existiera la sincronización
 * con la planilla. La forma de distinguir sin adivinar cuál es la "buena": las filas que sí
 * vienen de la planilla sincronizada tienen `sheet_row_id` (1 fila por partido, sin huecos);
 * las 2 sobrantes tienen `sheet_row_id = null`. Filtramos por eso, no por fecha ni por nombre. */
export async function obtenerPartidosReales(supabase: SupabaseClient): Promise<PartidoGps[]> {
  const { data: partidos } = await supabase
    .from("partidos_va")
    .select("id, fecha, rival, rival_id, competencia, condicion, goles_favor, goles_contra")
    .not("sheet_row_id", "is", null)
    .order("fecha");
  if (!partidos || partidos.length === 0) return [];

  const rivalIds = Array.from(new Set(partidos.map((p) => p.rival_id).filter((x): x is string => !!x)));
  const { data: rivales } = await supabase.from("rivales").select("id, escudo_url").in("id", rivalIds);
  const escudoPorRivalId = new Map((rivales ?? []).map((r) => [r.id, r.escudo_url as string | null]));

  return partidos.map((p) => ({
    id: p.id,
    fecha: p.fecha,
    rival: p.rival,
    rivalEscudo: resolverEscudoRival({ nombre: p.rival, escudoRivales: p.rival_id ? (escudoPorRivalId.get(p.rival_id) ?? null) : null }),
    competencia: p.competencia,
    condicion: p.condicion as "local" | "visitante",
    golesFavor: p.goles_favor,
    golesContra: p.goles_contra,
  }));
}

export type CargaPartidoJugador = {
  nombre: string;
  duracionMin: number | null;
  distanciaTotalM: number | null;
  distanciaPorMin: number | null;
  velocidadMaximaKmh: number | null;
  distAltaVelocidadM: number | null;
  distMuyAltaVelocidadM: number | null;
  sprintsCant: number | null;
  aceleracionesCant: number | null;
  desaceleracionesCant: number | null;
};

type DrillCrudo = {
  nombre?: string;
  tiempo_min?: number | null;
  distancia_m?: number | null;
  distancia_alta_velocidad_m?: number | null;
  distancia_zona6_m?: number | null;
  entradas_zona6?: number | null;
  velocidad_maxima_kmh?: number | null;
  aceleraciones?: number | null;
  desaceleraciones?: number | null;
};

type Periodo = "primer tiempo" | "segundo tiempo" | "ambos";

function esDrillDelPeriodo(nombre: string | undefined, periodo: Periodo): boolean {
  const n = (nombre ?? "").toLowerCase().replace(/\s+/g, " ").trim();
  if (periodo === "ambos") return n.startsWith("primer tiempo") || n.startsWith("segundo tiempo");
  return n.startsWith(periodo);
}

function agregarCargaPorJugador(registros: { nombre_proveedor_crudo: string | null; metricas_extra: { drills?: DrillCrudo[] } | null }[], periodo: Periodo): CargaPartidoJugador[] {
  const suma = (drills: DrillCrudo[], campo: keyof DrillCrudo, dec: number) => {
    const vals = drills.map((d) => d[campo]).filter((v): v is number => typeof v === "number");
    return vals.length > 0 ? redondear(vals.reduce((a, b) => a + b, 0), dec) : null;
  };
  const max = (drills: DrillCrudo[], campo: keyof DrillCrudo, dec: number) => {
    const vals = drills.map((d) => d[campo]).filter((v): v is number => typeof v === "number");
    return vals.length > 0 ? redondear(Math.max(...vals), dec) : null;
  };

  const resultado: CargaPartidoJugador[] = [];
  for (const r of registros) {
    const drills: DrillCrudo[] = (r.metricas_extra?.drills ?? []).filter((d) => esDrillDelPeriodo(d.nombre, periodo));
    if (drills.length === 0) continue;
    const duracionMin = suma(drills, "tiempo_min", 2);
    const distanciaTotalM = suma(drills, "distancia_m", 2);
    resultado.push({
      nombre: r.nombre_proveedor_crudo ?? "Sin nombre",
      duracionMin,
      distanciaTotalM,
      distanciaPorMin: duracionMin && distanciaTotalM ? redondear(distanciaTotalM / duracionMin, 2) : null,
      velocidadMaximaKmh: max(drills, "velocidad_maxima_kmh", 2),
      distAltaVelocidadM: suma(drills, "distancia_alta_velocidad_m", 2),
      distMuyAltaVelocidadM: suma(drills, "distancia_zona6_m", 2),
      sprintsCant: suma(drills, "entradas_zona6", 0),
      aceleracionesCant: suma(drills, "aceleraciones", 0),
      desaceleracionesCant: suma(drills, "desaceleraciones", 0),
    });
  }
  return resultado.sort((a, b) => (b.distanciaTotalM ?? 0) - (a.distanciaTotalM ?? 0));
}

/** Carga física real del partido, jugador por jugador — sacada de los drills "Primer Tiempo" /
 * "Segundo Tiempo" que trae el archivo GPS de ese día (no de un total de sesión, que en los días
 * de partido puede incluir entrada en calor u otro trabajo previo). Un jugador sin esos drills
 * ese día no jugó el partido (entrenó en cambio) y no aparece acá — no se inventa su carga. */
export async function obtenerCargaPartido(supabase: SupabaseClient, fechaPartido: string): Promise<CargaPartidoJugador[]> {
  const { data: sesiones } = await supabase.from("gps_sesiones").select("id").eq("fecha", fechaPartido);
  const idsSesion = (sesiones ?? []).map((s) => s.id);
  if (idsSesion.length === 0) return [];
  const { data: registros } = await supabase.from("gps_registros").select("nombre_proveedor_crudo, metricas_extra").in("gps_sesion_id", idsSesion);
  return agregarCargaPorJugador(registros ?? [], "ambos");
}

/** Igual que `obtenerCargaPartido`, pero separada en 1er y 2do tiempo — para comparar la carga
 * de cada período real del partido (drills "Primer Tiempo" / "Segundo Tiempo" por separado). */
export async function obtenerCargaPartidoPorPeriodo(
  supabase: SupabaseClient,
  fechaPartido: string,
): Promise<{ primerTiempo: CargaPartidoJugador[]; segundoTiempo: CargaPartidoJugador[] }> {
  const { data: sesiones } = await supabase.from("gps_sesiones").select("id").eq("fecha", fechaPartido);
  const idsSesion = (sesiones ?? []).map((s) => s.id);
  if (idsSesion.length === 0) return { primerTiempo: [], segundoTiempo: [] };
  const { data: registros } = await supabase.from("gps_registros").select("nombre_proveedor_crudo, metricas_extra").in("gps_sesion_id", idsSesion);
  return {
    primerTiempo: agregarCargaPorJugador(registros ?? [], "primer tiempo"),
    segundoTiempo: agregarCargaPorJugador(registros ?? [], "segundo tiempo"),
  };
}

/** Convierte la carga de un partido (por jugador) a la forma "registro" plana que usa el resto
 * del módulo, para poder mezclarla con entrenamientos en un mismo gráfico/tabla/comparación. */
export function cargaPartidoARegistros(partido: PartidoGps, cargaPartido: CargaPartidoJugador[]): GpsRegistroConSesion[] {
  return cargaPartido.map((j) => ({
    id: `partido-${partido.id}-${j.nombre}`,
    nombre: j.nombre,
    duracionMin: j.duracionMin,
    distanciaTotalM: j.distanciaTotalM,
    distanciaPorMin: j.distanciaPorMin,
    velocidadMaximaKmh: j.velocidadMaximaKmh,
    distAltaVelocidadM: j.distAltaVelocidadM,
    distMuyAltaVelocidadM: j.distMuyAltaVelocidadM,
    aceleracionesCant: j.aceleracionesCant,
    desaceleracionesCant: j.desaceleracionesCant,
    sprintEntradasCant: j.sprintsCant,
    hmlEsfuerzosCant: null,
    hmlDistanciaM: null,
    sesionId: `partido-${partido.id}`,
    fecha: partido.fecha,
    turno: null,
    nombreBloque: "Partido",
    md: "MD",
  }));
}

/** Carga real de todos los partidos de una lista (ya filtrada por rango/lo que corresponda),
 * como registros planos listos para mezclar con entrenamientos. Un partido sin archivo GPS
 * simplemente no aporta filas — no se inventa nada en su lugar. */
export async function obtenerCargaPartidosComoRegistros(supabase: SupabaseClient, partidos: PartidoGps[]): Promise<GpsRegistroConSesion[]> {
  const resultados = await Promise.all(
    partidos.map(async (p) => {
      const carga = await obtenerCargaPartido(supabase, p.fecha);
      return cargaPartidoARegistros(p, carga);
    }),
  );
  return resultados.flat();
}

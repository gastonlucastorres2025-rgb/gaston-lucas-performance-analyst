import type { SupabaseClient } from "@supabase/supabase-js";
import { CLUB_ACTUAL } from "@/lib/gps/club";
import {
  VARIABLES_ACWR,
  acwrActual,
  diasSinVmax90,
  hoyIso,
  type EstadoVmax,
  type Posicion,
  type VariableAcwr,
} from "@/lib/gps/calculos";
import {
  cargarCargaDiaria,
  lesionVigente,
  listarLesiones,
  listarPlantel,
  type Lesion,
} from "@/lib/gps/datos";

export type FilaPanel = {
  nombre: string;
  posicion: Posicion;
  acwr: Record<VariableAcwr, number | null>;
  vmax: EstadoVmax | null;
  lesion: Lesion | null;
};

export type Panel = {
  hoy: string;
  /** Último día con datos GPS cargados, o null si todavía no hay ninguno. */
  ultimaFecha: string | null;
  filas: FilaPanel[];
  lesiones: Lesion[];
};

/** Todo lo que necesitan el Resumen y la pestaña ACWR: una fila por jugador activo del plantel con
 * su ACWR (a hoy), su estado de velocidad máxima y su lesión vigente. Los jugadores dados de baja
 * (activo = false) no entran. */
export async function cargarPanel(supabase: SupabaseClient, club: string): Promise<Panel> {
  const [carga, lesiones] = await Promise.all([cargarCargaDiaria(supabase, club), listarLesiones(supabase, club)]);
  const plantel = await listarPlantel(supabase, carga, club);

  let ultimaFecha: string | null = null;
  for (const dias of carga.values()) {
    for (const fecha of dias.keys()) if (!ultimaFecha || fecha > ultimaFecha) ultimaFecha = fecha;
  }

  // Club actual: la referencia es hoy (los días sin sesión cuentan como carga cero). Club anterior: su
  // temporada ya cerró, así que se mide al último día con datos (si no, todo daría ACWR 0).
  const hoy = club === CLUB_ACTUAL ? hoyIso() : (ultimaFecha ?? hoyIso());

  const filas: FilaPanel[] = plantel
    .filter((j) => j.activo && carga.has(j.nombre))
    .map((j) => {
      const dias = carga.get(j.nombre)!;
      const acwr = Object.fromEntries(VARIABLES_ACWR.map((v) => [v, acwrActual(dias, v, hoy)])) as Record<VariableAcwr, number | null>;
      return { nombre: j.nombre, posicion: j.posicion, acwr, vmax: diasSinVmax90(dias, hoy), lesion: lesionVigente(lesiones, j.nombre) };
    });

  return { hoy, ultimaFecha, filas, lesiones };
}

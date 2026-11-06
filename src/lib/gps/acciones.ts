"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { COOKIE_CLUB } from "@/lib/gps/club";
import { obtenerContextoGps, type EstadoLesion } from "@/lib/gps/datos";
import { POSICIONES, hoyIso, type Posicion } from "@/lib/gps/calculos";
import { createClient } from "@/lib/supabase/server";

export type ResultadoAccion = { ok: true } | { ok: false; error: string };

const SIN_PERMISO: ResultadoAccion = { ok: false, error: "Solo el preparador físico o el admin pueden editar el módulo GPS." };

async function contextoEditor() {
  const supabase = await createClient();
  const ctx = await obtenerContextoGps(supabase);
  return { supabase, ctx: ctx?.puedeEditar ? ctx : null };
}

function refrescar() {
  revalidatePath("/gps", "layout");
}

// ---------- plantel ----------
export async function guardarJugadorGps(club: string, nombre: string, cambios: { posicion?: Posicion; activo?: boolean }): Promise<ResultadoAccion> {
  const { supabase, ctx } = await contextoEditor();
  if (!ctx) return SIN_PERMISO;
  if (cambios.posicion && cambios.posicion !== "N/D" && !POSICIONES.includes(cambios.posicion)) {
    return { ok: false, error: "Posición inválida." };
  }

  // upsert: un jugador que sale del GPS pero todavía no tiene fila se crea al asignarle algo.
  const { error } = await supabase
    .from("gps_jugadores")
    .upsert({ team_id: ctx.teamId, club, nombre, ...cambios }, { onConflict: "team_id,club,nombre" });
  if (error) return { ok: false, error: error.message };
  refrescar();
  return { ok: true };
}

// ---------- lesiones ----------
export async function crearLesion(datos: {
  club: string;
  jugador: string;
  fecha: string;
  tipo: "Molestia" | "Lesión";
  zona: string;
  estado: EstadoLesion;
  notas: string;
}): Promise<ResultadoAccion> {
  const { supabase, ctx } = await contextoEditor();
  if (!ctx) return SIN_PERMISO;
  if (!datos.jugador || !datos.fecha) return { ok: false, error: "Falta el jugador o la fecha." };

  const { error } = await supabase.from("gps_lesiones").insert({
    team_id: ctx.teamId,
    club: datos.club,
    jugador: datos.jugador,
    fecha: datos.fecha,
    tipo: datos.tipo,
    zona: datos.zona.trim(),
    estado: datos.estado,
    notas: datos.notas.trim(),
    fecha_alta: datos.estado === "Alta" ? datos.fecha : null,
  });
  if (error) return { ok: false, error: error.message };
  refrescar();
  return { ok: true };
}

export async function cambiarEstadoLesion(id: string, estado: EstadoLesion): Promise<ResultadoAccion> {
  const { supabase, ctx } = await contextoEditor();
  if (!ctx) return SIN_PERMISO;

  const { data, error } = await supabase
    .from("gps_lesiones")
    .update({ estado, fecha_alta: estado === "Alta" ? hoyIso() : null })
    .eq("id", id)
    .select("id");
  if (error) return { ok: false, error: error.message };
  if (!data?.length) return { ok: false, error: "No se pudo actualizar el registro (¿ya no existe o no tenés permiso?)." };
  refrescar();
  return { ok: true };
}

export async function eliminarLesion(id: string): Promise<ResultadoAccion> {
  const { supabase, ctx } = await contextoEditor();
  if (!ctx) return SIN_PERMISO;

  const { data, error } = await supabase.from("gps_lesiones").delete().eq("id", id).select("id");
  if (error) return { ok: false, error: error.message };
  if (!data?.length) return { ok: false, error: "No se pudo eliminar el registro (¿ya no existe o no tenés permiso?)." };
  refrescar();
  return { ok: true };
}

// ---------- club que se está mirando ----------
/** Guarda el club elegido en el selector (cookie de preferencia, sin datos sensibles). */
export async function elegirClubGps(club: string): Promise<void> {
  (await cookies()).set(COOKIE_CLUB, club, { path: "/", maxAge: 60 * 60 * 24 * 365, sameSite: "lax" });
  refrescar();
}

"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

async function getTeamId() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: staff } = await supabase.from("staff_users").select("team_id").eq("id", user.id).single();
  return staff?.team_id ?? null;
}

export type CarpetaResumen = { id: string; nombre: string; cantidadJugadores: number; updatedAt: string };

export async function listarCarpetas(): Promise<CarpetaResumen[]> {
  const supabase = await createClient();
  const { data: carpetas } = await supabase
    .from("si_carpetas")
    .select("id, nombre, updated_at, si_carpeta_jugadores(count)")
    .order("updated_at", { ascending: false });

  return (carpetas ?? []).map((c) => ({
    id: c.id,
    nombre: c.nombre,
    cantidadJugadores: c.si_carpeta_jugadores?.[0]?.count ?? 0,
    updatedAt: c.updated_at,
  }));
}

export type AccionResult = { ok: true } | { ok: false; error: string };
export type CrearCarpetaResult = { ok: true; id: string } | { ok: false; error: string };
export type AgregarJugadorResult = { ok: true; id: string } | { ok: false; error: string };

export async function crearCarpeta(nombre: string): Promise<CrearCarpetaResult> {
  const teamId = await getTeamId();
  if (!teamId) return { ok: false, error: "No autenticado." };
  const nombreLimpio = nombre.trim();
  if (!nombreLimpio) return { ok: false, error: "Ponele un nombre a la carpeta." };

  const supabase = await createClient();
  const { data, error } = await supabase.from("si_carpetas").insert({ team_id: teamId, nombre: nombreLimpio }).select("id").single();
  if (error || !data) return { ok: false, error: error?.message ?? "No se pudo crear la carpeta." };

  revalidatePath("/seguimiento-internacional/carpetas");
  return { ok: true, id: data.id };
}

export async function renombrarCarpeta(carpetaId: string, nombre: string): Promise<AccionResult> {
  const nombreLimpio = nombre.trim();
  if (!nombreLimpio) return { ok: false, error: "El nombre no puede quedar vacío." };

  const supabase = await createClient();
  const { error } = await supabase
    .from("si_carpetas")
    .update({ nombre: nombreLimpio, updated_at: new Date().toISOString() })
    .eq("id", carpetaId);
  if (error) return { ok: false, error: error.message };

  revalidatePath(`/seguimiento-internacional/carpetas/${carpetaId}`);
  revalidatePath("/seguimiento-internacional/carpetas");
  return { ok: true };
}

export async function eliminarCarpeta(carpetaId: string): Promise<AccionResult> {
  const supabase = await createClient();
  const { error } = await supabase.from("si_carpetas").delete().eq("id", carpetaId);
  if (error) return { ok: false, error: error.message };

  revalidatePath("/seguimiento-internacional/carpetas");
  return { ok: true };
}

export async function agregarJugadorACarpeta(carpetaId: string, nombreJugador: string): Promise<AgregarJugadorResult> {
  const teamId = await getTeamId();
  if (!teamId) return { ok: false, error: "No autenticado." };

  const supabase = await createClient();
  const { count } = await supabase
    .from("si_carpeta_jugadores")
    .select("id", { count: "exact", head: true })
    .eq("carpeta_id", carpetaId);

  const { data, error } = await supabase
    .from("si_carpeta_jugadores")
    .insert({
      team_id: teamId,
      carpeta_id: carpetaId,
      nombre_jugador: nombreJugador.trim() || "Jugador sin nombre",
      orden: (count ?? 0) + 1,
    })
    .select("id")
    .single();
  if (error || !data) return { ok: false, error: error?.message ?? "No se pudo agregar el jugador." };

  await supabase.from("si_carpetas").update({ updated_at: new Date().toISOString() }).eq("id", carpetaId);
  revalidatePath(`/seguimiento-internacional/carpetas/${carpetaId}`);
  revalidatePath("/seguimiento-internacional/carpetas");
  return { ok: true, id: data.id };
}

export async function actualizarJugadorDeCarpeta(
  jugadorId: string,
  carpetaId: string,
  campos: { nombreJugador?: string; notas?: string },
): Promise<AccionResult> {
  const update: Record<string, string> = { updated_at: new Date().toISOString() };
  if (campos.nombreJugador !== undefined) update.nombre_jugador = campos.nombreJugador.trim() || "Jugador sin nombre";
  if (campos.notas !== undefined) update.notas = campos.notas;

  const supabase = await createClient();
  const { error } = await supabase.from("si_carpeta_jugadores").update(update).eq("id", jugadorId);
  if (error) return { ok: false, error: error.message };

  revalidatePath(`/seguimiento-internacional/carpetas/${carpetaId}`);
  return { ok: true };
}

export async function eliminarJugadorDeCarpeta(jugadorId: string, carpetaId: string): Promise<AccionResult> {
  const supabase = await createClient();
  const { error } = await supabase.from("si_carpeta_jugadores").delete().eq("id", jugadorId);
  if (error) return { ok: false, error: error.message };

  revalidatePath(`/seguimiento-internacional/carpetas/${carpetaId}`);
  revalidatePath("/seguimiento-internacional/carpetas");
  return { ok: true };
}

/**
 * Reemplaza la lista completa de links del jugador — el cliente ya tiene el array actual en memoria
 * (viene mostrándolo en pantalla), así que manda el array final directo y acá se escribe tal cual, en
 * un solo update. (Antes esto hacía un select + update en dos pasos, que era un punto de falla extra sin
 * necesidad real; con esto alcanza y es el mismo patrón simple que ya usa actualizarJugadorDeCarpeta.)
 */
export async function actualizarLinksDeJugador(jugadorId: string, carpetaId: string, videoLinks: string[]): Promise<AccionResult> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("si_carpeta_jugadores")
    .update({ video_links: videoLinks, updated_at: new Date().toISOString() })
    .eq("id", jugadorId);
  if (error) return { ok: false, error: error.message };

  revalidatePath(`/seguimiento-internacional/carpetas/${carpetaId}`);
  return { ok: true };
}

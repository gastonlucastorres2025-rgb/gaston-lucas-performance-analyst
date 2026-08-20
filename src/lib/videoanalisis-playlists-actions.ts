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

export type PlaylistResumen = { id: string; nombre: string; cantidadCortes: number; updatedAt: string };

export async function listarPlaylists(): Promise<PlaylistResumen[]> {
  const supabase = await createClient();
  const { data: playlists } = await supabase
    .from("va_playlists")
    .select("id, nombre, updated_at, va_playlist_items(count)")
    .order("updated_at", { ascending: false });

  return (playlists ?? []).map((p) => ({
    id: p.id,
    nombre: p.nombre,
    cantidadCortes: p.va_playlist_items?.[0]?.count ?? 0,
    updatedAt: p.updated_at,
  }));
}

export type CrearPlaylistResult = { ok: true; id: string } | { ok: false; error: string };

export async function crearPlaylist(nombre: string): Promise<CrearPlaylistResult> {
  const teamId = await getTeamId();
  if (!teamId) return { ok: false, error: "No autenticado." };
  const nombreLimpio = nombre.trim();
  if (!nombreLimpio) return { ok: false, error: "Ponele un nombre a la playlist." };

  const supabase = await createClient();
  const { data, error } = await supabase.from("va_playlists").insert({ team_id: teamId, nombre: nombreLimpio }).select("id").single();
  if (error || !data) return { ok: false, error: error?.message ?? "No se pudo crear la playlist." };

  revalidatePath("/videoanalisis/playlists");
  return { ok: true, id: data.id };
}

export type AgregarCorteResult = { ok: true } | { ok: false; error: string };

export async function agregarCorteAPlaylist(playlistId: string, accionId: string): Promise<AgregarCorteResult> {
  const teamId = await getTeamId();
  if (!teamId) return { ok: false, error: "No autenticado." };

  const supabase = await createClient();
  const { count } = await supabase
    .from("va_playlist_items")
    .select("id", { count: "exact", head: true })
    .eq("playlist_id", playlistId);

  const { error } = await supabase.from("va_playlist_items").insert({
    team_id: teamId,
    playlist_id: playlistId,
    accion_id: accionId,
    orden: (count ?? 0) + 1,
  });
  // Código 23505 = unique_violation (el corte ya estaba en esta playlist) — no es un error real para el usuario.
  if (error && error.code !== "23505") return { ok: false, error: error.message };

  await supabase.from("va_playlists").update({ updated_at: new Date().toISOString() }).eq("id", playlistId);
  revalidatePath("/videoanalisis/playlists");
  revalidatePath(`/videoanalisis/playlists/${playlistId}`);
  return { ok: true };
}

export async function crearPlaylistYAgregarCorte(nombre: string, accionId: string): Promise<CrearPlaylistResult> {
  const creada = await crearPlaylist(nombre);
  if (!creada.ok) return creada;
  const agregado = await agregarCorteAPlaylist(creada.id, accionId);
  if (!agregado.ok) return { ok: false, error: agregado.error };
  return creada;
}

export async function quitarCorteDePlaylist(playlistId: string, itemId: string): Promise<AgregarCorteResult> {
  const teamId = await getTeamId();
  if (!teamId) return { ok: false, error: "No autenticado." };

  const supabase = await createClient();
  const { error } = await supabase.from("va_playlist_items").delete().eq("id", itemId);
  if (error) return { ok: false, error: error.message };

  revalidatePath(`/videoanalisis/playlists/${playlistId}`);
  revalidatePath("/videoanalisis/playlists");
  return { ok: true };
}

export async function renombrarPlaylist(playlistId: string, nombre: string): Promise<AgregarCorteResult> {
  const nombreLimpio = nombre.trim();
  if (!nombreLimpio) return { ok: false, error: "El nombre no puede quedar vacío." };

  const supabase = await createClient();
  const { error } = await supabase
    .from("va_playlists")
    .update({ nombre: nombreLimpio, updated_at: new Date().toISOString() })
    .eq("id", playlistId);
  if (error) return { ok: false, error: error.message };

  revalidatePath(`/videoanalisis/playlists/${playlistId}`);
  revalidatePath("/videoanalisis/playlists");
  return { ok: true };
}

export async function eliminarPlaylist(playlistId: string): Promise<AgregarCorteResult> {
  const supabase = await createClient();
  const { error } = await supabase.from("va_playlists").delete().eq("id", playlistId);
  if (error) return { ok: false, error: error.message };

  revalidatePath("/videoanalisis/playlists");
  return { ok: true };
}

"use server";

import { revalidatePath } from "next/cache";
import { resolverVideo } from "@/lib/biblioteca/carpeta";
import { createClient } from "@/lib/supabase/server";

export type ResultadoBiblioteca = { ok: true } | { ok: false; error: string };

/** Guarda título, etiquetas y notas de un video. Solo acepta archivos que existan en una carpeta de la
 * biblioteca (no se pueden crear registros sueltos). La autorización de escritura es la RLS. */
export async function guardarVideoBiblioteca(carpeta: string, archivo: string, datos: { titulo: string; etiquetas: string[]; notas: string }): Promise<ResultadoBiblioteca> {
  if (!resolverVideo(carpeta, archivo)) return { ok: false, error: "Ese video no está en la biblioteca." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Sesión vencida: volvé a ingresar." };
  const { data: staff } = await supabase.from("staff_users").select("team_id").eq("id", user.id).single();
  if (!staff) return { ok: false, error: "No se encontró tu equipo." };

  const etiquetas = Array.from(new Set(datos.etiquetas.map((e) => e.trim()).filter(Boolean).map((e) => e.slice(0, 40)))).slice(0, 20);
  const { error } = await supabase.from("biblioteca_videos").upsert(
    { team_id: staff.team_id, carpeta, archivo, titulo: datos.titulo.trim().slice(0, 200), etiquetas, notas: datos.notas.trim().slice(0, 4000), updated_at: new Date().toISOString() },
    { onConflict: "team_id,carpeta,archivo" },
  );
  if (error) return { ok: false, error: error.message };
  revalidatePath("/biblioteca", "layout");
  return { ok: true };
}

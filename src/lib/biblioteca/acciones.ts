"use server";

import { existsSync, renameSync } from "node:fs";
import os from "node:os";
import path from "node:path";
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

/** Usuario con permiso de edición (no solo-lectura). A diferencia de los datos del video, tocar
 * archivos de la computadora no pasa por la RLS: el permiso se verifica acá antes de cualquier cambio. */
async function exigirEdicion() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Sesión vencida: volvé a ingresar." } as const;
  const { data: staff } = await supabase.from("staff_users").select("team_id, solo_lectura").eq("id", user.id).single();
  if (!staff) return { ok: false, error: "No se encontró tu equipo." } as const;
  if (staff.solo_lectura) return { ok: false, error: "Tu usuario es de solo lectura: no puede renombrar ni eliminar videos." } as const;
  return { ok: true, supabase, teamId: staff.team_id as string } as const;
}

/** Renombra el archivo real en la carpeta de la computadora (se conserva la extensión) y mueve con
 * él su título, etiquetas y notas. No pisa nunca un archivo existente. */
export async function renombrarVideoBiblioteca(carpeta: string, archivo: string, nuevoNombre: string): Promise<{ ok: true; archivo: string } | { ok: false; error: string }> {
  const origen = resolverVideo(carpeta, archivo);
  if (!origen) return { ok: false, error: "Ese video no está en la biblioteca." };
  const permiso = await exigirEdicion();
  if (!permiso.ok) return { ok: false, error: permiso.error };

  const extension = path.extname(archivo);
  let base = nuevoNombre.normalize("NFC").trim();
  if (base.toLowerCase().endsWith(extension.toLowerCase())) base = base.slice(0, -extension.length).trim();
  if (!base) return { ok: false, error: "Escribí un nombre." };
  if (/[\/:\0]/.test(base) || base.startsWith(".")) return { ok: false, error: "El nombre no puede tener / : ni empezar con punto." };
  if (base.length > 180) return { ok: false, error: "El nombre es demasiado largo." };
  const nuevo = base + extension;
  if (nuevo === archivo) return { ok: true, archivo };

  const destino = path.join(path.dirname(origen), nuevo);
  // En macOS "A.mp4" y "a.mp4" son el mismo archivo: eso sí se permite (cambiar mayúsculas).
  if (nuevo.toLowerCase() !== archivo.toLowerCase() && existsSync(destino)) return { ok: false, error: "Ya hay un video con ese nombre en la carpeta." };
  try {
    renameSync(origen, destino);
  } catch (e) {
    return { ok: false, error: `No se pudo renombrar: ${e instanceof Error ? e.message : "error desconocido"}` };
  }

  // Título/etiquetas/notas viajan con el archivo. Un registro viejo con el nombre nuevo se descarta.
  const { supabase, teamId } = permiso;
  await supabase.from("biblioteca_videos").delete().match({ team_id: teamId, carpeta, archivo: nuevo });
  const { error } = await supabase.from("biblioteca_videos").update({ archivo: nuevo, updated_at: new Date().toISOString() }).match({ team_id: teamId, carpeta, archivo });
  revalidatePath("/biblioteca", "layout");
  if (error) return { ok: false, error: `El archivo se renombró, pero no se pudieron mover sus datos: ${error.message}` };
  return { ok: true, archivo: nuevo };
}

/** Manda el video a la Papelera de la Mac (no lo borra para siempre: se recupera desde ahí) y
 * borra sus datos de la biblioteca. */
export async function eliminarVideoBiblioteca(carpeta: string, archivo: string): Promise<ResultadoBiblioteca> {
  const origen = resolverVideo(carpeta, archivo);
  if (!origen) return { ok: false, error: "Ese video no está en la biblioteca." };
  const permiso = await exigirEdicion();
  if (!permiso.ok) return { ok: false, error: permiso.error };

  const papelera = path.join(os.homedir(), ".Trash");
  let destino = path.join(papelera, archivo);
  if (existsSync(destino)) {
    const ext = path.extname(archivo);
    destino = path.join(papelera, `${path.basename(archivo, ext)} ${new Date().toISOString().replace(/[:.]/g, "-")}${ext}`);
  }
  try {
    renameSync(origen, destino);
  } catch (e) {
    return { ok: false, error: `No se pudo mover a la Papelera: ${e instanceof Error ? e.message : "error desconocido"}` };
  }

  const { supabase, teamId } = permiso;
  await supabase.from("biblioteca_videos").delete().match({ team_id: teamId, carpeta, archivo });
  revalidatePath("/biblioteca", "layout");
  return { ok: true };
}

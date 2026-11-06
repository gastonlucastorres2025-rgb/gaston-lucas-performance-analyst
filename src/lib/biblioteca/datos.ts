import type { SupabaseClient } from "@supabase/supabase-js";

export type MetaVideo = { titulo: string; etiquetas: string[]; notas: string };

const TAMANO_PAGINA = 1000;

export const claveVideo = (carpeta: string, archivo: string) => `${carpeta}\u0000${archivo}`;

/** Título / etiquetas / notas guardados, por (carpeta, archivo): usar `claveVideo`. */
export async function listarMetadata(supabase: SupabaseClient): Promise<Map<string, MetaVideo>> {
  const mapa = new Map<string, MetaVideo>();
  for (let desde = 0; ; desde += TAMANO_PAGINA) {
    const { data, error } = await supabase
      .from("biblioteca_videos")
      .select("carpeta, archivo, titulo, etiquetas, notas")
      .order("id")
      .range(desde, desde + TAMANO_PAGINA - 1);
    if (error) throw new Error(`No se pudo leer la biblioteca: ${error.message}`);
    for (const f of data ?? []) mapa.set(claveVideo(f.carpeta, f.archivo), { titulo: f.titulo, etiquetas: f.etiquetas ?? [], notas: f.notas });
    if ((data?.length ?? 0) < TAMANO_PAGINA) break;
  }
  return mapa;
}

/** Solo decide qué mostrar (formulario de edición); la autorización real la hace la RLS. */
export async function puedeEditarBiblioteca(supabase: SupabaseClient): Promise<boolean> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return false;
  const { data } = await supabase.from("staff_users").select("solo_lectura").eq("id", user.id).single();
  return data ? !data.solo_lectura : false;
}

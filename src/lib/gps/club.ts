import { cookies } from "next/headers";
import type { SupabaseClient } from "@supabase/supabase-js";

/** Club actual del cuerpo técnico: es el club de los datos que llegan por la carga automática y el
 * que se muestra por defecto. Los clubes anteriores (ej. Nacional) se ven con el selector. */
export const CLUB_ACTUAL = "Junior";

export const COOKIE_CLUB = "gps_club";

const TAMANO_PAGINA = 1000;

/** Clubes con datos GPS (más el actual, aunque todavía no tenga datos), el actual primero. */
export async function listarClubes(supabase: SupabaseClient): Promise<string[]> {
  const clubes = new Set<string>([CLUB_ACTUAL]);
  for (let desde = 0; ; desde += TAMANO_PAGINA) {
    const { data, error } = await supabase.from("gps_sesiones").select("club").order("id").range(desde, desde + TAMANO_PAGINA - 1);
    if (error) throw new Error(`No se pudieron leer los clubes GPS: ${error.message}`);
    for (const f of data ?? []) clubes.add(f.club as string);
    if ((data?.length ?? 0) < TAMANO_PAGINA) break;
  }
  return [CLUB_ACTUAL, ...Array.from(clubes).filter((c) => c !== CLUB_ACTUAL).sort((a, b) => a.localeCompare(b))];
}

/** Club que se está mirando: el elegido en el selector (cookie) si sigue existiendo; si no, el
 * actual — salvo que el actual no tenga ningún dato y haya otro club con datos, en cuyo caso se
 * muestra el club con la sesión más reciente (así la pantalla nunca queda vacía sin motivo). */
export async function obtenerClubActivo(supabase: SupabaseClient, clubes?: string[]): Promise<string> {
  const disponibles = clubes ?? (await listarClubes(supabase));
  const elegido = (await cookies()).get(COOKIE_CLUB)?.value;
  if (elegido && disponibles.includes(elegido)) return elegido;

  const { data: actual } = await supabase.from("gps_sesiones").select("id").eq("club", CLUB_ACTUAL).limit(1);
  if (actual?.length) return CLUB_ACTUAL;
  const { data: reciente } = await supabase.from("gps_sesiones").select("club").order("fecha", { ascending: false }).limit(1);
  return (reciente?.[0]?.club as string | undefined) ?? CLUB_ACTUAL;
}

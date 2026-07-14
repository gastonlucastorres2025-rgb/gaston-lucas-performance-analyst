import type { SupabaseClient } from "@supabase/supabase-js";
import { escudoClubUruguayo } from "@/lib/uruguay-clubs";

export async function buscarOCrearRival(
  supabase: SupabaseClient,
  teamId: string,
  nombreCrudo: string,
): Promise<string | null> {
  const nombre = nombreCrudo.trim();
  if (!nombre) return null;

  const { data: existente } = await supabase
    .from("rivales")
    .select("id")
    .eq("team_id", teamId)
    .ilike("nombre", nombre)
    .maybeSingle();
  if (existente) return existente.id;

  const { data: creado, error } = await supabase
    .from("rivales")
    .insert({ team_id: teamId, nombre, escudo_url: escudoClubUruguayo(nombre) })
    .select("id")
    .single();
  if (error || !creado) return null;
  return creado.id;
}

"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { analisisRivalVacio, type AnalisisRivalData } from "@/lib/analisis-rival-types";
import { buscarOCrearRival } from "@/lib/rivales";
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

export async function crearAnalisisRival(): Promise<void> {
  const teamId = await getTeamId();
  if (!teamId) return;

  const vacio = analisisRivalVacio();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("analisis_rival")
    .insert({
      team_id: teamId,
      rival: vacio.rival,
      fecha: vacio.fecha,
      cancha: vacio.cancha,
      tipo_partido: vacio.tipo_partido,
      analista: vacio.analista,
      partidos_analizados: vacio.partidos_analizados,
      fuentes_globales: vacio.fuentes_globales,
      estructura_base: vacio.estructura_base,
      fase_ofensiva: vacio.fase_ofensiva,
      transiciones_ofensivas: vacio.transiciones_ofensivas,
      transiciones_defensivas: vacio.transiciones_defensivas,
      presion_zona3: vacio.presion_zona3,
      zona21: vacio.zona21,
      patrones: vacio.patrones,
      abp_ofensivas: vacio.abp_ofensivas,
      abp_defensivas: vacio.abp_defensivas,
      claves: vacio.claves,
    })
    .select("id")
    .single();

  if (error || !data) return;

  revalidatePath("/analisis-rival");
  redirect(`/analisis-rival/${data.id}`);
}

export async function guardarAnalisisRival(id: string, plan: AnalisisRivalData) {
  const teamId = await getTeamId();
  if (!teamId) return { error: "No autenticado." };

  const supabase = await createClient();
  const rivalId = await buscarOCrearRival(supabase, teamId, plan.rival);
  const { error } = await supabase
    .from("analisis_rival")
    .update({
      rival: plan.rival,
      rival_id: rivalId,
      fecha: plan.fecha,
      cancha: plan.cancha,
      tipo_partido: plan.tipo_partido,
      analista: plan.analista,
      partidos_analizados: plan.partidos_analizados,
      fuentes_globales: plan.fuentes_globales,
      estructura_base: plan.estructura_base,
      fase_ofensiva: plan.fase_ofensiva,
      transiciones_ofensivas: plan.transiciones_ofensivas,
      transiciones_defensivas: plan.transiciones_defensivas,
      presion_zona3: plan.presion_zona3,
      zona21: plan.zona21,
      patrones: plan.patrones,
      abp_ofensivas: plan.abp_ofensivas,
      abp_defensivas: plan.abp_defensivas,
      claves: plan.claves,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);

  if (error) return { error: error.message };

  revalidatePath(`/analisis-rival/${id}`);
  revalidatePath("/analisis-rival");
  return { error: null };
}

export async function eliminarAnalisisRival(id: string) {
  const supabase = await createClient();
  await supabase.from("analisis_rival").delete().eq("id", id);
  revalidatePath("/analisis-rival");
}

"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { informePostPartidoVacio, type InformePostPartidoData } from "@/lib/informes-post-partido-types";
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

export async function crearInformePostPartido(): Promise<void> {
  const teamId = await getTeamId();
  if (!teamId) return;

  const vacio = informePostPartidoVacio();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("informes_post_partido")
    .insert({
      team_id: teamId,
      rival: vacio.rival,
      fecha: vacio.fecha,
      resultado: vacio.resultado,
      competencia: vacio.competencia,
      plan_funciono: vacio.plan_funciono,
      plan_comentario: vacio.plan_comentario,
      analisis_acertado: vacio.analisis_acertado,
      analisis_comentario: vacio.analisis_comentario,
      conclusiones_generales: vacio.conclusiones_generales,
    })
    .select("id")
    .single();

  if (error || !data) return;

  revalidatePath("/informes-post-partido");
  redirect(`/informes-post-partido/${data.id}`);
}

export async function guardarInformePostPartido(id: string, informe: InformePostPartidoData) {
  const teamId = await getTeamId();
  if (!teamId) return { error: "No autenticado." };

  const supabase = await createClient();
  const rivalId = await buscarOCrearRival(supabase, teamId, informe.rival);
  const { error } = await supabase
    .from("informes_post_partido")
    .update({
      rival: informe.rival,
      rival_id: rivalId,
      fecha: informe.fecha,
      resultado: informe.resultado,
      competencia: informe.competencia,
      plan_funciono: informe.plan_funciono,
      plan_comentario: informe.plan_comentario,
      analisis_acertado: informe.analisis_acertado,
      analisis_comentario: informe.analisis_comentario,
      conclusiones_generales: informe.conclusiones_generales,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);

  if (error) return { error: error.message };

  revalidatePath(`/informes-post-partido/${id}`);
  revalidatePath("/informes-post-partido");
  return { error: null };
}

export async function eliminarInformePostPartido(id: string) {
  const supabase = await createClient();
  await supabase.from("informes_post_partido").delete().eq("id", id);
  revalidatePath("/informes-post-partido");
}

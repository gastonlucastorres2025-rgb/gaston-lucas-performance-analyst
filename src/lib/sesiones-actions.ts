"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type EstadoJugador = "habilitado" | "recuperacion" | "reduccion";
export type Equipo = { nombre: string; jugadores: string[] };

export type SesionPlanInput = {
  lugar: string;
  activacion: string;
  introductorio: string;
  principal: string;
  objetivos_tarea: string;
  objetivos_fisicos: string;
};

async function getTeamId() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: staff } = await supabase
    .from("staff_users")
    .select("team_id")
    .eq("id", user.id)
    .single();
  return staff?.team_id ?? null;
}

export async function guardarPlanSesion(fecha: string, plan: SesionPlanInput) {
  const supabase = await createClient();
  const teamId = await getTeamId();
  if (!teamId) return { error: "No autenticado." };

  const { error } = await supabase
    .from("sesiones")
    .upsert(
      { team_id: teamId, fecha, ...plan, updated_at: new Date().toISOString() },
      { onConflict: "team_id,fecha" },
    );

  if (error) return { error: error.message };
  revalidatePath(`/planificacion/${fecha}`);
  return { error: null };
}

export async function guardarJugadoresEstado(
  fecha: string,
  jugadoresEstado: Record<string, EstadoJugador>,
) {
  const supabase = await createClient();
  const teamId = await getTeamId();
  if (!teamId) return { error: "No autenticado." };

  const { error } = await supabase.from("sesiones").upsert(
    {
      team_id: teamId,
      fecha,
      jugadores_estado: jugadoresEstado,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "team_id,fecha" },
  );

  if (error) return { error: error.message };
  revalidatePath(`/planificacion/${fecha}`);
  return { error: null };
}

export async function guardarEquipos(fecha: string, equipos: Equipo[]) {
  const supabase = await createClient();
  const teamId = await getTeamId();
  if (!teamId) return { error: "No autenticado." };

  const { error } = await supabase.from("sesiones").upsert(
    { team_id: teamId, fecha, equipos, updated_at: new Date().toISOString() },
    { onConflict: "team_id,fecha" },
  );

  if (error) return { error: error.message };
  revalidatePath(`/planificacion/${fecha}`);
  return { error: null };
}

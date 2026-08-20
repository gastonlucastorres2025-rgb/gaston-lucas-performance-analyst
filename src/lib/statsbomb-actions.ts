"use server";

import { buildOpponentReportData, type OpponentReportData } from "@/lib/statsbomb/report-data";
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

export type GenerarInformeResult = { ok: true; data: OpponentReportData } | { ok: false; error: string };

export async function generarInformeRival(rivalNombre: string): Promise<GenerarInformeResult> {
  const teamId = await getTeamId();
  if (!teamId) return { ok: false, error: "No se pudo identificar el equipo del usuario." };

  let data: OpponentReportData;
  try {
    data = await buildOpponentReportData(rivalNombre);
  } catch (e) {
    // Mensaje seguro: nunca reenviar el error crudo (podría filtrar detalles de la API) al cliente.
    const msg = e instanceof Error ? e.message : "Error desconocido generando el informe.";
    return { ok: false, error: msg };
  }

  const supabase = await createClient();
  await supabase.from("opponent_reports").insert({
    team_id: teamId,
    rival: data.rival.nombre,
    rival_statsbomb_team_id: data.rival.statsbombTeamId,
    estado: "completed",
    contenido: data,
    partidos_analizados: data.muestraRival,
  });

  return { ok: true, data };
}

"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export type EstadoJugador = "habilitado" | "recuperacion" | "reduccion";
export type Equipo = { nombre: string; jugadores: string[] };
export type CampoImagen = "activacion" | "introductorio" | "principal";

const COLUMNA_IMAGEN: Record<CampoImagen, string> = {
  activacion: "activacion_imagen_url",
  introductorio: "introductorio_imagen_url",
  principal: "principal_imagen_url",
};

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

export async function subirImagenPlan(fecha: string, campo: CampoImagen, formData: FormData) {
  const supabase = await createClient();
  const teamId = await getTeamId();
  if (!teamId) return { url: null, error: "No autenticado." };

  const file = formData.get("file") as File | null;
  if (!file || file.size === 0) return { url: null, error: "Elegí una imagen." };
  if (!file.type.startsWith("image/")) return { url: null, error: "El archivo debe ser una imagen." };

  const admin = createAdminClient();
  const ext = file.name.split(".").pop() || "png";
  const path = `${teamId}/${fecha}-${campo}-${Date.now()}.${ext}`;
  const bytes = Buffer.from(await file.arrayBuffer());

  const { error: uploadError } = await admin.storage.from("sesion-imagenes").upload(path, bytes, {
    contentType: file.type,
  });
  if (uploadError) return { url: null, error: `No se pudo subir la imagen: ${uploadError.message}` };

  const {
    data: { publicUrl },
  } = admin.storage.from("sesion-imagenes").getPublicUrl(path);

  const { error } = await supabase.from("sesiones").upsert(
    { team_id: teamId, fecha, [COLUMNA_IMAGEN[campo]]: publicUrl, updated_at: new Date().toISOString() },
    { onConflict: "team_id,fecha" },
  );
  if (error) return { url: null, error: error.message };

  revalidatePath(`/planificacion/${fecha}`);
  return { url: publicUrl, error: null };
}

export async function eliminarImagenPlan(fecha: string, campo: CampoImagen, url: string) {
  const supabase = await createClient();
  const teamId = await getTeamId();
  if (!teamId) return { error: "No autenticado." };

  const admin = createAdminClient();
  const path = url.split("/storage/v1/object/public/sesion-imagenes/")[1];
  if (path) {
    await admin.storage.from("sesion-imagenes").remove([decodeURIComponent(path)]);
  }

  const { error } = await supabase.from("sesiones").upsert(
    { team_id: teamId, fecha, [COLUMNA_IMAGEN[campo]]: null, updated_at: new Date().toISOString() },
    { onConflict: "team_id,fecha" },
  );
  if (error) return { error: error.message };

  revalidatePath(`/planificacion/${fecha}`);
  return { error: null };
}

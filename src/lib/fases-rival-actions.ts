"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import {
  extraerFolderIdDeUrl,
  fetchArchivosDeCarpeta,
  fetchCarpeta,
  fetchNombreCarpeta,
  parsearNombreCarpetaRival,
} from "@/lib/google-drive";
import { buscarOCrearRival } from "@/lib/rivales";
import { createClient } from "@/lib/supabase/server";

export type CrearFasesRivalState = { error: string | null };

async function getTeamId() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: staff } = await supabase.from("staff_users").select("team_id").eq("id", user.id).single();
  return staff?.team_id ?? null;
}

async function leerCarpetaDrive(carpetaId: string) {
  const carpeta = await fetchCarpeta(carpetaId);
  const { rival, ronda } = parsearNombreCarpetaRival(carpeta.nombre);
  const competencia = carpeta.parentId ? await fetchNombreCarpeta(carpeta.parentId).catch(() => "") : "";
  const archivos = await fetchArchivosDeCarpeta(carpetaId);
  const fases = archivos
    .filter((a) => a.mimeType?.startsWith("video/"))
    .map((a) => ({ nombre: a.name.replace(/\.[^/.]+$/, ""), link: a.webViewLink }));

  return { rival, ronda, competencia, fases };
}

export async function crearFasesRival(
  _prevState: CrearFasesRivalState,
  formData: FormData,
): Promise<CrearFasesRivalState> {
  const teamId = await getTeamId();
  if (!teamId) return { error: "No autenticado." };

  const carpetaUrl = (formData.get("carpeta_url") as string)?.trim();
  if (!carpetaUrl) return { error: "Pegá el link de la carpeta de Drive." };

  const carpetaId = extraerFolderIdDeUrl(carpetaUrl);
  if (!carpetaId) return { error: "No pude reconocer ese link como una carpeta de Drive." };

  let datos: Awaited<ReturnType<typeof leerCarpetaDrive>>;
  try {
    datos = await leerCarpetaDrive(carpetaId);
  } catch (e) {
    return {
      error: `No se pudo leer la carpeta de Drive: ${(e as Error).message}. Verificá que esté compartida con ${process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL}.`,
    };
  }

  if (datos.fases.length === 0) return { error: "Esa carpeta no tiene videos adentro." };

  const supabase = await createClient();
  const rivalId = await buscarOCrearRival(supabase, teamId, datos.rival);
  const { data, error } = await supabase
    .from("fases_rival")
    .insert({
      team_id: teamId,
      carpeta_url: carpetaUrl,
      carpeta_id: carpetaId,
      rival: datos.rival,
      rival_id: rivalId,
      ronda: datos.ronda,
      competencia: datos.competencia,
      fases: datos.fases,
    })
    .select("id")
    .single();

  if (error || !data) return { error: error?.message ?? "No se pudo guardar." };

  revalidatePath("/fases-rival");
  redirect(`/fases-rival/${data.id}`);
}

export async function actualizarFasesRival(id: string) {
  const supabase = await createClient();
  const { data: fila } = await supabase.from("fases_rival").select("carpeta_id, team_id").eq("id", id).maybeSingle();
  if (!fila) return { error: "No se encontró el registro." };

  let datos: Awaited<ReturnType<typeof leerCarpetaDrive>>;
  try {
    datos = await leerCarpetaDrive(fila.carpeta_id);
  } catch (e) {
    return { error: `No se pudo releer la carpeta de Drive: ${(e as Error).message}` };
  }

  const rivalId = await buscarOCrearRival(supabase, fila.team_id, datos.rival);
  const { error } = await supabase
    .from("fases_rival")
    .update({
      rival: datos.rival,
      rival_id: rivalId,
      ronda: datos.ronda,
      competencia: datos.competencia,
      fases: datos.fases,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);

  if (error) return { error: error.message };

  revalidatePath(`/fases-rival/${id}`);
  revalidatePath("/fases-rival");
  return { error: null };
}

export async function eliminarFasesRival(id: string) {
  const supabase = await createClient();
  await supabase.from("fases_rival").delete().eq("id", id);
  revalidatePath("/fases-rival");
}

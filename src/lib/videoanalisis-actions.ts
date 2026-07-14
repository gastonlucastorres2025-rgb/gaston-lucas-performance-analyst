"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { decodificarXml, parsearXmlNacsport } from "@/lib/videoanalisis/xml-parser";
import { extraerYoutubeId } from "@/lib/videoanalisis/youtube";
import { buscarOCrearRival } from "@/lib/rivales";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export type CrearPartidoVAState = { error: string | null };

async function getTeamId() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: staff } = await supabase.from("staff_users").select("team_id").eq("id", user.id).single();
  return staff?.team_id ?? null;
}

async function guardarLogoCompetencia(teamId: string, nombre: string, file: File): Promise<string | null> {
  if (!file.type.startsWith("image/")) return null;

  const admin = createAdminClient();
  const ext = file.name.split(".").pop() || "png";
  const path = `${teamId}/${nombre.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${Date.now()}.${ext}`;
  const bytes = Buffer.from(await file.arrayBuffer());

  const { error: uploadError } = await admin.storage.from("videoanalisis-logos").upload(path, bytes, {
    contentType: file.type,
  });
  if (uploadError) return null;

  const {
    data: { publicUrl },
  } = admin.storage.from("videoanalisis-logos").getPublicUrl(path);

  await admin.from("va_competencia_logos").upsert(
    { team_id: teamId, nombre, logo_url: publicUrl },
    { onConflict: "team_id,nombre" },
  );

  return publicUrl;
}

export async function crearPartidoVA(
  _prevState: CrearPartidoVAState,
  formData: FormData,
): Promise<CrearPartidoVAState> {
  const teamId = await getTeamId();
  if (!teamId) return { error: "No autenticado." };

  const fecha = formData.get("fecha") as string;
  const rivalSeleccionado = (formData.get("rival") as string)?.trim();
  const rivalOtro = (formData.get("rival_otro") as string)?.trim();
  const rival = rivalSeleccionado === "__otro__" ? rivalOtro : rivalSeleccionado;
  const competencia = (formData.get("competencia") as string)?.trim() || null;
  const competenciaLogoFile = formData.get("competencia_logo") as File | null;
  const categoria = (formData.get("categoria") as string)?.trim() || null;
  const condicion = (formData.get("condicion") as string) || null;
  const golesFavorRaw = formData.get("goles_favor") as string;
  const golesContraRaw = formData.get("goles_contra") as string;
  const youtubeInput = (formData.get("youtube") as string)?.trim();
  const xmlFile = formData.get("xml") as File | null;

  if (!fecha || !rival) return { error: "Completá al menos la fecha y el rival." };

  if (competencia && competenciaLogoFile && competenciaLogoFile.size > 0) {
    await guardarLogoCompetencia(teamId, competencia, competenciaLogoFile);
  }

  const youtubeId = youtubeInput ? extraerYoutubeId(youtubeInput) : null;
  if (!youtubeId) return { error: "El link de YouTube no parece válido." };

  if (!xmlFile || xmlFile.size === 0) return { error: "Subí el XML exportado del partido." };

  let xmlTexto: string;
  try {
    xmlTexto = decodificarXml(await xmlFile.arrayBuffer());
  } catch {
    return { error: "No se pudo leer el archivo XML." };
  }

  let parseado: ReturnType<typeof parsearXmlNacsport>;
  try {
    parseado = parsearXmlNacsport(xmlTexto);
  } catch (e) {
    return { error: `No se pudo interpretar el XML: ${(e as Error).message}` };
  }

  const admin = createAdminClient();
  const xmlPath = `${teamId}/${Date.now()}-${xmlFile.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
  const { error: uploadError } = await admin.storage.from("videoanalisis-xml").upload(xmlPath, xmlTexto, {
    contentType: "text/xml",
  });
  if (uploadError) return { error: `No se pudo guardar el XML: ${uploadError.message}` };

  const supabase = await createClient();
  const rivalId = await buscarOCrearRival(supabase, teamId, rival);
  const { data: partido, error: insertError } = await supabase
    .from("partidos_va")
    .insert({
      team_id: teamId,
      fecha,
      rival,
      rival_id: rivalId,
      competencia,
      categoria,
      condicion,
      goles_favor: golesFavorRaw ? Number(golesFavorRaw) : null,
      goles_contra: golesContraRaw ? Number(golesContraRaw) : null,
      youtube_video_id: youtubeId,
      xml_storage_path: xmlPath,
      xml_procesado_en: new Date().toISOString(),
    })
    .select("id")
    .single();

  if (insertError || !partido) {
    return { error: `No se pudo crear el partido: ${insertError?.message}` };
  }

  const { error: categoriasError } = await supabase.from("va_categorias").insert(
    parseado.categorias.map((c) => ({
      team_id: teamId,
      partido_id: partido.id,
      codigo: c.codigo,
      color_hex: c.colorHex,
    })),
  );
  if (categoriasError) return { error: `No se pudieron guardar las categorías: ${categoriasError.message}` };

  const { error: accionesError } = await supabase.from("va_acciones").insert(
    parseado.acciones.map((a) => ({
      team_id: teamId,
      partido_id: partido.id,
      codigo: a.codigo,
      inicio_seg: a.inicio,
      fin_seg: a.fin,
    })),
  );
  if (accionesError) return { error: `No se pudieron guardar las acciones: ${accionesError.message}` };

  revalidatePath("/videoanalisis");
  redirect(`/videoanalisis/${partido.id}`);
}

export async function eliminarPartidoVA(id: string) {
  const supabase = await createClient();
  const { data: partido } = await supabase.from("partidos_va").select("xml_storage_path").eq("id", id).maybeSingle();

  await supabase.from("partidos_va").delete().eq("id", id);

  if (partido?.xml_storage_path) {
    const admin = createAdminClient();
    await admin.storage.from("videoanalisis-xml").remove([partido.xml_storage_path]);
  }

  revalidatePath("/videoanalisis");
}

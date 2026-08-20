"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import type { NotaTacticaId } from "@/lib/statsbomb/notas-tacticas";

async function getTeamId() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: staff } = await supabase.from("staff_users").select("team_id").eq("id", user.id).single();
  return staff?.team_id ?? null;
}

export async function subirImagenNotaTactica(
  notaId: NotaTacticaId,
  formData: FormData,
): Promise<{ url: string | null; error: string | null }> {
  const teamId = await getTeamId();
  if (!teamId) return { url: null, error: "No autenticado." };

  const file = formData.get("file") as File | null;
  if (!file || file.size === 0) return { url: null, error: "Elegí una imagen." };
  if (!file.type.startsWith("image/")) return { url: null, error: "El archivo debe ser una imagen." };

  const admin = createAdminClient();
  const ext = file.name.split(".").pop() || "png";
  const path = `${teamId}/${notaId}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const bytes = Buffer.from(await file.arrayBuffer());

  const { error: uploadError } = await admin.storage.from("informe-notas-imagenes").upload(path, bytes, {
    contentType: file.type,
  });
  if (uploadError) return { url: null, error: `No se pudo subir la imagen: ${uploadError.message}` };

  const {
    data: { publicUrl },
  } = admin.storage.from("informe-notas-imagenes").getPublicUrl(path);

  return { url: publicUrl, error: null };
}

export async function eliminarImagenNotaTactica(url: string): Promise<{ error: string | null }> {
  const teamId = await getTeamId();
  if (!teamId) return { error: "No autenticado." };

  const admin = createAdminClient();
  const path = url.split("/storage/v1/object/public/informe-notas-imagenes/")[1];
  if (path) {
    await admin.storage.from("informe-notas-imagenes").remove([decodeURIComponent(path)]);
  }
  return { error: null };
}

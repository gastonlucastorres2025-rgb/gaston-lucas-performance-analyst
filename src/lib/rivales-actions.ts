"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
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

export async function subirKeynoteRival(rivalId: string, formData: FormData) {
  const teamId = await getTeamId();
  if (!teamId) return { url: null, nombre: null, error: "No autenticado." };

  const file = formData.get("file") as File | null;
  if (!file || file.size === 0) return { url: null, nombre: null, error: "Elegí un archivo." };

  const admin = createAdminClient();
  const ext = file.name.split(".").pop() || "key";
  const path = `${teamId}/${rivalId}-${Date.now()}.${ext}`;
  const bytes = Buffer.from(await file.arrayBuffer());

  const { error: uploadError } = await admin.storage.from("rivales-keynote").upload(path, bytes, {
    contentType: file.type || "application/octet-stream",
  });
  if (uploadError) return { url: null, nombre: null, error: `No se pudo subir el archivo: ${uploadError.message}` };

  const {
    data: { publicUrl },
  } = admin.storage.from("rivales-keynote").getPublicUrl(path);

  const supabase = await createClient();
  const { error } = await supabase
    .from("rivales")
    .update({ keynote_url: publicUrl, keynote_nombre: file.name })
    .eq("id", rivalId);
  if (error) return { url: null, nombre: null, error: error.message };

  revalidatePath(`/rivales/${rivalId}`);
  return { url: publicUrl, nombre: file.name, error: null };
}

export async function eliminarKeynoteRival(rivalId: string, url: string) {
  const teamId = await getTeamId();
  if (!teamId) return { error: "No autenticado." };

  const admin = createAdminClient();
  const path = url.split("/storage/v1/object/public/rivales-keynote/")[1];
  if (path) {
    await admin.storage.from("rivales-keynote").remove([decodeURIComponent(path)]);
  }

  const supabase = await createClient();
  const { error } = await supabase.from("rivales").update({ keynote_url: null, keynote_nombre: null }).eq("id", rivalId);
  if (error) return { error: error.message };

  revalidatePath(`/rivales/${rivalId}`);
  return { error: null };
}

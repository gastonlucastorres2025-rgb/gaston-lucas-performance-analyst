"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export type SubirInformeState = { error: string | null; success: boolean };

export async function subirInforme(
  _prevState: SubirInformeState,
  formData: FormData,
): Promise<SubirInformeState> {
  const file = formData.get("file") as File | null;
  const tipo = formData.get("tipo") as string;
  const titulo = (formData.get("titulo") as string)?.trim();
  const rival = (formData.get("rival") as string)?.trim() || null;
  const fecha = (formData.get("fecha") as string) || null;

  if (!file || file.size === 0) {
    return { error: "Elegí un archivo PDF.", success: false };
  }
  if (!titulo) {
    return { error: "Poné un título para el informe.", success: false };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { error: "No autenticado.", success: false };
  }

  const { data: staff } = await supabase
    .from("staff_users")
    .select("team_id")
    .eq("id", user.id)
    .single();
  if (!staff) {
    return { error: "Tu usuario no tiene equipo asignado.", success: false };
  }

  const bytes = Buffer.from(await file.arrayBuffer());
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
  const storagePath = `${staff.team_id}/${Date.now()}-${safeName}`;

  const admin = createAdminClient();
  const { error: uploadError } = await admin.storage
    .from("informes")
    .upload(storagePath, bytes, {
      contentType: file.type || "application/pdf",
    });
  if (uploadError) {
    return { error: `No se pudo subir el archivo: ${uploadError.message}`, success: false };
  }

  const { error: insertError } = await supabase.from("informes").insert({
    team_id: staff.team_id,
    tipo,
    titulo,
    rival,
    fecha,
    storage_path: storagePath,
    tamano_bytes: bytes.length,
  });
  if (insertError) {
    return { error: `No se pudo guardar el registro: ${insertError.message}`, success: false };
  }

  revalidatePath("/informes");
  return { error: null, success: true };
}

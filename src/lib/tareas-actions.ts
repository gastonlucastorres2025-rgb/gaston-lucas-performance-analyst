"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type CrearTareaState = { error: string | null; success: boolean };

export async function crearTarea(
  _prevState: CrearTareaState,
  formData: FormData,
): Promise<CrearTareaState> {
  const titulo = (formData.get("titulo") as string)?.trim();
  const descripcion = (formData.get("descripcion") as string)?.trim() || null;
  const fecha = formData.get("fecha") as string;
  const hora = (formData.get("hora") as string) || "09:00";

  if (!titulo) {
    return { error: "Poné un título para la tarea.", success: false };
  }
  if (!fecha) {
    return { error: "Elegí una fecha.", success: false };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { error: "No autenticado.", success: false };
  }

  const { error } = await supabase.from("tareas").insert({
    staff_id: user.id,
    titulo,
    descripcion,
    fecha,
    hora,
  });
  if (error) {
    return { error: `No se pudo crear la tarea: ${error.message}`, success: false };
  }

  revalidatePath("/tareas");
  return { error: null, success: true };
}

export async function toggleTareaCompletada(id: string, completada: boolean) {
  const supabase = await createClient();
  await supabase.from("tareas").update({ completada }).eq("id", id);
  revalidatePath("/tareas");
}

export async function eliminarTarea(id: string) {
  const supabase = await createClient();
  await supabase.from("tareas").delete().eq("id", id);
  revalidatePath("/tareas");
}

export async function marcarTareaNotificada(id: string) {
  const supabase = await createClient();
  await supabase.from("tareas").update({ notificado: true }).eq("id", id);
}

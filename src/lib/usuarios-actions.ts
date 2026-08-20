"use server";

import { randomBytes } from "node:crypto";
import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import type { Rol } from "@/lib/roles";

export type UsuarioFila = { id: string; nombre: string; email: string; rol: Rol; soloLectura: boolean; creadoPropio: boolean };

async function getStaffActual() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: staff } = await supabase.from("staff_users").select("id, team_id, rol").eq("id", user.id).single();
  return staff ?? null;
}

/** crearUsuario/eliminarUsuario usan el cliente admin (service-role), que salta las políticas de RLS —
 * por eso el chequeo de "es admin" tiene que hacerse acá a mano, no alcanza con la RLS de la tabla. */
async function getStaffAdminActual() {
  const staff = await getStaffActual();
  if (!staff || staff.rol !== "admin") return null;
  return staff;
}

export async function listarUsuarios(): Promise<UsuarioFila[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data } = await supabase
    .from("staff_users")
    .select("id, nombre, email, rol, solo_lectura")
    .order("created_at", { ascending: true });

  return (data ?? []).map((u) => ({
    id: u.id,
    nombre: u.nombre,
    email: u.email,
    rol: u.rol,
    soloLectura: u.solo_lectura,
    creadoPropio: u.id === user?.id,
  }));
}

export type CrearUsuarioResult = { ok: true; email: string; passwordTemporal: string } | { ok: false; error: string };

/**
 * Crea una cuenta real (auth.users + staff_users) para un colega. Genera una contraseña temporal
 * aleatoria y la devuelve UNA sola vez para que el admin se la pase — no queda guardada en ningún
 * lado (ni en la base, que solo tiene el hash que maneja Supabase Auth internamente).
 */
export async function crearUsuario(datos: { nombre: string; email: string; rol: Rol; soloLectura: boolean }): Promise<CrearUsuarioResult> {
  const staff = await getStaffAdminActual();
  if (!staff) return { ok: false, error: "Solo un admin puede crear cuentas." };

  const nombre = datos.nombre.trim();
  const email = datos.email.trim().toLowerCase();
  if (!nombre) return { ok: false, error: "Ponele un nombre." };
  if (!email || !email.includes("@")) return { ok: false, error: "Email inválido." };

  const passwordTemporal = randomBytes(9).toString("base64url");
  const admin = createAdminClient();

  const { data: nuevoUsuario, error: authError } = await admin.auth.admin.createUser({
    email,
    password: passwordTemporal,
    email_confirm: true,
  });
  if (authError || !nuevoUsuario.user) return { ok: false, error: authError?.message ?? "No se pudo crear la cuenta." };

  const { error: staffError } = await admin.from("staff_users").insert({
    id: nuevoUsuario.user.id,
    team_id: staff.team_id,
    nombre,
    email,
    rol: datos.rol,
    solo_lectura: datos.soloLectura,
  });
  if (staffError) {
    // Si falla el insert en staff_users, no dejamos una cuenta de auth huérfana sin fila asociada.
    await admin.auth.admin.deleteUser(nuevoUsuario.user.id);
    return { ok: false, error: staffError.message };
  }

  revalidatePath("/configuracion/usuarios");
  return { ok: true, email, passwordTemporal };
}

export type AccionResult = { ok: true } | { ok: false; error: string };

export async function actualizarPermisosUsuario(usuarioId: string, cambios: { rol?: Rol; soloLectura?: boolean }): Promise<AccionResult> {
  const staff = await getStaffAdminActual();
  if (!staff) return { ok: false, error: "Solo un admin puede cambiar permisos." };

  const update: Record<string, unknown> = {};
  if (cambios.rol !== undefined) update.rol = cambios.rol;
  if (cambios.soloLectura !== undefined) update.solo_lectura = cambios.soloLectura;

  const supabase = await createClient();
  const { error } = await supabase.from("staff_users").update(update).eq("id", usuarioId);
  if (error) return { ok: false, error: error.message };

  revalidatePath("/configuracion/usuarios");
  return { ok: true };
}

export async function eliminarUsuario(usuarioId: string): Promise<AccionResult> {
  const staff = await getStaffAdminActual();
  if (!staff) return { ok: false, error: "Solo un admin puede eliminar cuentas." };
  if (staff.id === usuarioId) return { ok: false, error: "No podés eliminar tu propia cuenta desde acá." };

  // Se borra primero la cuenta de auth con el cliente admin: la fila de staff_users se borra sola en
  // cascada (on delete cascade en la FK a auth.users), así no hace falta borrarla a mano.
  const admin = createAdminClient();
  const { error } = await admin.auth.admin.deleteUser(usuarioId);
  if (error) return { ok: false, error: error.message };

  revalidatePath("/configuracion/usuarios");
  return { ok: true };
}

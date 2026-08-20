import { PageHeader } from "@/components/page-header";
import { UsuariosAdmin } from "@/components/usuarios-admin";
import { listarUsuarios } from "@/lib/usuarios-actions";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function ConfiguracionUsuariosPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: staffActual } = user
    ? await supabase.from("staff_users").select("rol").eq("id", user.id).single()
    : { data: null };
  const esAdmin = staffActual?.rol === "admin";

  const usuarios = await listarUsuarios();

  return (
    <div>
      <PageHeader title="Usuarios y roles" description="Gestión de miembros del cuerpo técnico y sus permisos." />
      {esAdmin ? (
        <UsuariosAdmin usuariosIniciales={usuarios} />
      ) : (
        <div className="overflow-hidden rounded-lg border border-border">
          <table className="w-full text-sm">
            <thead className="bg-primary/5 text-xs uppercase tracking-wide text-foreground/50">
              <tr>
                <th className="px-3 py-2 text-left">Nombre</th>
                <th className="px-3 py-2 text-left">Email</th>
                <th className="px-3 py-2 text-left">Rol</th>
                <th className="px-3 py-2 text-left">Acceso</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {usuarios.map((u) => (
                <tr key={u.id}>
                  <td className="px-3 py-2 font-medium text-foreground">{u.nombre}</td>
                  <td className="px-3 py-2 text-foreground/60">{u.email}</td>
                  <td className="px-3 py-2 text-foreground/60">{u.rol}</td>
                  <td className="px-3 py-2 text-foreground/60">{u.soloLectura ? "Solo lectura" : "Acceso completo"}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="border-t border-border px-3 py-2 text-xs text-foreground/40">
            Solo un admin puede crear, editar o eliminar cuentas.
          </p>
        </div>
      )}
    </div>
  );
}

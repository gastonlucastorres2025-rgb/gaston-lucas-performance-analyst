"use client";

import { useState } from "react";
import { ROLES, type Rol } from "@/lib/roles";
import { actualizarPermisosUsuario, crearUsuario, eliminarUsuario, type UsuarioFila } from "@/lib/usuarios-actions";

export function UsuariosAdmin({ usuariosIniciales }: { usuariosIniciales: UsuarioFila[] }) {
  const [usuarios, setUsuarios] = useState(usuariosIniciales);
  const [credenciales, setCredenciales] = useState<{ email: string; passwordTemporal: string } | null>(null);

  function agregarUsuarioLocal(u: UsuarioFila) {
    setUsuarios((prev) => [...prev, u]);
  }

  function actualizarUsuarioLocal(id: string, cambios: Partial<UsuarioFila>) {
    setUsuarios((prev) => prev.map((u) => (u.id === id ? { ...u, ...cambios } : u)));
  }

  function quitarUsuarioLocal(id: string) {
    setUsuarios((prev) => prev.filter((u) => u.id !== id));
  }

  return (
    <div>
      {credenciales && (
        <div className="mb-6 rounded-lg border border-primary bg-primary/5 p-4">
          <p className="text-sm font-semibold text-primary">Cuenta creada — copiá esto ahora</p>
          <p className="mt-1 text-xs text-foreground/60">
            Esta contraseña no se vuelve a mostrar. Mandásela a la persona por un medio seguro (no por acá).
          </p>
          <div className="mt-3 space-y-1.5 text-sm">
            <p>
              <span className="text-foreground/50">Email:</span> <span className="font-mono">{credenciales.email}</span>
            </p>
            <p>
              <span className="text-foreground/50">Contraseña:</span>{" "}
              <span className="font-mono font-semibold">{credenciales.passwordTemporal}</span>
            </p>
          </div>
          <button
            onClick={() => setCredenciales(null)}
            className="mt-3 rounded-md border border-border px-3 py-1.5 text-xs font-medium hover:bg-primary/5"
          >
            Ya la copié, cerrar
          </button>
        </div>
      )}

      <NuevoUsuarioForm onCreado={(u, creds) => { agregarUsuarioLocal(u); setCredenciales(creds); }} />

      <div className="mt-8 overflow-hidden rounded-lg border border-border">
        <table className="w-full text-sm">
          <thead className="bg-primary/5 text-xs uppercase tracking-wide text-foreground/50">
            <tr>
              <th className="px-3 py-2 text-left">Nombre</th>
              <th className="px-3 py-2 text-left">Email</th>
              <th className="px-3 py-2 text-left">Rol</th>
              <th className="px-3 py-2 text-left">Acceso</th>
              <th className="px-3 py-2"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {usuarios.map((u) => (
              <FilaUsuario key={u.id} usuario={u} onCambiar={(c) => actualizarUsuarioLocal(u.id, c)} onEliminado={() => quitarUsuarioLocal(u.id)} />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function NuevoUsuarioForm({ onCreado }: { onCreado: (u: UsuarioFila, creds: { email: string; passwordTemporal: string }) => void }) {
  const [nombre, setNombre] = useState("");
  const [email, setEmail] = useState("");
  const [rol, setRol] = useState<Rol>("asistente_tecnico");
  const [soloLectura, setSoloLectura] = useState(true);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleCrear() {
    setPending(true);
    setError(null);
    const result = await crearUsuario({ nombre, email, rol, soloLectura });
    setPending(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    onCreado(
      { id: crypto.randomUUID(), nombre, email: result.email, rol, soloLectura, creadoPropio: false },
      { email: result.email, passwordTemporal: result.passwordTemporal },
    );
    setNombre("");
    setEmail("");
    setRol("asistente_tecnico");
    setSoloLectura(true);
  }

  return (
    <div className="rounded-lg border border-border p-4">
      <p className="mb-3 text-sm font-medium text-foreground">Crear cuenta nueva</p>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <input
          value={nombre}
          onChange={(e) => setNombre(e.target.value)}
          placeholder="Nombre completo"
          className="rounded border border-border px-3 py-2 text-sm focus:border-primary focus:outline-none"
        />
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Email"
          className="rounded border border-border px-3 py-2 text-sm focus:border-primary focus:outline-none"
        />
        <select
          value={rol}
          onChange={(e) => setRol(e.target.value as Rol)}
          className="rounded border border-border px-3 py-2 text-sm focus:border-primary focus:outline-none"
        >
          {ROLES.map((r) => (
            <option key={r.value} value={r.value}>
              {r.label}
            </option>
          ))}
        </select>
        <label className="flex items-center gap-2 text-sm text-foreground/70">
          <input type="checkbox" checked={soloLectura} onChange={(e) => setSoloLectura(e.target.checked)} />
          Solo lectura (no puede modificar nada)
        </label>
      </div>
      {error && <p className="mt-2 text-xs text-accent">{error}</p>}
      <button
        onClick={handleCrear}
        disabled={pending || !nombre.trim() || !email.trim()}
        className="mt-3 rounded-md bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90 disabled:opacity-50"
      >
        {pending ? "Creando..." : "Crear cuenta"}
      </button>
    </div>
  );
}

function FilaUsuario({
  usuario,
  onCambiar,
  onEliminado,
}: {
  usuario: UsuarioFila;
  onCambiar: (cambios: Partial<UsuarioFila>) => void;
  onEliminado: () => void;
}) {
  const [pending, setPending] = useState(false);

  async function handleCambiarSoloLectura() {
    const nuevo = !usuario.soloLectura;
    onCambiar({ soloLectura: nuevo });
    await actualizarPermisosUsuario(usuario.id, { soloLectura: nuevo });
  }

  async function handleEliminar() {
    if (!confirm(`¿Eliminar la cuenta de ${usuario.nombre}? Deja de poder entrar a la plataforma.`)) return;
    setPending(true);
    try {
      const result = await eliminarUsuario(usuario.id);
      if (result.ok) onEliminado();
      else alert(result.error);
    } finally {
      setPending(false);
    }
  }

  const rolLabel = ROLES.find((r) => r.value === usuario.rol)?.label ?? usuario.rol;

  return (
    <tr>
      <td className="px-3 py-2 font-medium text-foreground">{usuario.nombre}</td>
      <td className="px-3 py-2 text-foreground/60">{usuario.email}</td>
      <td className="px-3 py-2 text-foreground/60">{rolLabel}</td>
      <td className="px-3 py-2">
        <button
          onClick={handleCambiarSoloLectura}
          disabled={usuario.creadoPropio}
          className={`rounded-full px-2.5 py-0.5 text-xs font-medium disabled:cursor-not-allowed disabled:opacity-50 ${
            usuario.soloLectura ? "bg-primary/10 text-primary hover:bg-primary/20" : "bg-accent/10 text-accent hover:bg-accent/20"
          }`}
          title={usuario.creadoPropio ? "No podés cambiar tu propio acceso" : "Tocar para cambiar"}
        >
          {usuario.soloLectura ? "Solo lectura" : "Acceso completo"}
        </button>
      </td>
      <td className="px-3 py-2 text-right">
        {!usuario.creadoPropio && (
          <button onClick={handleEliminar} disabled={pending} className="text-xs text-foreground/40 hover:text-accent disabled:opacity-50">
            Eliminar
          </button>
        )}
      </td>
    </tr>
  );
}

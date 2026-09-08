"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

/** Página a la que llega el link de "recuperar contraseña" (generado desde /login o por un admin
 * desde Configuración → Usuarios). El link de Supabase deja al usuario autenticado con una sesión
 * de recuperación — acá solo falta que defina su contraseña nueva. Sin esta pantalla, ese link no
 * sirve para nada: la sesión de recuperación existe pero no hay forma de usarla. */
export default function ActualizarContrasenaPage() {
  const router = useRouter();
  // Memoizado: `createClient()` crea una instancia nueva del cliente de Supabase cada vez que se
  // llama. Sin esto, cada re-render (ej. el propio `setEstado` de abajo) generaba un cliente
  // nuevo y abandonaba a mitad de camino el procesamiento async del hash de recuperación de la
  // URL — se perdía la sesión que se estaba por establecer, mostrando "link inválido" en un link
  // real y válido.
  const [supabase] = useState(() => createClient());
  const [estado, setEstado] = useState<"cargando" | "listo" | "sin-sesion">("cargando");
  const [password, setPassword] = useState("");
  const [confirmar, setConfirmar] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // El link de recuperación llega de dos formas posibles: con un "code" en la URL (flujo PKCE,
    // se canjea con exchangeCodeForSession) o con los tokens ya listos en el hash
    // (#access_token=...&refresh_token=...&type=recovery, flujo clásico que usa el link generado
    // por un admin vía la API). Este cliente está configurado para cookies/PKCE (createBrowserClient
    // de @supabase/ssr) y NO procesa automáticamente el hash del flujo clásico (detectSessionInUrl
    // no hace nada ahí) — verificado con un link real: sin este parseo manual, la sesión nunca se
    // establecía y siempre terminaba en "link inválido" aunque el link fuera válido. Por eso se
    // leen los tokens del hash a mano y se arma la sesión con setSession.
    (async () => {
      const params = new URLSearchParams(window.location.search);
      const codigo = params.get("code");
      if (codigo) {
        await supabase.auth.exchangeCodeForSession(codigo);
      } else {
        const hash = new URLSearchParams(window.location.hash.replace(/^#/, ""));
        const accessToken = hash.get("access_token");
        const refreshToken = hash.get("refresh_token");
        if (accessToken && refreshToken) {
          await supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken });
        }
      }
      // Saca los tokens de la URL una vez procesados — no deben quedar visibles/copiables en la
      // barra de direcciones ni en el historial del navegador.
      window.history.replaceState(null, "", window.location.pathname);

      const { data } = await supabase.auth.getSession();
      setEstado(data.session ? "listo" : "sin-sesion");
    })();
  }, [supabase]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (password.length < 6) {
      setError("La contraseña tiene que tener al menos 6 caracteres.");
      return;
    }
    if (password !== confirmar) {
      setError("Las contraseñas no coinciden.");
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (error) {
      setError(error.message);
      return;
    }
    router.push("/dashboard");
    router.refresh();
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="flex w-80 flex-col gap-3 rounded-lg border border-border bg-surface p-8 shadow-sm">
        <Image
          src="/escudo-nacional.png"
          alt="Escudo de Nacional"
          width={56}
          height={56}
          priority
          className="mx-auto mb-1"
        />
        <h1 className="text-center text-lg font-semibold text-primary">Definir contraseña</h1>

        {estado === "cargando" && <p className="text-center text-sm text-foreground/60">Verificando el link...</p>}

        {estado === "sin-sesion" && (
          <>
            <p className="text-center text-sm text-accent">
              Este link no es válido o ya venció. Pedí uno nuevo desde &quot;¿Olvidé mi contraseña?&quot; en el login.
            </p>
            <a href="/login" className="text-center text-sm text-primary hover:underline">
              Volver al login
            </a>
          </>
        )}

        {estado === "listo" && (
          <form onSubmit={handleSubmit} className="flex flex-col gap-3">
            <p className="-mt-1 text-center text-xs text-foreground/60">Elegí tu nueva contraseña para entrar a la plataforma.</p>
            <input
              type="password"
              placeholder="Contraseña nueva"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              className="rounded border border-border px-3 py-2 text-sm focus:border-primary focus:outline-none"
            />
            <input
              type="password"
              placeholder="Repetir contraseña"
              value={confirmar}
              onChange={(e) => setConfirmar(e.target.value)}
              required
              minLength={6}
              className="rounded border border-border px-3 py-2 text-sm focus:border-primary focus:outline-none"
            />
            {error && <p className="text-sm text-accent">{error}</p>}
            <button
              type="submit"
              disabled={loading}
              className="rounded bg-primary px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-primary-dark disabled:opacity-50"
            >
              {loading ? "Guardando..." : "Guardar y entrar"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

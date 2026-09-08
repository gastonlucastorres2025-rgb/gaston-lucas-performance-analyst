"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const router = useRouter();
  const supabase = createClient();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [modo, setModo] = useState<"login" | "recuperar">("login");
  const [recuperarEnviado, setRecuperarEnviado] = useState(false);

  useEffect(() => {
    // Un link de recuperación de contraseña puede terminar acá (en vez de en la raíz "/") porque
    // el hash con los tokens viaja pegado durante la cadena de redirects sin sesión (/ → /dashboard
    // → /login). Si aparece, se reenvía a /actualizar-contrasena preservando ese hash/query en vez
    // de mostrar el login normal.
    const esRecuperacion =
      window.location.hash.includes("type=recovery") ||
      window.location.hash.includes("access_token") ||
      new URLSearchParams(window.location.search).has("code");
    if (esRecuperacion) {
      window.location.replace(`/actualizar-contrasena${window.location.search}${window.location.hash}`);
    }
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    setLoading(false);

    if (error) {
      setError(error.message);
      return;
    }

    router.push("/dashboard");
    router.refresh();
  }

  async function handleRecuperar(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/actualizar-contrasena`,
    });
    setLoading(false);
    if (error) {
      setError(error.message);
      return;
    }
    setRecuperarEnviado(true);
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
        <h1 className="text-center text-lg font-semibold text-primary">
          Cuerpo Técnico
        </h1>
        <p className="-mt-2 text-center text-xs text-foreground/60">
          Gastón Lucas Torres
        </p>

        {modo === "login" ? (
          <form onSubmit={handleSubmit} className="flex flex-col gap-3">
            <input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="rounded border border-border px-3 py-2 text-sm focus:border-primary focus:outline-none"
            />
            <input
              type="password"
              placeholder="Contraseña"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="rounded border border-border px-3 py-2 text-sm focus:border-primary focus:outline-none"
            />
            {error && <p className="text-sm text-accent">{error}</p>}
            <button
              type="submit"
              disabled={loading}
              className="rounded bg-primary px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-primary-dark disabled:opacity-50"
            >
              {loading ? "Ingresando..." : "Ingresar"}
            </button>
            <button
              type="button"
              onClick={() => {
                setModo("recuperar");
                setError(null);
                setRecuperarEnviado(false);
              }}
              className="text-center text-xs text-foreground/50 hover:text-primary hover:underline"
            >
              ¿Olvidé mi contraseña?
            </button>
          </form>
        ) : recuperarEnviado ? (
          <>
            <p className="text-center text-sm text-foreground/70">
              Si <span className="font-medium">{email}</span> tiene una cuenta, te llegó un mail con un link para definir una
              contraseña nueva.
            </p>
            <button
              type="button"
              onClick={() => setModo("login")}
              className="text-center text-sm text-primary hover:underline"
            >
              Volver al login
            </button>
          </>
        ) : (
          <form onSubmit={handleRecuperar} className="flex flex-col gap-3">
            <p className="-mt-1 text-center text-xs text-foreground/60">
              Ingresá tu email y te mandamos un link para definir una contraseña nueva.
            </p>
            <input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="rounded border border-border px-3 py-2 text-sm focus:border-primary focus:outline-none"
            />
            {error && <p className="text-sm text-accent">{error}</p>}
            <button
              type="submit"
              disabled={loading}
              className="rounded bg-primary px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-primary-dark disabled:opacity-50"
            >
              {loading ? "Enviando..." : "Mandar link"}
            </button>
            <button
              type="button"
              onClick={() => {
                setModo("login");
                setError(null);
              }}
              className="text-center text-xs text-foreground/50 hover:text-primary hover:underline"
            >
              Volver al login
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

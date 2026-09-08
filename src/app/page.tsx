"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/**
 * Los links de recuperación de contraseña de Supabase (generados desde "¿Olvidé mi contraseña?"
 * en /login, o por un admin desde Configuración → Usuarios) siempre terminan trayendo al usuario
 * de vuelta acá, a la raíz del sitio — el "Site URL" del proyecto — sin importar qué Redirect URL
 * más específica se le pida, porque depende de una lista de URLs permitidas en el dashboard de
 * Supabase que no siempre queda bien configurada. En vez de depender de eso, se detecta acá mismo
 * si lo que llegó es un link de recuperación (por el hash `#...&type=recovery` del flujo clásico,
 * o por `?code=...` del flujo PKCE) y se reenvía a /actualizar-contrasena preservando esos datos
 * — así el link funciona sin importar cómo esté esa config.
 */
export default function Home() {
  const router = useRouter();

  useEffect(() => {
    const esRecuperacion =
      window.location.hash.includes("type=recovery") ||
      window.location.hash.includes("access_token") ||
      new URLSearchParams(window.location.search).has("code");

    if (esRecuperacion) {
      window.location.replace(`/actualizar-contrasena${window.location.search}${window.location.hash}`);
      return;
    }
    router.replace("/dashboard");
  }, [router]);

  return null;
}

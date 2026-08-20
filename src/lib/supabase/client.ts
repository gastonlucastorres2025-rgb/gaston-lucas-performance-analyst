import { createBrowserClient } from "@supabase/ssr";
import { parseCookie, stringifySetCookie } from "cookie";
import { comoCookieDeSesion } from "@/lib/supabase/session-cookie";

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      // Reemplaza el manejo de cookies por defecto de @supabase/ssr (que fuerza 400 días fijos sin
      // importar qué se le pase) para poder sacarle maxAge/expires acá — así el navegador la trata
      // como cookie de sesión y la borra sola al cerrarse. Ver session-cookie.ts para el detalle.
      cookies: {
        getAll() {
          const cookiesActuales = parseCookie(document.cookie);
          return Object.keys(cookiesActuales).map((name) => ({ name, value: cookiesActuales[name] ?? "" }));
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            document.cookie = stringifySetCookie(name, value, comoCookieDeSesion(options));
          });
        },
      },
    },
  );
}

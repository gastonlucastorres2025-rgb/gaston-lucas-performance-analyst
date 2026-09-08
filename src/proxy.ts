import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { comoCookieDeSesion } from "@/lib/supabase/session-cookie";

// "/actualizar-contrasena" tiene que ser pública: a esa página se llega desde un link de
// recuperación de contraseña, cuyos tokens viajan en el hash de la URL (nunca llegan al servidor,
// así que acá todavía no hay cookie de sesión) — si no estuviera acá, este proxy la redirigiría a
// /login antes de que el cliente pueda procesar el hash y dejar al usuario definir su contraseña.
const PUBLIC_PATHS = ["/login", "/actualizar-contrasena"];

export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, comoCookieDeSesion(options)),
          );
        },
      },
    },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const isPublicPath = PUBLIC_PATHS.some((path) =>
    request.nextUrl.pathname.startsWith(path),
  );

  if (!user && !isPublicPath) {
    const loginUrl = new URL("/login", request.url);
    return NextResponse.redirect(loginUrl);
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|api|.*\\.(?:png|jpg|jpeg|gif|svg|webp|ico)$).*)",
  ],
};

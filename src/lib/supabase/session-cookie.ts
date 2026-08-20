// Por defecto, @supabase/ssr fuerza que la cookie de sesión dure 400 días (el máximo que permiten
// los navegadores) sin importar qué opciones se le pasen — está hardcodeado adentro de la librería
// (ver setItem en node_modules/@supabase/ssr/dist/main/cookies.js), así que no alcanza con pasarle
// `cookieOptions`. La única forma real de lograr que la sesión se cierre al cerrar el navegador es
// interceptar la escritura final de la cookie (acá) y sacarle `maxAge`/`expires` — así el navegador
// la trata como "cookie de sesión" y la borra sola al cerrarse. Pedido explícito del usuario: por
// seguridad, ninguna cuenta debe quedar logueada si alguien deja la pestaña abierta y cierra el
// navegador (compu compartida).
export function comoCookieDeSesion<T extends { maxAge?: number; expires?: Date }>(options: T): Omit<T, "maxAge" | "expires"> {
  const { maxAge: _maxAge, expires: _expires, ...resto } = options;
  return resto;
}

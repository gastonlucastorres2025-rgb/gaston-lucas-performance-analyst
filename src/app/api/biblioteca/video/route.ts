import { createReadStream, statSync } from "node:fs";
import { Readable } from "node:stream";
import { resolverVideo, tipoMime } from "@/lib/biblioteca/carpeta";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// Streaming de un video de una carpeta de la biblioteca (?c=<carpeta>&n=<archivo>), con soporte de "Range" para poder adelantar y
// retroceder sin bajar el archivo entero (hay videos de varios GB). El proxy de la plataforma deja
// afuera /api, así que la sesión se verifica acá.
export async function GET(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return new Response("No autorizado", { status: 401 });

  const parametros = new URL(request.url).searchParams;
  const ruta = resolverVideo(parametros.get("c"), parametros.get("n"));
  if (!ruta) return new Response("Video no encontrado", { status: 404 });

  const total = statSync(ruta).size;
  const cabeceras: Record<string, string> = {
    "Content-Type": tipoMime(ruta),
    "Accept-Ranges": "bytes",
    "Cache-Control": "private, no-store",
  };

  let inicio = 0;
  let fin = total - 1;
  let estado = 200;

  const rango = request.headers.get("range");
  if (rango) {
    const m = /^bytes=(\d*)-(\d*)$/.exec(rango.trim());
    if (!m || (m[1] === "" && m[2] === "")) return new Response(null, { status: 416, headers: { "Content-Range": `bytes */${total}` } });
    if (m[1] === "") {
      // "bytes=-N": los últimos N bytes
      inicio = Math.max(0, total - Number(m[2]));
    } else {
      inicio = Number(m[1]);
      if (m[2] !== "") fin = Math.min(Number(m[2]), total - 1);
    }
    if (inicio >= total || inicio > fin) return new Response(null, { status: 416, headers: { "Content-Range": `bytes */${total}` } });
    estado = 206;
    cabeceras["Content-Range"] = `bytes ${inicio}-${fin}/${total}`;
  }

  cabeceras["Content-Length"] = String(fin - inicio + 1);
  const flujo = createReadStream(ruta, { start: inicio, end: fin });
  // Si el navegador corta la conexión (cambió de posición o cerró la pestaña), se libera el archivo.
  request.signal.addEventListener("abort", () => flujo.destroy());
  return new Response(Readable.toWeb(flujo) as ReadableStream, { status: estado, headers: cabeceras });
}

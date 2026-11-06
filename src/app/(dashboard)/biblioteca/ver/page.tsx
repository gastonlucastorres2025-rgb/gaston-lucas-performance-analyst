import Link from "next/link";
import { notFound } from "next/navigation";
import { FormularioVideo } from "@/components/biblioteca/formulario-video";
import { formatearFechaIso, formatearTamano } from "@/components/biblioteca/formato";
import { carpetaPorNombre, categoriaDe, resolverVideo } from "@/lib/biblioteca/carpeta";
import { claveVideo, listarMetadata, puedeEditarBiblioteca } from "@/lib/biblioteca/datos";
import { createClient } from "@/lib/supabase/server";
import { statSync } from "node:fs";

export const dynamic = "force-dynamic";

export default async function BibliotecaVerPage({ searchParams }: { searchParams: Promise<{ c?: string; n?: string }> }) {
  const { c, n } = await searchParams;
  const carpeta = carpetaPorNombre(c);
  const ruta = resolverVideo(c, n);
  if (!carpeta || !ruta || !n) notFound();

  const supabase = await createClient();
  const [metadata, puedeEditar] = await Promise.all([listarMetadata(supabase), puedeEditarBiblioteca(supabase)]);
  const meta = metadata.get(claveVideo(carpeta.nombre, n)) ?? { titulo: "", etiquetas: [], notas: "" };
  const st = statSync(ruta);

  return (
    <div>
      <div className="mb-3 text-sm text-foreground/60">
        <Link href="/biblioteca" className="hover:text-primary">
          Biblioteca
        </Link>{" "}
        /{" "}
        <Link href={`/biblioteca/carpeta?c=${encodeURIComponent(carpeta.nombre)}`} className="hover:text-primary">
          {carpeta.nombre}
        </Link>
      </div>
      <h1 className="mb-4 text-xl font-semibold tracking-tight text-foreground">{meta.titulo || n.replace(/\.[^.]+$/, "")}</h1>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <div>
          {/* key: al cambiar de video se recrea el reproductor */}
          <video
            key={`${carpeta.nombre}/${n}`}
            src={`/api/biblioteca/video?c=${encodeURIComponent(carpeta.nombre)}&n=${encodeURIComponent(n)}`}
            controls
            preload="metadata"
            className="w-full rounded-lg bg-black"
            style={{ maxHeight: "72vh" }}
          />
          <p className="mt-2 text-xs text-foreground/60">
            {categoriaDe(n)} · {formatearFechaIso(st.mtime.toISOString())} · {formatearTamano(st.size)} · {n}
          </p>
        </div>

        <aside className="rounded-lg border border-border bg-surface p-4">
          <h2 className="mb-3 text-sm font-semibold text-foreground">Datos del video</h2>
          <FormularioVideo carpeta={carpeta.nombre} archivo={n} inicial={meta} puedeEditar={puedeEditar} />
        </aside>
      </div>
    </div>
  );
}

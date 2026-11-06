import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { formatearFechaIso, formatearTamano } from "@/components/biblioteca/formato";
import { carpetasBiblioteca, listarVideos } from "@/lib/biblioteca/carpeta";

export const dynamic = "force-dynamic";

export default function BibliotecaPage() {
  const carpetas = carpetasBiblioteca();

  return (
    <div>
      <PageHeader title="Biblioteca" description="Videos del cuerpo técnico, organizados en carpetas." />

      {carpetas.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border bg-surface px-5 py-10 text-center text-sm text-foreground/60">
          La biblioteca lee las carpetas de videos de la computadora del cuerpo técnico, así que solo está disponible abriendo la plataforma desde esa
          computadora (ícono GLT del escritorio, <span className="font-medium">localhost:3000</span>).
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {carpetas.map((carpeta) => {
            const videos = listarVideos(carpeta);
            const total = videos.reduce((s, v) => s + v.tamanoBytes, 0);
            const ultimo = videos[0]?.modificado;
            return (
              <Link
                key={carpeta.nombre}
                href={`/biblioteca/carpeta?c=${encodeURIComponent(carpeta.nombre)}`}
                className="group flex items-start gap-4 rounded-lg border border-border bg-surface p-5 transition-shadow hover:shadow-md"
              >
                <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary" aria-hidden>
                  <svg viewBox="0 0 24 24" className="h-8 w-8" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round">
                    <rect x="2.5" y="5" width="13.5" height="14" rx="2.5" />
                    <path d="M16 10.5 21.5 7v10L16 13.5" />
                  </svg>
                </span>
                <div className="min-w-0">
                  <div className="truncate text-lg font-semibold text-foreground group-hover:text-primary">{carpeta.nombre}</div>
                  <div className="mt-1 text-sm text-foreground/60">
                    {videos.length} {videos.length === 1 ? "video" : "videos"} · {formatearTamano(total)}
                  </div>
                  {ultimo && <div className="text-xs text-foreground/50">Último: {formatearFechaIso(ultimo)}</div>}
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

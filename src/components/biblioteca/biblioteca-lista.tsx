"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { MiniaturaVideo } from "@/components/biblioteca/miniatura-video";
import { formatearFechaIso, formatearTamano } from "@/components/biblioteca/formato";

export type VideoLista = {
  archivo: string;
  tamanoBytes: number;
  modificado: string;
  categoria: string;
  titulo: string;
  etiquetas: string[];
};

function sinAcentos(s: string): string {
  return s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
}

export function BibliotecaLista({ carpeta, videos }: { carpeta: string; videos: VideoLista[] }) {
  const [busqueda, setBusqueda] = useState("");
  const [categoria, setCategoria] = useState("");

  const categorias = useMemo(() => {
    const cuenta = new Map<string, number>();
    for (const v of videos) cuenta.set(v.categoria, (cuenta.get(v.categoria) ?? 0) + 1);
    return Array.from(cuenta.entries()).sort((a, b) => b[1] - a[1]);
  }, [videos]);

  const visibles = useMemo(() => {
    const q = sinAcentos(busqueda.trim());
    return videos.filter((v) => {
      if (categoria && v.categoria !== categoria) return false;
      if (!q) return true;
      return sinAcentos([v.archivo, v.titulo, ...v.etiquetas].join(" ")).includes(q);
    });
  }, [videos, busqueda, categoria]);

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <input
          type="search"
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          placeholder="Buscar por nombre, título o etiqueta…"
          className="w-full max-w-sm rounded-md border border-border bg-surface px-3 py-2 text-sm"
        />
        <span className="text-xs text-foreground/60">
          {visibles.length} de {videos.length} videos
        </span>
      </div>

      <div className="mb-5 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setCategoria("")}
          className={`rounded-full border px-3 py-1 text-xs font-medium ${categoria === "" ? "border-primary bg-primary text-white" : "border-border bg-surface text-foreground/70 hover:bg-background"}`}
        >
          Todos
        </button>
        {categorias.map(([nombre, cantidad]) => (
          <button
            key={nombre}
            type="button"
            onClick={() => setCategoria(categoria === nombre ? "" : nombre)}
            className={`rounded-full border px-3 py-1 text-xs font-medium ${categoria === nombre ? "border-primary bg-primary text-white" : "border-border bg-surface text-foreground/70 hover:bg-background"}`}
          >
            {nombre} · {cantidad}
          </button>
        ))}
      </div>

      {visibles.length === 0 ? (
        <p className="rounded-lg border border-dashed border-border bg-surface px-5 py-10 text-center text-sm text-foreground/60">Ningún video coincide con la búsqueda.</p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {visibles.map((v) => (
            <Link
              key={v.archivo}
              href={`/biblioteca/ver?c=${encodeURIComponent(carpeta)}&n=${encodeURIComponent(v.archivo)}`}
              className="group overflow-hidden rounded-lg border border-border bg-surface transition-shadow hover:shadow-md"
            >
              <MiniaturaVideo carpeta={carpeta} archivo={v.archivo} />
              <div className="p-3">
                <div className="line-clamp-2 text-sm font-medium text-foreground group-hover:text-primary">{v.titulo || v.archivo.replace(/\.[^.]+$/, "")}</div>
                <div className="mt-1 text-xs text-foreground/60">
                  {v.categoria} · {formatearFechaIso(v.modificado)} · {formatearTamano(v.tamanoBytes)}
                </div>
                {v.etiquetas.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {v.etiquetas.map((e) => (
                      <span key={e} className="rounded bg-background px-1.5 py-0.5 text-[11px] text-foreground/70">
                        {e}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

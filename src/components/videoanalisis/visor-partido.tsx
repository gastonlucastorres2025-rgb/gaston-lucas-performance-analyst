"use client";

import { useMemo, useRef, useState } from "react";
import { YoutubePlayer, type YoutubePlayerHandle } from "@/components/videoanalisis/youtube-player";

type Categoria = { codigo: string; color_hex: string | null };
type Accion = { id: string; codigo: string; inicio_seg: number; fin_seg: number };

function formatMinuto(segundos: number): string {
  const m = Math.floor(segundos / 60);
  const s = Math.floor(segundos % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export function VisorPartido({
  youtubeVideoId,
  offsetSegundos,
  categorias,
  acciones,
}: {
  youtubeVideoId: string;
  offsetSegundos: number;
  categorias: Categoria[];
  acciones: Accion[];
}) {
  const playerRef = useRef<YoutubePlayerHandle>(null);
  const [seleccionadas, setSeleccionadas] = useState<Set<string>>(new Set(categorias.map((c) => c.codigo)));

  const conteos = useMemo(() => {
    const mapa = new Map<string, number>();
    for (const a of acciones) mapa.set(a.codigo, (mapa.get(a.codigo) ?? 0) + 1);
    return mapa;
  }, [acciones]);

  const accionesFiltradas = useMemo(
    () => acciones.filter((a) => seleccionadas.has(a.codigo)),
    [acciones, seleccionadas],
  );

  function toggleCategoria(codigo: string) {
    setSeleccionadas((prev) => {
      const next = new Set(prev);
      if (next.has(codigo)) next.delete(codigo);
      else next.add(codigo);
      return next;
    });
  }

  function todasONinguna(activar: boolean) {
    setSeleccionadas(activar ? new Set(categorias.map((c) => c.codigo)) : new Set());
  }

  function irAAccion(accion: Accion) {
    playerRef.current?.seekTo(accion.inicio_seg + offsetSegundos);
  }

  return (
    <div className="grid grid-cols-1 gap-5 lg:grid-cols-[1fr_360px]">
      <YoutubePlayer ref={playerRef} videoId={youtubeVideoId} />

      <div className="flex flex-col gap-4 lg:max-h-[600px]">
        <div>
          <div className="mb-2 flex items-center justify-between">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-foreground/50">Categorías</h3>
            <div className="flex gap-2 text-[11px]">
              <button onClick={() => todasONinguna(true)} className="text-primary hover:underline">
                Todas
              </button>
              <button onClick={() => todasONinguna(false)} className="text-foreground/40 hover:underline">
                Ninguna
              </button>
            </div>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {categorias.map((c) => {
              const activa = seleccionadas.has(c.codigo);
              return (
                <button
                  key={c.codigo}
                  onClick={() => toggleCategoria(c.codigo)}
                  className="rounded-full border px-2.5 py-1 text-xs font-medium transition-opacity"
                  style={{
                    borderColor: c.color_hex ?? "#5f5e5a",
                    backgroundColor: activa ? (c.color_hex ?? "#5f5e5a") : "transparent",
                    color: activa ? "#fff" : (c.color_hex ?? "#5f5e5a"),
                    opacity: activa ? 1 : 0.6,
                  }}
                >
                  {c.codigo} ({conteos.get(c.codigo) ?? 0})
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto rounded-lg border border-border">
          {accionesFiltradas.length === 0 ? (
            <p className="p-4 text-center text-xs text-foreground/40">No hay acciones para esta selección.</p>
          ) : (
            <div className="divide-y divide-border">
              {accionesFiltradas.map((a) => (
                <button
                  key={a.id}
                  onClick={() => irAAccion(a)}
                  className="flex w-full items-center gap-3 px-3 py-2 text-left text-sm transition-colors hover:bg-primary/5"
                >
                  <span className="w-12 shrink-0 font-mono text-xs text-foreground/50">
                    {formatMinuto(a.inicio_seg)}
                  </span>
                  <span className="min-w-0 flex-1 truncate">{a.codigo}</span>
                  <span className="shrink-0 text-xs text-foreground/40">
                    {Math.round(a.fin_seg - a.inicio_seg)}s
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

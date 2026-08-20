"use client";

import { useMemo, useRef, useState } from "react";
import { AgregarAPlaylistBoton } from "@/components/videoanalisis/agregar-a-playlist-boton";
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

  const minutoMaximo = useMemo(
    () => (acciones.length === 0 ? 0 : Math.ceil(Math.max(...acciones.map((a) => a.fin_seg)) / 60)),
    [acciones],
  );
  const [desdeMin, setDesdeMin] = useState(0);
  const [hastaMin, setHastaMin] = useState(minutoMaximo);
  const hastaMinEfectivo = hastaMin || minutoMaximo;

  const conteos = useMemo(() => {
    const mapa = new Map<string, number>();
    for (const a of acciones) mapa.set(a.codigo, (mapa.get(a.codigo) ?? 0) + 1);
    return mapa;
  }, [acciones]);

  const colorPorCodigo = useMemo(() => {
    const mapa = new Map<string, string>();
    for (const c of categorias) mapa.set(c.codigo, c.color_hex ?? "#5f5e5a");
    return mapa;
  }, [categorias]);

  const accionesFiltradas = useMemo(
    () =>
      acciones.filter(
        (a) =>
          seleccionadas.has(a.codigo) &&
          a.inicio_seg >= desdeMin * 60 &&
          a.inicio_seg <= hastaMinEfectivo * 60,
      ),
    [acciones, seleccionadas, desdeMin, hastaMinEfectivo],
  );

  const hayFiltroMinutos = desdeMin > 0 || (hastaMin > 0 && hastaMin < minutoMaximo);

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

      <div className="flex flex-col gap-3 lg:max-h-[600px]">
        <details className="group relative rounded-lg border border-border bg-surface">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-2 px-3 py-2.5 text-sm font-medium">
            <span className="flex items-center gap-2">
              <span className="text-foreground/60">Filtros</span>
              <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-semibold text-primary">
                {accionesFiltradas.length} de {acciones.length}
              </span>
              {hayFiltroMinutos && (
                <span className="rounded-full bg-foreground/5 px-2 py-0.5 text-[11px] text-foreground/50">
                  {desdeMin}&apos;–{hastaMinEfectivo}&apos;
                </span>
              )}
            </span>
            <span className="text-foreground/40 transition-transform group-open:rotate-180">▾</span>
          </summary>

          <div className="absolute inset-x-0 top-full z-10 mt-1 flex flex-col gap-4 rounded-lg border border-border bg-surface p-3 shadow-lg">
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
              <div className="flex flex-col gap-1">
                {categorias.map((c) => {
                  const activa = seleccionadas.has(c.codigo);
                  return (
                    <label
                      key={c.codigo}
                      className="flex cursor-pointer items-center gap-2 rounded px-1.5 py-1 text-sm hover:bg-foreground/5"
                    >
                      <input
                        type="checkbox"
                        checked={activa}
                        onChange={() => toggleCategoria(c.codigo)}
                        className="shrink-0 accent-primary"
                      />
                      <span
                        className="h-2.5 w-2.5 shrink-0 rounded-full"
                        style={{ backgroundColor: c.color_hex ?? "#5f5e5a" }}
                      />
                      <span className="min-w-0 flex-1 truncate">{c.codigo}</span>
                      <span className="shrink-0 text-xs text-foreground/40">{conteos.get(c.codigo) ?? 0}</span>
                    </label>
                  );
                })}
              </div>
            </div>

            <div>
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-foreground/50">
                Franja de minutos
              </h3>
              <div className="flex items-center gap-2">
                <label className="flex flex-1 flex-col gap-1">
                  <span className="text-[11px] text-foreground/50">Desde</span>
                  <input
                    type="number"
                    min={0}
                    max={minutoMaximo}
                    value={desdeMin}
                    onChange={(e) => setDesdeMin(Math.max(0, Number(e.target.value) || 0))}
                    className="rounded border border-border px-2 py-1 text-sm focus:border-primary focus:outline-none"
                  />
                </label>
                <span className="mt-4 text-foreground/30">–</span>
                <label className="flex flex-1 flex-col gap-1">
                  <span className="text-[11px] text-foreground/50">Hasta</span>
                  <input
                    type="number"
                    min={0}
                    max={minutoMaximo}
                    value={hastaMin}
                    onChange={(e) => setHastaMin(Number(e.target.value) || 0)}
                    placeholder={String(minutoMaximo)}
                    className="rounded border border-border px-2 py-1 text-sm focus:border-primary focus:outline-none"
                  />
                </label>
              </div>
            </div>
          </div>
        </details>

        <div className="flex-1 overflow-y-auto rounded-lg border border-border">
          {accionesFiltradas.length === 0 ? (
            <p className="p-4 text-center text-xs text-foreground/40">No hay acciones para esta selección.</p>
          ) : (
            <div className="divide-y divide-border">
              {accionesFiltradas.map((a) => (
                <div key={a.id} className="flex items-center gap-1 px-1">
                  <button
                    onClick={() => irAAccion(a)}
                    className="flex min-w-0 flex-1 items-center gap-3 px-2 py-2 text-left text-sm transition-colors hover:bg-primary/5"
                  >
                    <span
                      className="h-2.5 w-2.5 shrink-0 rounded-full"
                      style={{ backgroundColor: colorPorCodigo.get(a.codigo) ?? "#5f5e5a" }}
                    />
                    <span className="w-12 shrink-0 font-mono text-xs text-foreground/50">
                      {formatMinuto(a.inicio_seg)}
                    </span>
                    <span className="min-w-0 flex-1 truncate">{a.codigo}</span>
                    <span className="shrink-0 text-xs text-foreground/40">
                      {Math.round(a.fin_seg - a.inicio_seg)}s
                    </span>
                  </button>
                  <AgregarAPlaylistBoton accionId={a.id} />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

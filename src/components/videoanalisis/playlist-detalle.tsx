"use client";

import Link from "next/link";
import { useMemo, useRef, useState } from "react";
import { useColaReproduccion, type ClipDeCola } from "@/components/videoanalisis/use-cola-reproduccion";
import { YoutubePlayer, type YoutubePlayerHandle } from "@/components/videoanalisis/youtube-player";
import { quitarCorteDePlaylist, renombrarPlaylist } from "@/lib/videoanalisis-playlists-actions";

export type ItemPlaylist = {
  itemId: string;
  accionId: string;
  codigo: string;
  inicioSeg: number;
  finSeg: number;
  colorHex: string | null;
  partido: { rival: string; fecha: string; competencia: string | null; youtubeVideoId: string; offsetSegundos: number };
};

function formatMinuto(segundos: number): string {
  const m = Math.floor(segundos / 60);
  const s = Math.floor(segundos % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export function PlaylistDetalle({
  playlistId,
  nombreInicial,
  itemsIniciales,
}: {
  playlistId: string;
  nombreInicial: string;
  itemsIniciales: ItemPlaylist[];
}) {
  const playerRef = useRef<YoutubePlayerHandle>(null);
  const [items, setItems] = useState(itemsIniciales);
  const [nombre, setNombre] = useState(nombreInicial);
  const [editandoNombre, setEditandoNombre] = useState(false);
  const [videoActualId, setVideoActualId] = useState<string | null>(itemsIniciales[0]?.partido.youtubeVideoId ?? null);
  const [quitando, setQuitando] = useState<string | null>(null);

  const clipsParaCola = useMemo<ClipDeCola[]>(
    () =>
      items.map((it) => ({
        id: it.itemId,
        inicioSeg: it.inicioSeg,
        finSeg: it.finSeg,
        youtubeVideoId: it.partido.youtubeVideoId,
        offsetSegundos: it.partido.offsetSegundos,
      })),
    [items],
  );

  const { indiceActual, reproduciendo, irAClip, reproducirDesde, detener } = useColaReproduccion(playerRef, clipsParaCola);

  function handleClickItem(i: number) {
    detener();
    irAClip(i);
    setVideoActualId(items[i]?.partido.youtubeVideoId ?? videoActualId);
  }

  async function handleGuardarNombre() {
    setEditandoNombre(false);
    if (nombre.trim() && nombre.trim() !== nombreInicial) {
      await renombrarPlaylist(playlistId, nombre.trim());
    }
  }

  async function handleQuitar(itemId: string) {
    setQuitando(itemId);
    try {
      await quitarCorteDePlaylist(playlistId, itemId);
      setItems((prev) => prev.filter((it) => it.itemId !== itemId));
    } finally {
      setQuitando(null);
    }
  }

  return (
    <div>
      <div className="mb-6 flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <Link href="/videoanalisis/playlists" className="text-xs text-foreground/50 hover:text-primary">
            ← Playlists
          </Link>
          {editandoNombre ? (
            <input
              autoFocus
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              onBlur={handleGuardarNombre}
              onKeyDown={(e) => e.key === "Enter" && handleGuardarNombre()}
              className="mt-1 block w-full max-w-md rounded border border-primary px-2 py-1 text-2xl font-semibold focus:outline-none"
            />
          ) : (
            <h1
              onClick={() => setEditandoNombre(true)}
              className="mt-1 cursor-pointer text-2xl font-semibold text-foreground hover:text-primary"
              title="Click para renombrar"
            >
              {nombre}
            </h1>
          )}
          <p className="mt-1 text-sm text-foreground/50">
            {items.length} {items.length === 1 ? "corte" : "cortes"}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[1fr_360px]">
        <div className="flex flex-col gap-3">
          {videoActualId ? (
            <YoutubePlayer ref={playerRef} videoId={videoActualId} />
          ) : (
            <div className="flex aspect-video w-full items-center justify-center rounded-lg bg-black">
              <p className="text-sm text-white/50">Esta playlist todavía no tiene cortes.</p>
            </div>
          )}
        </div>

        <div className="flex flex-col gap-3 lg:max-h-[600px]">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-foreground/50">Cortes</h3>
            {items.length > 0 && (
              <button
                onClick={reproduciendo ? detener : () => reproducirDesde(0)}
                className="rounded-md bg-accent px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-accent/90"
              >
                {reproduciendo ? "⏸ Detener" : "▶ Reproducir todo"}
              </button>
            )}
          </div>

          <div className="flex-1 overflow-y-auto rounded-lg border border-border">
            {items.length === 0 ? (
              <p className="p-4 text-center text-xs text-foreground/40">
                Agregá cortes desde un partido o desde el buscador de clips con el botón &quot;+ Playlist&quot;.
              </p>
            ) : (
              <div className="divide-y divide-border">
                {items.map((it, i) => (
                  <div
                    key={it.itemId}
                    className={`flex items-center gap-1 px-1 ${indiceActual === i ? "bg-primary/5" : ""}`}
                  >
                    <button
                      onClick={() => handleClickItem(i)}
                      className="flex min-w-0 flex-1 items-center gap-3 px-2 py-2 text-left text-sm transition-colors hover:bg-primary/5"
                    >
                      <span
                        className="h-2.5 w-2.5 shrink-0 rounded-full"
                        style={{ backgroundColor: it.colorHex ?? "#5f5e5a" }}
                      />
                      <span className="w-12 shrink-0 font-mono text-xs text-foreground/50">
                        {formatMinuto(it.inicioSeg)}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-medium">{it.codigo}</span>
                        <span className="block truncate text-xs text-foreground/40">
                          {it.partido.rival} · {it.partido.fecha}
                          {it.partido.competencia ? ` · ${it.partido.competencia}` : ""}
                        </span>
                      </span>
                    </button>
                    <button
                      onClick={() => handleQuitar(it.itemId)}
                      disabled={quitando === it.itemId}
                      className="shrink-0 px-2 text-xs text-foreground/30 hover:text-accent disabled:opacity-50"
                      title="Quitar de la playlist"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

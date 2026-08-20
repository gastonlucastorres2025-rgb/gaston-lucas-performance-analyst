"use client";

import { useMemo, useRef, useState } from "react";
import { AgregarAPlaylistBoton } from "@/components/videoanalisis/agregar-a-playlist-boton";
import { useColaReproduccion, type ClipDeCola } from "@/components/videoanalisis/use-cola-reproduccion";
import { YoutubePlayer, type YoutubePlayerHandle } from "@/components/videoanalisis/youtube-player";
import { buscarClips, type ClipEncontrado } from "@/lib/videoanalisis/buscar-clips-actions";

function formatMinuto(segundos: number): string {
  const m = Math.floor(segundos / 60);
  const s = Math.floor(segundos % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export function BuscadorClips() {
  const playerRef = useRef<YoutubePlayerHandle>(null);

  const [consulta, setConsulta] = useState("");
  const [buscando, setBuscando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [categorias, setCategorias] = useState<string[]>([]);
  const [duracionOverride, setDuracionOverride] = useState<number | null>(null);
  const [desdeMin, setDesdeMin] = useState<number | null>(null);
  const [hastaMin, setHastaMin] = useState<number | null>(null);
  const [clips, setClips] = useState<ClipEncontrado[]>([]);
  const [videoActualId, setVideoActualId] = useState<string | null>(null);

  // Si la consulta pidió una duración fija por clip, se usa esa en vez del fin_seg real del corte
  // (sigue cortando por tiempo real de reproducción, no por temporizador — solo cambia el objetivo).
  const clipsParaCola = useMemo<ClipDeCola[]>(
    () =>
      clips.map((c) => ({
        id: c.id,
        inicioSeg: c.inicioSeg,
        finSeg: duracionOverride != null ? c.inicioSeg + duracionOverride : c.finSeg,
        youtubeVideoId: c.partido.youtubeVideoId,
        offsetSegundos: c.partido.offsetSegundos,
      })),
    [clips, duracionOverride],
  );

  const { indiceActual, reproduciendo, irAClip, reproducirDesde, detener } = useColaReproduccion(playerRef, clipsParaCola);

  async function handleBuscar() {
    if (!consulta.trim()) return;
    setBuscando(true);
    setError(null);
    detener();
    try {
      const res = await buscarClips(consulta);
      if (res.error) {
        setError(res.error);
        setCategorias([]);
        setClips([]);
        return;
      }
      setCategorias(res.categoriasCoincidentes);
      setDuracionOverride(res.duracionSegundos);
      setDesdeMin(res.desdeMin);
      setHastaMin(res.hastaMin);
      setClips(res.clips);
      if (res.clips.length > 0) setVideoActualId(res.clips[0].partido.youtubeVideoId);
    } finally {
      setBuscando(false);
    }
  }

  function handleClickClip(i: number) {
    detener();
    irAClip(i);
    setVideoActualId(clipsParaCola[i]?.youtubeVideoId ?? videoActualId);
  }

  function handleReproducirTodo() {
    if (clips.length === 0) return;
    reproducirDesde(0);
  }

  return (
    <div className="grid grid-cols-1 gap-5 lg:grid-cols-[1fr_360px]">
      <div className="flex flex-col gap-3">
        {videoActualId ? (
          <YoutubePlayer ref={playerRef} videoId={videoActualId} />
        ) : (
          <div className="flex aspect-video w-full items-center justify-center rounded-lg bg-black">
            <p className="text-sm text-white/50">Buscá algo para ver los clips acá.</p>
          </div>
        )}

        <div className="flex gap-2">
          <input
            type="text"
            value={consulta}
            onChange={(e) => setConsulta(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleBuscar()}
            placeholder='Ej: "todas las defensas zona 2 que dure 45 segundos"'
            className="flex-1 rounded border border-border px-3 py-2 text-sm focus:border-primary focus:outline-none"
          />
          <button
            onClick={handleBuscar}
            disabled={buscando}
            className="shrink-0 rounded-md bg-primary px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-primary-dark disabled:opacity-50"
          >
            {buscando ? "Buscando..." : "Buscar"}
          </button>
        </div>

        {error && <p className="text-sm text-accent">{error}</p>}

        {categorias.length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5 text-xs text-foreground/50">
            <span>Categorías:</span>
            {categorias.map((c) => (
              <span key={c} className="rounded-full bg-primary/10 px-2 py-0.5 font-medium text-primary">
                {c}
              </span>
            ))}
            {duracionOverride && <span>· cada clip {duracionOverride}s</span>}
            {(desdeMin !== null || hastaMin !== null) && (
              <span>
                · desde el minuto {desdeMin ?? 0}
                {hastaMin !== null ? ` hasta el ${hastaMin}` : ""}
              </span>
            )}
          </div>
        )}
      </div>

      <div className="flex flex-col gap-3 lg:max-h-[600px]">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-foreground/50">
            {clips.length} {clips.length === 1 ? "clip encontrado" : "clips encontrados"}
          </h3>
          {clips.length > 0 && (
            <button
              onClick={reproduciendo ? detener : handleReproducirTodo}
              className="rounded-md bg-accent px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-accent/90"
            >
              {reproduciendo ? "⏸ Detener" : "▶ Reproducir todo"}
            </button>
          )}
        </div>

        <div className="flex-1 overflow-y-auto rounded-lg border border-border">
          {clips.length === 0 ? (
            <p className="p-4 text-center text-xs text-foreground/40">
              Escribí un pedido arriba, por ejemplo una categoría tageada y opcionalmente cuánto querés que dure cada
              clip.
            </p>
          ) : (
            <div className="divide-y divide-border">
              {clips.map((clip, i) => (
                <div
                  key={clip.id}
                  className={`flex items-center gap-1 px-1 ${indiceActual === i ? "bg-primary/5" : ""}`}
                >
                  <button
                    onClick={() => handleClickClip(i)}
                    className="flex min-w-0 flex-1 items-center gap-3 px-2 py-2 text-left text-sm transition-colors hover:bg-primary/5"
                  >
                    <span
                      className="h-2.5 w-2.5 shrink-0 rounded-full"
                      style={{ backgroundColor: clip.colorHex ?? "#5f5e5a" }}
                    />
                    <span className="w-12 shrink-0 font-mono text-xs text-foreground/50">
                      {formatMinuto(clip.inicioSeg)}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-medium">{clip.partido.rival}</span>
                      <span className="block truncate text-xs text-foreground/40">
                        {clip.partido.fecha}
                        {clip.partido.competencia ? ` · ${clip.partido.competencia}` : ""}
                      </span>
                    </span>
                  </button>
                  <AgregarAPlaylistBoton accionId={clip.id} />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

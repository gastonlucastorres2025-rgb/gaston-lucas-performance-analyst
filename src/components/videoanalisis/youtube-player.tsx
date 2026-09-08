"use client";

import { forwardRef, useEffect, useImperativeHandle, useRef } from "react";

type YTPlayerInstance = {
  seekTo: (seconds: number, allowSeekAhead: boolean) => void;
  playVideo: () => void;
  pauseVideo: () => void;
  loadVideoById: (videoId: string, startSeconds?: number) => void;
  getCurrentTime: () => number;
  destroy: () => void;
};

declare global {
  interface Window {
    YT?: {
      Player: new (
        el: HTMLElement,
        opts: {
          videoId: string;
          playerVars?: Record<string, number>;
          events?: { onReady?: () => void };
        },
      ) => YTPlayerInstance;
    };
    onYouTubeIframeAPIReady?: () => void;
  }
}

/** Video pendiente de cargar porque `cargarVideo` se llamó antes de que el player avisara `onReady`
 * (ej. tocar un clip apenas se cargaron los resultados de una búsqueda) — se aplica en cuanto esté listo,
 * en vez de perderse en silencio. */
type CargaPendiente = { videoId: string; startSeconds: number };

export type YoutubePlayerHandle = {
  seekTo: (seconds: number) => void;
  cargarVideo: (videoId: string, startSeconds?: number) => void;
  pausar: () => void;
  /** Tiempo real de reproducción (segundos) — para cortar con precisión en el fin de un corte, no por temporizador. */
  getCurrentTime: () => number;
};

let apiPromise: Promise<void> | null = null;

function cargarApiYoutube(): Promise<void> {
  if (window.YT?.Player) return Promise.resolve();
  if (apiPromise) return apiPromise;

  apiPromise = new Promise((resolve) => {
    window.onYouTubeIframeAPIReady = () => resolve();
    const script = document.createElement("script");
    script.src = "https://www.youtube.com/iframe_api";
    document.body.appendChild(script);
  });
  return apiPromise;
}

export const YoutubePlayer = forwardRef<YoutubePlayerHandle, { videoId: string }>(function YoutubePlayer(
  { videoId },
  ref,
) {
  const contenedorRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<YTPlayerInstance | null>(null);
  // El objeto que devuelve `new YT.Player(...)` existe de inmediato, pero sus métodos
  // (pauseVideo, seekTo, etc.) recién quedan disponibles cuando la API dispara `onReady` —
  // llamarlos antes tira "no es una función". `listoRef` marca ese momento real.
  const listoRef = useRef(false);
  const pendienteRef = useRef<CargaPendiente | null>(null);

  useEffect(() => {
    let cancelado = false;
    listoRef.current = false;
    pendienteRef.current = null;

    cargarApiYoutube().then(() => {
      if (cancelado || !contenedorRef.current || !window.YT) return;
      playerRef.current = new window.YT.Player(contenedorRef.current, {
        videoId,
        playerVars: { rel: 0 },
        events: {
          onReady: () => {
            if (cancelado) return;
            listoRef.current = true;
            const pendiente = pendienteRef.current;
            if (pendiente) {
              pendienteRef.current = null;
              playerRef.current?.loadVideoById(pendiente.videoId, pendiente.startSeconds);
            }
          },
        },
      });
    });

    return () => {
      cancelado = true;
      listoRef.current = false;
      pendienteRef.current = null;
      playerRef.current?.destroy();
      playerRef.current = null;
    };
  }, [videoId]);

  useImperativeHandle(
    ref,
    () => ({
      seekTo: (seconds: number) => {
        if (!listoRef.current) return;
        playerRef.current?.seekTo(seconds, true);
        playerRef.current?.playVideo();
      },
      cargarVideo: (videoId: string, startSeconds?: number) => {
        if (!listoRef.current) {
          // Todavía no disparó onReady (ej. se tocó un clip apenas se cargó el video actual) —
          // se guarda y se aplica solo cuando esté listo, en vez de perderse en silencio.
          pendienteRef.current = { videoId, startSeconds: startSeconds ?? 0 };
          return;
        }
        playerRef.current?.loadVideoById(videoId, startSeconds ?? 0);
      },
      pausar: () => {
        if (!listoRef.current) return;
        playerRef.current?.pauseVideo();
      },
      getCurrentTime: () => (listoRef.current ? (playerRef.current?.getCurrentTime() ?? 0) : 0),
    }),
    [],
  );

  return (
    <div className="aspect-video w-full overflow-hidden rounded-lg bg-black">
      <div ref={contenedorRef} className="h-full w-full" />
    </div>
  );
});

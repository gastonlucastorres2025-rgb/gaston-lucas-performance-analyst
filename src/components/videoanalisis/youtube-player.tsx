"use client";

import { forwardRef, useEffect, useImperativeHandle, useRef } from "react";

type YTPlayerInstance = {
  seekTo: (seconds: number, allowSeekAhead: boolean) => void;
  playVideo: () => void;
  pauseVideo: () => void;
  loadVideoById: (videoId: string, startSeconds?: number) => void;
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

export type YoutubePlayerHandle = {
  seekTo: (seconds: number) => void;
  cargarVideo: (videoId: string, startSeconds?: number) => void;
  pausar: () => void;
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

  useEffect(() => {
    let cancelado = false;

    cargarApiYoutube().then(() => {
      if (cancelado || !contenedorRef.current || !window.YT) return;
      playerRef.current = new window.YT.Player(contenedorRef.current, {
        videoId,
        playerVars: { rel: 0 },
      });
    });

    return () => {
      cancelado = true;
      playerRef.current?.destroy();
      playerRef.current = null;
    };
  }, [videoId]);

  useImperativeHandle(
    ref,
    () => ({
      seekTo: (seconds: number) => {
        playerRef.current?.seekTo(seconds, true);
        playerRef.current?.playVideo();
      },
      cargarVideo: (videoId: string, startSeconds?: number) => {
        playerRef.current?.loadVideoById(videoId, startSeconds ?? 0);
      },
      pausar: () => {
        playerRef.current?.pauseVideo();
      },
    }),
    [],
  );

  return (
    <div className="aspect-video w-full overflow-hidden rounded-lg bg-black">
      <div ref={contenedorRef} className="h-full w-full" />
    </div>
  );
});

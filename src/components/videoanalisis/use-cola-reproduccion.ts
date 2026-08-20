"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { RefObject } from "react";
import type { YoutubePlayerHandle } from "@/components/videoanalisis/youtube-player";

export type ClipDeCola = {
  /** Id estable del corte (va_acciones.id) — se usa solo para resaltar el ítem activo en la UI. */
  id: string;
  inicioSeg: number;
  finSeg: number;
  youtubeVideoId: string;
  offsetSegundos: number;
};

/**
 * Reproduce una lista de clips en secuencia, saltando de video de YouTube cuando corresponde.
 * A diferencia de un temporizador de pared (setTimeout con la duración nominal del corte), esto
 * sondea el tiempo REAL de reproducción del player (getCurrentTime) y avanza al siguiente clip
 * recién cuando el video efectivamente llegó a fin_seg — así no se desincroniza si el usuario
 * pausa, hay buffering, o el video corre a otra velocidad.
 */
export function useColaReproduccion(playerRef: RefObject<YoutubePlayerHandle | null>, clips: ClipDeCola[]) {
  const [indiceActual, setIndiceActual] = useState<number | null>(null);
  const [reproduciendo, setReproduciendo] = useState(false);
  const videoActualRef = useRef<string | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const limpiarIntervalo = useCallback(() => {
    if (intervalRef.current !== null) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  const irAClip = useCallback(
    (i: number) => {
      const clip = clips[i];
      if (!clip) return;
      setIndiceActual(i);
      const inicioReal = clip.inicioSeg + clip.offsetSegundos;
      if (videoActualRef.current !== clip.youtubeVideoId) {
        videoActualRef.current = clip.youtubeVideoId;
        playerRef.current?.cargarVideo(clip.youtubeVideoId, inicioReal);
      } else {
        playerRef.current?.seekTo(inicioReal);
      }
    },
    [clips, playerRef],
  );

  // Ref al propio reproducirDesde para poder llamarse a sí misma recursivamente (el siguiente clip)
  // sin que useCallback se queje de una referencia circular en sus dependencias.
  const reproducirDesdeRef = useRef<(i: number) => void>(() => {});

  const reproducirDesde = useCallback(
    (i: number) => {
      limpiarIntervalo();
      const clip = clips[i];
      if (!clip) {
        setReproduciendo(false);
        return;
      }
      irAClip(i);
      setReproduciendo(true);
      const finReal = clip.finSeg + clip.offsetSegundos;
      // Margen de 150ms: getCurrentTime no es instantáneo, sin margen el intervalo puede pasarse
      // de largo el corte de milagro o cortarlo 1 tick tarde — 150ms es imperceptible al ver el clip.
      intervalRef.current = setInterval(() => {
        const actual = playerRef.current?.getCurrentTime() ?? 0;
        if (actual >= finReal - 0.15) {
          limpiarIntervalo();
          if (i + 1 < clips.length) {
            reproducirDesdeRef.current(i + 1);
          } else {
            setReproduciendo(false);
            playerRef.current?.pausar();
          }
        }
      }, 200);
    },
    [clips, irAClip, limpiarIntervalo, playerRef],
  );

  useEffect(() => {
    reproducirDesdeRef.current = reproducirDesde;
  }, [reproducirDesde]);

  const detener = useCallback(() => {
    limpiarIntervalo();
    setReproduciendo(false);
    playerRef.current?.pausar();
  }, [limpiarIntervalo, playerRef]);

  useEffect(() => limpiarIntervalo, [limpiarIntervalo]);

  return { indiceActual, reproduciendo, irAClip, reproducirDesde, detener };
}

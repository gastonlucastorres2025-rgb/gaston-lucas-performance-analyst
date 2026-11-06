"use client";

import { useEffect, useRef, useState } from "react";

/** Primer cuadro del video como miniatura. Con 90+ videos de varios GB, el <video> solo se monta
 * cuando la tarjeta entra en pantalla (y pide solo los metadatos), no todos juntos al abrir la lista. */
export function MiniaturaVideo({ carpeta, archivo }: { carpeta: string; archivo: string }) {
  const contenedor = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = contenedor.current;
    if (!el) return;
    const observador = new IntersectionObserver(
      (entradas) => {
        if (entradas.some((e) => e.isIntersecting)) {
          setVisible(true);
          observador.disconnect();
        }
      },
      { rootMargin: "200px" },
    );
    observador.observe(el);
    return () => observador.disconnect();
  }, []);

  return (
    <div ref={contenedor} className="relative aspect-video w-full overflow-hidden rounded-t-lg bg-black">
      {visible && (
        <video
          src={`/api/biblioteca/video?c=${encodeURIComponent(carpeta)}&n=${encodeURIComponent(archivo)}#t=0.5`}
          preload="metadata"
          muted
          playsInline
          className="h-full w-full object-cover"
        />
      )}
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
        <span className="flex h-10 w-10 items-center justify-center rounded-full bg-black/50 text-white">▶</span>
      </div>
    </div>
  );
}

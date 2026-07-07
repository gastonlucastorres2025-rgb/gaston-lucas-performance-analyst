"use client";

import { useState } from "react";
import { youtubeIdAndStart, type TrainingTask } from "@/lib/training-sheet";

export function SessionVideoPlayer({
  tareas,
  sesionCompletaUrl,
}: {
  tareas: TrainingTask[];
  sesionCompletaUrl: string | null;
}) {
  const sesionCompleta = youtubeIdAndStart(sesionCompletaUrl);
  const primeraTarea = tareas.find((t) => youtubeIdAndStart(t.url));

  const [activeLabel, setActiveLabel] = useState("Sesión completa");
  const [current, setCurrent] = useState(
    sesionCompleta ?? (primeraTarea ? youtubeIdAndStart(primeraTarea.url) : null),
  );

  return (
    <div className="grid gap-4 lg:grid-cols-[260px_1fr]">
      <div className="flex flex-col gap-1">
        {sesionCompleta && (
          <button
            onClick={() => {
              setCurrent(sesionCompleta);
              setActiveLabel("Sesión completa");
            }}
            className={`rounded-md border px-3 py-2 text-left text-sm font-semibold transition-colors ${
              activeLabel === "Sesión completa"
                ? "border-primary bg-primary/10 text-primary"
                : "border-border hover:bg-primary/5"
            }`}
          >
            ▶ Sesión completa
          </button>
        )}

        <p className="mt-2 mb-1 text-xs font-semibold uppercase tracking-wide text-foreground/50">
          Tareas
        </p>
        {tareas.map((tarea, i) => {
          const parsed = youtubeIdAndStart(tarea.url);
          return (
            <button
              key={i}
              disabled={!parsed}
              onClick={() => {
                if (!parsed) return;
                setCurrent(parsed);
                setActiveLabel(tarea.nombre);
              }}
              className={`rounded-md border px-3 py-2 text-left text-sm transition-colors ${
                activeLabel === tarea.nombre
                  ? "border-primary bg-primary/10 font-medium text-primary"
                  : parsed
                    ? "border-border hover:bg-primary/5"
                    : "cursor-not-allowed border-border text-foreground/30"
              }`}
            >
              {parsed ? "▶ " : ""}
              {tarea.nombre}
            </button>
          );
        })}
      </div>

      <div>
        {current ? (
          <div className="aspect-video overflow-hidden rounded-lg border border-border">
            <iframe
              key={`${current.videoId}-${current.start}`}
              src={`https://www.youtube-nocookie.com/embed/${current.videoId}?start=${current.start}`}
              className="h-full w-full"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          </div>
        ) : (
          <div className="flex aspect-video items-center justify-center rounded-lg border border-dashed border-border text-sm text-foreground/50">
            No hay video disponible para esta sesión.
          </div>
        )}
        <p className="mt-2 text-sm text-foreground/60">Reproduciendo: {activeLabel}</p>
      </div>
    </div>
  );
}

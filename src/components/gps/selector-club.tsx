"use client";

import { useTransition } from "react";
import { elegirClubGps } from "@/lib/gps/acciones";

/** Filtro de club del módulo GPS: los datos de cada club se ven por separado. */
export function SelectorClub({ clubes, activo }: { clubes: string[]; activo: string }) {
  const [pendiente, empezar] = useTransition();
  return (
    <label className="flex items-center gap-2 text-xs text-foreground/60">
      Club
      <select
        value={activo}
        disabled={pendiente}
        onChange={(e) => empezar(() => elegirClubGps(e.target.value))}
        className="rounded-md border border-border bg-surface px-2.5 py-1.5 text-sm font-medium text-foreground"
      >
        {clubes.map((c) => (
          <option key={c} value={c}>
            {c}
          </option>
        ))}
      </select>
    </label>
  );
}

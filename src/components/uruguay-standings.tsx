"use client";

import { useState } from "react";
import { StandingsTable } from "@/components/standings-table";

type Fila = { rank: number; nombre: string; escudo: string; jugados: number; puntos: number; diferencia?: number };

const TABS = ["Apertura", "Intermedio", "Clausura", "Anual"] as const;
type Tab = (typeof TABS)[number];

export function UruguayStandings({
  apertura,
  intermedioSerieA,
  intermedioSerieB,
  clausura,
  anual,
}: {
  apertura: Fila[];
  intermedioSerieA: Fila[];
  intermedioSerieB: Fila[];
  clausura: Fila[];
  anual: Fila[];
}) {
  const [tab, setTab] = useState<Tab>("Intermedio");

  return (
    <div>
      <div className="mb-4 flex flex-wrap gap-2">
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
              tab === t
                ? "border-primary bg-primary text-white"
                : "border-border bg-surface text-foreground/60 hover:bg-primary/5"
            }`}
          >
            Torneo {t}
          </button>
        ))}
      </div>

      {tab === "Apertura" && <StandingsTable filas={apertura} />}
      {tab === "Clausura" && <StandingsTable filas={clausura} />}
      {tab === "Anual" && <StandingsTable filas={anual} />}
      {tab === "Intermedio" && (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <StandingsTable titulo="Serie A" filas={intermedioSerieA} />
          <StandingsTable titulo="Serie B" filas={intermedioSerieB} />
        </div>
      )}
    </div>
  );
}

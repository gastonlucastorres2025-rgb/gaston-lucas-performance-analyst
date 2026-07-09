"use client";

import { useState } from "react";
import { RivalJugadores } from "@/components/rival-jugadores";
import { StandingsTable } from "@/components/standings-table";
import { SudamericanaCruces } from "@/components/sudamericana-cruces";

type Fila = { rank: number; nombre: string; escudo: string; jugados: number; puntos: number; diferencia?: number };
type Jugador = { nombre: string; foto: string; goles: number; asistencias: number };
type Cruce = {
  local: { nombre: string; escudo: string };
  visitante: { nombre: string; escudo: string };
  ida: { fecha: string; golesLocal: number | null; golesVisitante: number | null } | null;
  vuelta: { fecha: string; golesLocal: number | null; golesVisitante: number | null } | null;
};
type Rival = { nombre: string; goleadores: Jugador[]; asistidores: Jugador[] } | null;

const TABS = ["Apertura", "Intermedio", "Clausura", "Anual", "Sudamericana"] as const;
type Tab = (typeof TABS)[number];

function RivalSection({ rival }: { rival: Rival }) {
  if (!rival) return null;
  return (
    <div className="mt-5 border-t border-border pt-4">
      <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-foreground/50">
        Próximo rival: {rival.nombre}
      </h3>
      <RivalJugadores rival={rival.nombre} goleadores={rival.goleadores} asistidores={rival.asistidores} />
    </div>
  );
}

export function UruguayStandings({
  apertura,
  intermedioSerieA,
  intermedioSerieB,
  clausura,
  anual,
  cruces,
  rivalApertura,
  rivalIntermedio,
  rivalClausura,
  rivalSudamericana,
}: {
  apertura: Fila[];
  intermedioSerieA: Fila[];
  intermedioSerieB: Fila[];
  clausura: Fila[];
  anual: Fila[];
  cruces: Cruce[];
  rivalApertura: Rival;
  rivalIntermedio: Rival;
  rivalClausura: Rival;
  rivalSudamericana: Rival;
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
            {t === "Sudamericana" ? "Copa Sudamericana" : `Torneo ${t}`}
          </button>
        ))}
      </div>

      {tab === "Apertura" && (
        <>
          <StandingsTable filas={apertura} />
          <RivalSection rival={rivalApertura} />
        </>
      )}
      {tab === "Clausura" && (
        <>
          <StandingsTable filas={clausura} />
          <RivalSection rival={rivalClausura} />
        </>
      )}
      {tab === "Anual" && <StandingsTable filas={anual} />}
      {tab === "Intermedio" && (
        <>
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <StandingsTable titulo="Serie A" filas={intermedioSerieA} />
            <StandingsTable titulo="Serie B" filas={intermedioSerieB} />
          </div>
          <RivalSection rival={rivalIntermedio} />
        </>
      )}
      {tab === "Sudamericana" && (
        <>
          <SudamericanaCruces cruces={cruces} />
          <RivalSection rival={rivalSudamericana} />
        </>
      )}
    </div>
  );
}

"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { CAMPO_FECHA_CLASE, CampoSelect } from "@/components/gps/campo-select";
import { formatearNombreJugador } from "@/lib/gps-nombres";

const OPCIONES_MD = [
  { valor: "", label: "Todos" },
  { valor: "MD", label: "Partido" },
  { valor: "MD+1", label: "M+1" },
  { valor: "MD+2", label: "M+2" },
  { valor: "MD+3", label: "M+3" },
  { valor: "MD-1", label: "M-1" },
  { valor: "MD-2", label: "M-2" },
  { valor: "MD-3", label: "M-3" },
  { valor: "MD-4", label: "M-4" },
];

function Etiqueta({ children }: { children: React.ReactNode }) {
  return <label className="block text-[11px] font-semibold uppercase tracking-wider text-foreground/40">{children}</label>;
}

export function FiltrosGps({
  basePath,
  jugadores,
  partidos,
  valores,
}: {
  basePath: string;
  jugadores: string[];
  partidos: { id: string; fecha: string; rival: string }[];
  valores: { desde?: string; hasta?: string; jugador?: string; md?: string; partido?: string };
}) {
  const router = useRouter();
  const [desde, setDesde] = useState(valores.desde ?? "");
  const [hasta, setHasta] = useState(valores.hasta ?? "");

  // Si la URL cambia por otra vía (atrás/adelante del navegador, "Limpiar filtros", elegir un
  // partido), estos campos tienen que reflejar siempre lo que está realmente activo — nunca un
  // valor tipeado que quedó sin aplicar. Ajuste durante el render (no en un efecto), siguiendo el
  // patrón recomendado por React para sincronizar estado con un prop que cambió.
  const [prevDesde, setPrevDesde] = useState(valores.desde);
  const [prevHasta, setPrevHasta] = useState(valores.hasta);
  if (valores.desde !== prevDesde) {
    setPrevDesde(valores.desde);
    setDesde(valores.desde ?? "");
  }
  if (valores.hasta !== prevHasta) {
    setPrevHasta(valores.hasta);
    setHasta(valores.hasta ?? "");
  }

  function actualizar(cambios: Record<string, string | undefined>) {
    const params = new URLSearchParams();
    const siguiente = { desde, hasta, jugador: valores.jugador, md: valores.md, partido: valores.partido, ...cambios };
    for (const [k, v] of Object.entries(siguiente)) {
      if (v) params.set(k, v);
    }
    router.push(`${basePath}${params.toString() ? `?${params.toString()}` : ""}`);
  }

  const hayFiltrosActivos = Boolean(valores.desde || valores.hasta || valores.jugador || valores.md || valores.partido);

  return (
    <div className="flex flex-wrap items-end gap-x-8 gap-y-5 rounded-xl border border-border bg-surface px-6 py-5 shadow-sm">
      <div className="flex flex-col gap-2">
        <Etiqueta>Desde</Etiqueta>
        <input
          type="date"
          value={desde}
          onChange={(e) => {
            const v = e.target.value;
            setDesde(v);
            actualizar({ desde: v || undefined });
          }}
          className={CAMPO_FECHA_CLASE}
        />
      </div>
      <div className="flex flex-col gap-2">
        <Etiqueta>Hasta</Etiqueta>
        <input
          type="date"
          value={hasta}
          onChange={(e) => {
            const v = e.target.value;
            setHasta(v);
            actualizar({ hasta: v || undefined });
          }}
          className={CAMPO_FECHA_CLASE}
        />
      </div>
      <div className="hidden h-10 w-px bg-border sm:block" />
      <div className="flex flex-col gap-2">
        <Etiqueta>Jugador</Etiqueta>
        <CampoSelect value={valores.jugador ?? ""} onChange={(e) => actualizar({ jugador: e.target.value || undefined })} className="min-w-[11rem]">
          <option value="">Todos</option>
          {jugadores.map((j) => (
            <option key={j} value={j}>
              {formatearNombreJugador(j)}
            </option>
          ))}
        </CampoSelect>
      </div>
      <div className="flex flex-col gap-2">
        <Etiqueta>MD</Etiqueta>
        <CampoSelect value={valores.md ?? ""} onChange={(e) => actualizar({ md: e.target.value || undefined })} className="min-w-[6.5rem]">
          {OPCIONES_MD.map((o) => (
            <option key={o.valor} value={o.valor}>
              {o.label}
            </option>
          ))}
        </CampoSelect>
      </div>
      {partidos.length > 0 && (
        <>
          <div className="hidden h-10 w-px bg-border sm:block" />
          <div className="flex flex-col gap-2">
            <Etiqueta>Microciclo de partido</Etiqueta>
            <CampoSelect
              value={valores.partido ?? ""}
              onChange={(e) => {
                const p = partidos.find((x) => x.id === e.target.value);
                if (!p) {
                  actualizar({ partido: undefined });
                  return;
                }
                const idx = partidos.indexOf(p);
                const anterior = partidos[idx - 1];
                const inicio = anterior ? sumarDia(anterior.fecha) : restarDias(p.fecha, 7);
                setDesde(inicio);
                setHasta(p.fecha);
                actualizar({ partido: p.id, desde: inicio, hasta: p.fecha, md: undefined });
              }}
              className="min-w-[13rem]"
            >
              <option value="">Elegir partido…</option>
              {partidos.map((p) => (
                <option key={p.id} value={p.id}>
                  {new Date(`${p.fecha}T00:00:00`).toLocaleDateString("es-UY", { day: "2-digit", month: "2-digit" })} vs {p.rival}
                </option>
              ))}
            </CampoSelect>
          </div>
        </>
      )}
      {hayFiltrosActivos && (
        <button
          onClick={() => {
            setDesde("");
            setHasta("");
            router.push(basePath);
          }}
          className="rounded-lg px-3 py-2.5 text-xs font-medium text-foreground/45 transition-colors hover:bg-accent/5 hover:text-accent"
        >
          Limpiar filtros
        </button>
      )}
    </div>
  );
}

function sumarDia(fecha: string): string {
  const d = new Date(`${fecha}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + 1);
  return d.toISOString().slice(0, 10);
}

function restarDias(fecha: string, dias: number): string {
  const d = new Date(`${fecha}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() - dias);
  return d.toISOString().slice(0, 10);
}

"use client";

import { pdf } from "@react-pdf/renderer";
import { useState, useTransition } from "react";
import { SesionPdfDocument } from "@/components/sesion-pdf";
import {
  guardarEquipos,
  guardarJugadoresEstado,
  guardarPlanSesion,
  type Equipo,
  type EstadoJugador,
} from "@/lib/sesiones-actions";

type Jugador = {
  id: string;
  nombre: string;
  apellido: string;
  dorsal: number | null;
  foto_url: string | null;
  posicion_principal: string | null;
};

type Sesion = {
  lugar: string | null;
  activacion: string | null;
  introductorio: string | null;
  principal: string | null;
  objetivos_tarea: string | null;
  objetivos_fisicos: string | null;
  jugadores_estado: Record<string, EstadoJugador> | null;
  equipos: Equipo[] | null;
} | null;

const ESTADO_COLUMNAS: { key: "sin_asignar" | EstadoJugador; label: string; borderColor: string }[] = [
  { key: "sin_asignar", label: "Sin asignar", borderColor: "border-t-foreground/20" },
  { key: "habilitado", label: "Habilitados", borderColor: "border-t-emerald-500" },
  { key: "recuperacion", label: "En recuperación", borderColor: "border-t-amber-400" },
  { key: "reduccion", label: "Reducción de tareas", borderColor: "border-t-accent" },
];

function nombreCompleto(j: Jugador) {
  return `${j.nombre} ${j.apellido}`;
}

function Avatar({ jugador }: { jugador: Jugador }) {
  if (jugador.foto_url) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={jugador.foto_url}
        alt=""
        width={28}
        height={28}
        draggable={false}
        className="pointer-events-none h-7 w-7 rounded-full object-cover"
      />
    );
  }
  return (
    <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/10 text-[10px] font-semibold text-primary">
      {jugador.nombre[0]}
      {jugador.apellido[0]}
    </div>
  );
}

export function SesionPlanificador({
  fecha,
  sesion,
  jugadores,
}: {
  fecha: string;
  sesion: Sesion;
  jugadores: Jugador[];
}) {
  const [, startTransition] = useTransition();
  const [pdfPending, setPdfPending] = useState(false);
  const [syncStatus, setSyncStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");

  const [plan, setPlan] = useState({
    lugar: sesion?.lugar ?? "",
    activacion: sesion?.activacion ?? "",
    introductorio: sesion?.introductorio ?? "",
    principal: sesion?.principal ?? "",
    objetivos_tarea: sesion?.objetivos_tarea ?? "",
    objetivos_fisicos: sesion?.objetivos_fisicos ?? "",
  });
  const [planStatus, setPlanStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");

  const [jugadoresEstado, setJugadoresEstado] = useState<Record<string, EstadoJugador>>(
    sesion?.jugadores_estado ?? {},
  );

  const [equipos, setEquipos] = useState<Equipo[]>(
    sesion?.equipos && sesion.equipos.length > 0
      ? sesion.equipos
      : [
          { nombre: "Equipo A", jugadores: [] },
          { nombre: "Equipo B", jugadores: [] },
        ],
  );

  const jugadoresById = new Map(jugadores.map((j) => [j.id, j]));

  function columnaDe(playerId: string): "sin_asignar" | EstadoJugador {
    return jugadoresEstado[playerId] ?? "sin_asignar";
  }

  function handleDropEnEstado(e: React.DragEvent<HTMLDivElement>, columna: "sin_asignar" | EstadoJugador) {
    e.preventDefault();
    const playerId = e.dataTransfer.getData("text/plain");
    if (!playerId) return;

    const next = { ...jugadoresEstado };
    if (columna === "sin_asignar") {
      delete next[playerId];
    } else {
      next[playerId] = columna;
    }

    setJugadoresEstado(next);
    setSyncStatus("saving");
    startTransition(async () => {
      const result = await guardarJugadoresEstado(fecha, next);
      setSyncStatus(result.error ? "error" : "saved");
      if (!result.error) setTimeout(() => setSyncStatus("idle"), 2000);
    });
  }

  async function handleGuardarPlan() {
    setPlanStatus("saving");
    const result = await guardarPlanSesion(fecha, plan);
    setPlanStatus(result.error ? "error" : "saved");
    if (!result.error) {
      setTimeout(() => setPlanStatus("idle"), 2000);
    }
  }

  function playersEnEquipo(nombre: string) {
    return equipos.find((eq) => eq.nombre === nombre)?.jugadores ?? [];
  }

  function actualizarEquipos(next: Equipo[]) {
    setEquipos(next);
    setSyncStatus("saving");
    startTransition(async () => {
      const result = await guardarEquipos(fecha, next);
      setSyncStatus(result.error ? "error" : "saved");
      if (!result.error) setTimeout(() => setSyncStatus("idle"), 2000);
    });
  }

  function handleDropEnEquipo(e: React.DragEvent<HTMLDivElement>, nombreEquipo: string) {
    e.preventDefault();
    const playerId = e.dataTransfer.getData("text/plain");
    if (!playerId) return;

    const next = equipos.map((eq) => ({
      ...eq,
      jugadores: eq.jugadores.filter((id) => id !== playerId),
    }));
    const destino = next.find((eq) => eq.nombre === nombreEquipo);
    if (destino && !destino.jugadores.includes(playerId)) {
      destino.jugadores.push(playerId);
    }
    actualizarEquipos(next);
  }

  function handleDropEnPool(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    const playerId = e.dataTransfer.getData("text/plain");
    if (!playerId) return;
    const next = equipos.map((eq) => ({
      ...eq,
      jugadores: eq.jugadores.filter((id) => id !== playerId),
    }));
    actualizarEquipos(next);
  }

  function quitarDeEquipo(nombreEquipo: string, playerId: string) {
    const next = equipos.map((eq) =>
      eq.nombre === nombreEquipo ? { ...eq, jugadores: eq.jugadores.filter((id) => id !== playerId) } : eq,
    );
    actualizarEquipos(next);
  }

  function agregarEquipo() {
    const letra = String.fromCharCode(65 + equipos.length);
    actualizarEquipos([...equipos, { nombre: `Equipo ${letra}`, jugadores: [] }]);
  }

  function eliminarEquipo(nombreEquipo: string) {
    actualizarEquipos(equipos.filter((eq) => eq.nombre !== nombreEquipo));
  }

  const idsEnEquipo = new Set(equipos.flatMap((eq) => eq.jugadores));
  const poolHabilitados = jugadores.filter(
    (j) => columnaDe(j.id) === "habilitado" && !idsEnEquipo.has(j.id),
  );

  const habilitados = jugadores.filter((j) => columnaDe(j.id) === "habilitado");
  const recuperacion = jugadores.filter((j) => columnaDe(j.id) === "recuperacion");
  const reduccion = jugadores.filter((j) => columnaDe(j.id) === "reduccion");

  async function handleDescargarPdf() {
    setPdfPending(true);
    try {
      const crestUrl = `${window.location.origin}/escudo-nacional.png`;
      const blob = await pdf(
        <SesionPdfDocument
          data={{
            fecha,
            lugar: plan.lugar,
            activacion: plan.activacion,
            introductorio: plan.introductorio,
            principal: plan.principal,
            objetivos_tarea: plan.objetivos_tarea,
            objetivos_fisicos: plan.objetivos_fisicos,
            habilitados: habilitados.map(nombreCompleto),
            recuperacion: recuperacion.map(nombreCompleto),
            reduccion: reduccion.map(nombreCompleto),
            equipos: equipos.map((eq) => ({
              nombre: eq.nombre,
              jugadores: eq.jugadores.map((id) => (jugadoresById.get(id) ? nombreCompleto(jugadoresById.get(id)!) : "")),
            })),
            crestUrl,
          }}
        />,
      ).toBlob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `sesion-${fecha}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setPdfPending(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex justify-end">
        <button
          onClick={handleDescargarPdf}
          disabled={pdfPending}
          className="rounded-md bg-accent px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-accent/90 disabled:opacity-50"
        >
          {pdfPending ? "Generando PDF..." : "⬇ Descargar PDF"}
        </button>
      </div>

      <div className="rounded-xl border border-border bg-surface p-5 shadow-sm">
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-foreground/50">Plan de la sesión</h2>
        <div className="flex flex-col gap-3">
          <input
            type="text"
            placeholder="Lugar"
            value={plan.lugar}
            onChange={(e) => setPlan({ ...plan, lugar: e.target.value })}
            className="rounded border border-border px-3 py-2 text-sm focus:border-primary focus:outline-none"
          />
          <Campo label="Activación" value={plan.activacion} onChange={(v) => setPlan({ ...plan, activacion: v })} />
          <Campo
            label="Introductorio"
            value={plan.introductorio}
            onChange={(v) => setPlan({ ...plan, introductorio: v })}
          />
          <Campo label="Principal" value={plan.principal} onChange={(v) => setPlan({ ...plan, principal: v })} />
          <Campo
            label="Objetivos de la tarea"
            value={plan.objetivos_tarea}
            onChange={(v) => setPlan({ ...plan, objetivos_tarea: v })}
          />
          <Campo
            label="Objetivos físicos"
            value={plan.objetivos_fisicos}
            onChange={(v) => setPlan({ ...plan, objetivos_fisicos: v })}
          />
          <div className="flex items-center gap-3">
            <button
              onClick={handleGuardarPlan}
              disabled={planStatus === "saving"}
              className="self-start rounded-md bg-primary px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-primary-dark disabled:opacity-50"
            >
              {planStatus === "saving" ? "Guardando..." : "Guardar plan"}
            </button>
            {planStatus === "saved" && <span className="text-sm text-emerald-600">Guardado ✓</span>}
            {planStatus === "error" && <span className="text-sm text-accent">Error al guardar</span>}
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-surface p-5 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-foreground/50">
            Disponibilidad del plantel
            <SyncBadge status={syncStatus} />
          </h2>
          <div className="flex gap-4 text-xs text-foreground/60">
            <span>
              <strong className="text-emerald-600">{habilitados.length}</strong> habilitados
            </span>
            <span>
              <strong className="text-amber-600">{recuperacion.length}</strong> en recuperación
            </span>
            <span>
              <strong className="text-accent">{reduccion.length}</strong> reducción
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {ESTADO_COLUMNAS.map((col) => (
            <div
              key={col.key}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => handleDropEnEstado(e, col.key)}
              className={`min-h-[160px] rounded-lg border border-t-4 border-border bg-background/40 p-2 ${col.borderColor}`}
            >
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-foreground/50">
                {col.label} ({jugadores.filter((j) => columnaDe(j.id) === col.key).length})
              </p>
              <div className="flex flex-col gap-1.5">
                {jugadores
                  .filter((j) => columnaDe(j.id) === col.key)
                  .map((j) => (
                    <div
                      key={j.id}
                      draggable
                      onDragStart={(e) => e.dataTransfer.setData("text/plain", j.id)}
                      className="flex cursor-move items-center gap-2 rounded-md border border-border bg-surface px-2 py-1.5 text-xs shadow-sm"
                    >
                      <Avatar jugador={j} />
                      <span className="min-w-0 flex-1 truncate">{nombreCompleto(j)}</span>
                      {j.dorsal != null && <span className="text-foreground/40">#{j.dorsal}</span>}
                    </div>
                  ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-xl border border-border bg-surface p-5 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-foreground/50">
            Armar equipos
            <SyncBadge status={syncStatus} />
          </h2>
          <button
            onClick={agregarEquipo}
            className="rounded-full border border-border px-3 py-1 text-xs font-medium text-foreground/60 transition-colors hover:bg-primary/5"
          >
            + Agregar equipo
          </button>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleDropEnPool}
            className="min-h-[160px] rounded-lg border border-t-4 border-t-primary/40 border-border bg-background/40 p-2"
          >
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-foreground/50">
              Disponibles ({poolHabilitados.length})
            </p>
            <div className="flex flex-col gap-1.5">
              {poolHabilitados.map((j) => (
                <div
                  key={j.id}
                  draggable
                  onDragStart={(e) => e.dataTransfer.setData("text/plain", j.id)}
                  className="flex cursor-move items-center gap-2 rounded-md border border-border bg-surface px-2 py-1.5 text-xs shadow-sm"
                >
                  <Avatar jugador={j} />
                  <span className="min-w-0 flex-1 truncate">{nombreCompleto(j)}</span>
                </div>
              ))}
              {poolHabilitados.length === 0 && (
                <p className="text-xs text-foreground/40">No hay jugadores habilitados sin asignar.</p>
              )}
            </div>
          </div>

          {equipos.map((eq) => (
            <div
              key={eq.nombre}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => handleDropEnEquipo(e, eq.nombre)}
              className="min-h-[160px] rounded-lg border border-t-4 border-t-accent/60 border-border bg-background/40 p-2"
            >
              <div className="mb-2 flex items-center justify-between gap-2">
                <input
                  value={eq.nombre}
                  onChange={(e) => {
                    const next = equipos.map((it) => (it.nombre === eq.nombre ? { ...it, nombre: e.target.value } : it));
                    setEquipos(next);
                  }}
                  onBlur={() => actualizarEquipos(equipos)}
                  className="w-full bg-transparent text-xs font-semibold uppercase tracking-wide text-foreground/70 focus:outline-none"
                />
                <button
                  onClick={() => eliminarEquipo(eq.nombre)}
                  className="shrink-0 text-xs text-foreground/30 hover:text-accent"
                >
                  ✕
                </button>
              </div>
              <div className="flex flex-col gap-1.5">
                {playersEnEquipo(eq.nombre).map((id) => {
                  const j = jugadoresById.get(id);
                  if (!j) return null;
                  return (
                    <div
                      key={id}
                      draggable
                      onDragStart={(e) => e.dataTransfer.setData("text/plain", id)}
                      className="flex cursor-move items-center gap-2 rounded-md border border-border bg-surface px-2 py-1.5 text-xs shadow-sm"
                    >
                      <Avatar jugador={j} />
                      <span className="min-w-0 flex-1 truncate">{nombreCompleto(j)}</span>
                      <button
                        onClick={() => quitarDeEquipo(eq.nombre, id)}
                        className="shrink-0 text-foreground/30 hover:text-accent"
                      >
                        ✕
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function SyncBadge({ status }: { status: "idle" | "saving" | "saved" | "error" }) {
  if (status === "idle") return null;
  if (status === "saving") return <span className="text-[10px] font-normal normal-case text-foreground/40">Guardando...</span>;
  if (status === "error")
    return <span className="text-[10px] font-normal normal-case text-accent">No se pudo guardar</span>;
  return <span className="text-[10px] font-normal normal-case text-emerald-600">Guardado ✓</span>;
}

function Campo({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-xs font-medium text-foreground/50">{label}</span>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={2}
        className="rounded border border-border px-3 py-2 text-sm focus:border-primary focus:outline-none"
      />
    </label>
  );
}

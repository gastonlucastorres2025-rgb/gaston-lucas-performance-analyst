"use client";

import { useActionState, useState, useTransition } from "react";
import { crearTarea, eliminarTarea, toggleTareaCompletada } from "@/lib/tareas-actions";

type Tarea = {
  id: string;
  titulo: string;
  descripcion: string | null;
  fecha: string;
  hora: string;
  completada: boolean;
  notificado: boolean;
};

function toDateTime(fecha: string, hora: string): Date {
  return new Date(`${fecha}T${hora}`);
}

function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function formatFechaHora(fecha: string, hora: string): string {
  const dt = toDateTime(fecha, hora);
  const fechaTexto = dt.toLocaleDateString("es-UY", { weekday: "short", day: "numeric", month: "short" });
  return `${fechaTexto} · ${hora.slice(0, 5)}`;
}

export function TareasPanel({ tareas }: { tareas: Tarea[] }) {
  const [formState, formAction, pending] = useActionState(crearTarea, { error: null, success: false });
  const [items, setItems] = useState(tareas);
  const [, startTransition] = useTransition();
  const [showForm, setShowForm] = useState(false);

  function handleToggle(id: string, completada: boolean) {
    setItems((prev) => prev.map((t) => (t.id === id ? { ...t, completada } : t)));
    startTransition(() => {
      toggleTareaCompletada(id, completada);
    });
  }

  function handleDelete(id: string) {
    setItems((prev) => prev.filter((t) => t.id !== id));
    startTransition(() => {
      eliminarTarea(id);
    });
  }

  const now = new Date();
  const endOfWeek = new Date(now);
  endOfWeek.setDate(endOfWeek.getDate() + 7);

  const pendientes = items.filter((t) => !t.completada);
  const completadas = items.filter((t) => t.completada);

  const vencidas = pendientes.filter((t) => toDateTime(t.fecha, t.hora) < now);
  const hoy = pendientes.filter((t) => {
    const dt = toDateTime(t.fecha, t.hora);
    return dt >= now && isSameDay(dt, now);
  });
  const semana = pendientes.filter((t) => {
    const dt = toDateTime(t.fecha, t.hora);
    return dt >= now && !isSameDay(dt, now) && dt <= endOfWeek;
  });
  const masAdelante = pendientes.filter((t) => toDateTime(t.fecha, t.hora) > endOfWeek);

  return (
    <div>
      <div className="mb-6 flex justify-end">
        <button
          onClick={() => setShowForm((v) => !v)}
          className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-primary-dark"
        >
          {showForm ? "Cancelar" : "+ Nueva tarea"}
        </button>
      </div>

      {showForm && (
        <form
          action={(fd) => {
            formAction(fd);
            setShowForm(false);
          }}
          className="mb-6 flex flex-col gap-3 rounded-xl border border-border bg-surface p-4 shadow-sm"
        >
          <input
            type="text"
            name="titulo"
            placeholder="Título de la tarea"
            required
            className="rounded border border-border px-3 py-2 text-sm focus:border-primary focus:outline-none"
          />
          <textarea
            name="descripcion"
            placeholder="Notas (opcional)"
            rows={2}
            className="rounded border border-border px-3 py-2 text-sm focus:border-primary focus:outline-none"
          />
          <div className="flex gap-3">
            <input
              type="date"
              name="fecha"
              required
              defaultValue={new Date().toISOString().slice(0, 10)}
              className="flex-1 rounded border border-border px-3 py-2 text-sm focus:border-primary focus:outline-none"
            />
            <input
              type="time"
              name="hora"
              required
              defaultValue="09:00"
              className="w-32 rounded border border-border px-3 py-2 text-sm focus:border-primary focus:outline-none"
            />
          </div>
          {formState.error && <p className="text-sm text-accent">{formState.error}</p>}
          <button
            type="submit"
            disabled={pending}
            className="self-start rounded-md bg-primary px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-primary-dark disabled:opacity-50"
          >
            {pending ? "Guardando..." : "Guardar tarea"}
          </button>
        </form>
      )}

      <TareaGrupo titulo="Vencidas" tareas={vencidas} tono="vencida" onToggle={handleToggle} onDelete={handleDelete} />
      <TareaGrupo titulo="Hoy" tareas={hoy} tono="hoy" onToggle={handleToggle} onDelete={handleDelete} />
      <TareaGrupo titulo="Esta semana" tareas={semana} tono="normal" onToggle={handleToggle} onDelete={handleDelete} />
      <TareaGrupo titulo="Más adelante" tareas={masAdelante} tono="normal" onToggle={handleToggle} onDelete={handleDelete} />
      <TareaGrupo titulo="Completadas" tareas={completadas} tono="completada" onToggle={handleToggle} onDelete={handleDelete} />

      {items.length === 0 && (
        <p className="py-10 text-center text-sm text-foreground/50">
          No tenés tareas cargadas. Creá la primera con el botón de arriba.
        </p>
      )}
    </div>
  );
}

function TareaGrupo({
  titulo,
  tareas,
  tono,
  onToggle,
  onDelete,
}: {
  titulo: string;
  tareas: Tarea[];
  tono: "vencida" | "hoy" | "normal" | "completada";
  onToggle: (id: string, completada: boolean) => void;
  onDelete: (id: string) => void;
}) {
  if (tareas.length === 0) return null;

  const borderColor =
    tono === "vencida" ? "border-l-accent" : tono === "hoy" ? "border-l-amber-400" : "border-l-primary/40";

  return (
    <div className="mb-6">
      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-foreground/50">
        {titulo} <span className="text-foreground/30">({tareas.length})</span>
      </h2>
      <div className="flex flex-col gap-2">
        {tareas.map((t) => (
          <div
            key={t.id}
            className={`flex items-start gap-3 rounded-xl border border-border border-l-4 bg-surface px-4 py-3 shadow-sm ${
              tono === "completada" ? "border-l-border opacity-60" : borderColor
            }`}
          >
            <input
              type="checkbox"
              checked={t.completada}
              onChange={(e) => onToggle(t.id, e.target.checked)}
              className="mt-1 h-4 w-4 accent-primary"
            />
            <div className="min-w-0 flex-1">
              <p className={`font-medium ${t.completada ? "line-through text-foreground/50" : ""}`}>{t.titulo}</p>
              {t.descripcion && <p className="text-sm text-foreground/60">{t.descripcion}</p>}
              <p className="mt-0.5 text-xs capitalize text-foreground/40">{formatFechaHora(t.fecha, t.hora)}</p>
            </div>
            <button
              onClick={() => onDelete(t.id)}
              className="shrink-0 text-xs text-foreground/40 transition-colors hover:text-accent"
            >
              Eliminar
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

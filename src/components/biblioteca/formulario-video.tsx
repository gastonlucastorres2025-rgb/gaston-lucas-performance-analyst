"use client";

import { useState, useTransition } from "react";
import { guardarVideoBiblioteca } from "@/lib/biblioteca/acciones";

const CAMPO = "w-full rounded-md border border-border bg-surface px-3 py-2 text-sm";

export function FormularioVideo({ carpeta, archivo, inicial, puedeEditar }: { carpeta: string; archivo: string; inicial: { titulo: string; etiquetas: string[]; notas: string }; puedeEditar: boolean }) {
  const [titulo, setTitulo] = useState(inicial.titulo);
  const [etiquetas, setEtiquetas] = useState(inicial.etiquetas.join(", "));
  const [notas, setNotas] = useState(inicial.notas);
  const [mensaje, setMensaje] = useState<{ tipo: "ok" | "error"; texto: string } | null>(null);
  const [pendiente, empezar] = useTransition();

  if (!puedeEditar) {
    return (
      <div className="space-y-3 text-sm">
        <div>
          <div className="text-xs text-foreground/60">Título</div>
          <div>{inicial.titulo || "—"}</div>
        </div>
        <div>
          <div className="text-xs text-foreground/60">Etiquetas</div>
          <div>{inicial.etiquetas.join(", ") || "—"}</div>
        </div>
        <div>
          <div className="text-xs text-foreground/60">Notas</div>
          <div className="whitespace-pre-wrap">{inicial.notas || "—"}</div>
        </div>
        <p className="text-xs text-foreground/50">Tu usuario es de solo lectura: podés ver los videos, pero no editar sus datos.</p>
      </div>
    );
  }

  return (
    <form
      className="space-y-3"
      onSubmit={(e) => {
        e.preventDefault();
        setMensaje(null);
        empezar(async () => {
          const r = await guardarVideoBiblioteca(carpeta, archivo, { titulo, etiquetas: etiquetas.split(","), notas });
          setMensaje(r.ok ? { tipo: "ok", texto: "Guardado." } : { tipo: "error", texto: r.error });
        });
      }}
    >
      <label className="block text-xs text-foreground/60">
        Título
        <input value={titulo} onChange={(e) => setTitulo(e.target.value)} placeholder="Un nombre claro para este video" className={`${CAMPO} mt-1`} />
      </label>
      <label className="block text-xs text-foreground/60">
        Etiquetas (separadas por coma)
        <input value={etiquetas} onChange={(e) => setEtiquetas(e.target.value)} placeholder="ej. salida de 3, bloque medio, ABP" className={`${CAMPO} mt-1`} />
      </label>
      <label className="block text-xs text-foreground/60">
        Notas
        <textarea value={notas} onChange={(e) => setNotas(e.target.value)} rows={6} placeholder="Qué mostrar, qué corregir, cuándo usarlo…" className={`${CAMPO} mt-1`} />
      </label>
      <div className="flex items-center gap-3">
        <button type="submit" disabled={pendiente} className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-dark disabled:opacity-50">
          {pendiente ? "Guardando…" : "Guardar"}
        </button>
        {mensaje && <span className={`text-sm ${mensaje.tipo === "ok" ? "text-emerald-700" : "text-red-700"}`}>{mensaje.texto}</span>}
      </div>
    </form>
  );
}

"use client";

import { useState, useTransition } from "react";
import { Insignia, Tarjeta, formatearFecha } from "@/components/gps/piezas";
import { cambiarEstadoLesion, crearLesion, eliminarLesion, type ResultadoAccion } from "@/lib/gps/acciones";
import { diasEntre } from "@/lib/gps/calculos";
import type { EstadoLesion, Lesion } from "@/lib/gps/datos";

const ESTADOS: EstadoLesion[] = ["Activa", "En recuperación", "Alta"];
const CAMPO = "w-full rounded-md border border-border bg-surface px-2.5 py-1.5 text-sm";

function diasDeBaja(l: Lesion, hoy: string): string {
  if (l.fechaAlta) return `${diasEntre(l.fecha, l.fechaAlta)} días (volvió ${formatearFecha(l.fechaAlta)})`;
  return `en curso (${diasEntre(l.fecha, hoy)} d)`;
}

export function LesionesPanel({ club, lesiones, jugadores, puedeEditar, hoy }: { club: string; lesiones: Lesion[]; jugadores: string[]; puedeEditar: boolean; hoy: string }) {
  const [error, setError] = useState<string | null>(null);
  const [pendiente, empezar] = useTransition();
  const [filtroJugador, setFiltroJugador] = useState("");
  const [filtroEstado, setFiltroEstado] = useState("");

  function ejecutar(accion: () => Promise<ResultadoAccion>, alTerminar?: () => void) {
    setError(null);
    empezar(async () => {
      const r = await accion();
      if (!r.ok) setError(r.error);
      else alTerminar?.();
    });
  }

  const visibles = lesiones.filter((l) => (!filtroJugador || l.jugador === filtroJugador) && (!filtroEstado || l.estado === filtroEstado));

  return (
    <div>
      {puedeEditar && (
        <Tarjeta titulo="Registrar molestia o lesión">
          <form
            className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4"
            onSubmit={(e) => {
              e.preventDefault();
              const form = e.currentTarget;
              const f = new FormData(form);
              ejecutar(
                () =>
                  crearLesion({
                    club,
                    jugador: String(f.get("jugador") ?? ""),
                    fecha: String(f.get("fecha") ?? ""),
                    tipo: f.get("tipo") === "Lesión" ? "Lesión" : "Molestia",
                    zona: String(f.get("zona") ?? ""),
                    estado: ESTADOS.find((s) => s === f.get("estado")) ?? "Activa",
                    notas: String(f.get("notas") ?? ""),
                  }),
                () => form.reset(),
              );
            }}
          >
            <label className="text-xs text-foreground/60">
              Jugador
              <select name="jugador" required className={CAMPO} defaultValue="">
                <option value="" disabled>
                  Elegí un jugador
                </option>
                {jugadores.map((j) => (
                  <option key={j} value={j}>
                    {j}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-xs text-foreground/60">
              Fecha
              <input type="date" name="fecha" required defaultValue={hoy} className={CAMPO} />
            </label>
            <label className="text-xs text-foreground/60">
              Tipo
              <select name="tipo" className={CAMPO}>
                <option>Molestia</option>
                <option>Lesión</option>
              </select>
            </label>
            <label className="text-xs text-foreground/60">
              Estado
              <select name="estado" className={CAMPO}>
                {ESTADOS.map((s) => (
                  <option key={s}>{s}</option>
                ))}
              </select>
            </label>
            <label className="text-xs text-foreground/60 sm:col-span-2">
              Zona
              <input type="text" name="zona" placeholder="ej. isquiotibial der." className={CAMPO} />
            </label>
            <label className="text-xs text-foreground/60 sm:col-span-2">
              Notas
              <input type="text" name="notas" placeholder="mecanismo, diagnóstico, contexto…" className={CAMPO} />
            </label>
            <div className="sm:col-span-2 lg:col-span-4">
              <button type="submit" disabled={pendiente} className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-dark disabled:opacity-50">
                + Agregar
              </button>
            </div>
          </form>
        </Tarjeta>
      )}

      {error && <div className="mb-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">{error}</div>}

      <Tarjeta
        titulo="Historial de molestias y lesiones"
        nota="Ordenado de más reciente a más antiguo. Pasar a “Alta” no borra el registro: queda siempre en el historial y solo se elimina con la ✕."
      >
        <div className="mb-3 flex flex-wrap gap-3">
          <label className="text-xs text-foreground/60">
            Jugador
            <select value={filtroJugador} onChange={(e) => setFiltroJugador(e.target.value)} className={`${CAMPO} mt-0.5`}>
              <option value="">Todos</option>
              {jugadores.map((j) => (
                <option key={j}>{j}</option>
              ))}
            </select>
          </label>
          <label className="text-xs text-foreground/60">
            Estado
            <select value={filtroEstado} onChange={(e) => setFiltroEstado(e.target.value)} className={`${CAMPO} mt-0.5`}>
              <option value="">Todos</option>
              {ESTADOS.map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>
          </label>
        </div>

        {visibles.length === 0 ? (
          <p className="py-4 text-sm text-foreground/60">{lesiones.length ? "Ningún registro con ese filtro." : "Todavía no hay registros cargados."}</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs text-foreground/60">
                  <th className="py-2 pr-3 font-medium">Fecha</th>
                  <th className="px-3 py-2 font-medium">Jugador</th>
                  <th className="px-3 py-2 font-medium">Tipo</th>
                  <th className="px-3 py-2 font-medium">Zona</th>
                  <th className="px-3 py-2 font-medium">Estado</th>
                  <th className="px-3 py-2 font-medium">Días de baja</th>
                  <th className="px-3 py-2 font-medium">Notas</th>
                  {puedeEditar && <th />}
                </tr>
              </thead>
              <tbody>
                {visibles.map((l) => (
                  <tr key={l.id} className="border-b border-border/60 align-top">
                    <td className="py-2 pr-3 whitespace-nowrap">{formatearFecha(l.fecha)}</td>
                    <td className="px-3 py-2 font-medium">{l.jugador}</td>
                    <td className="px-3 py-2">{l.tipo}</td>
                    <td className="px-3 py-2">{l.zona || "—"}</td>
                    <td className="px-3 py-2">
                      {puedeEditar ? (
                        <select
                          value={l.estado}
                          disabled={pendiente}
                          onChange={(e) => ejecutar(() => cambiarEstadoLesion(l.id, e.target.value as EstadoLesion))}
                          className="rounded-md border border-border bg-surface px-1.5 py-1 text-xs"
                        >
                          {ESTADOS.map((s) => (
                            <option key={s}>{s}</option>
                          ))}
                        </select>
                      ) : (
                        <Insignia color={l.estado === "Activa" ? "rojo" : l.estado === "Alta" ? "verde" : "amarillo"}>{l.estado}</Insignia>
                      )}
                    </td>
                    <td className="px-3 py-2 text-foreground/70">{diasDeBaja(l, hoy)}</td>
                    <td className="max-w-[18rem] px-3 py-2 text-foreground/70">{l.notas}</td>
                    {puedeEditar && (
                      <td className="px-3 py-2">
                        <button
                          type="button"
                          title="Eliminar"
                          disabled={pendiente}
                          onClick={() => {
                            if (confirm("¿Eliminar este registro?")) ejecutar(() => eliminarLesion(l.id));
                          }}
                          className="rounded-md border border-border px-2 py-0.5 text-xs hover:bg-background"
                        >
                          ✕
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Tarjeta>
    </div>
  );
}

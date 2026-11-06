"use client";

import { useState, useTransition } from "react";
import { Tarjeta } from "@/components/gps/piezas";
import { guardarJugadorGps, type ResultadoAccion } from "@/lib/gps/acciones";
import { COLOR_POSICION, ETIQUETA_POSICION, POSICIONES, type Posicion } from "@/lib/gps/calculos";
import type { JugadorGps } from "@/lib/gps/datos";

const OPCIONES: Posicion[] = [...POSICIONES, "N/D"];

export function PlantelPanel({ club, jugadores, puedeEditar }: { club: string; jugadores: JugadorGps[]; puedeEditar: boolean }) {
  const [error, setError] = useState<string | null>(null);
  const [pendiente, empezar] = useTransition();

  function ejecutar(accion: () => Promise<ResultadoAccion>) {
    setError(null);
    empezar(async () => {
      const r = await accion();
      if (!r.ok) setError(r.error);
    });
  }

  const sinPosicion = jugadores.filter((j) => j.activo && j.posicion === "N/D").length;

  return (
    <div>
      {error && <div className="mb-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">{error}</div>}
      <Tarjeta
        titulo={`Plantel GPS — ${club}`}
        nota={
          <>
            Jugadores que aparecen en los archivos del proveedor GPS, con su posición. Un jugador dado de baja deja de entrar al ACWR y a las
            alertas, pero su historial se conserva.
            {sinPosicion > 0 && <> {sinPosicion} sin posición asignada.</>}
            {!puedeEditar && <> Solo el preparador físico o el admin pueden editar.</>}
          </>
        }
      >
        {jugadores.length === 0 ? (
          <p className="py-4 text-sm text-foreground/60">Todavía no hay jugadores: aparecen solos cuando se carga el primer archivo GPS.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs text-foreground/60">
                  <th className="py-2 pr-4 font-medium">Jugador</th>
                  <th className="px-3 py-2 font-medium">Posición</th>
                  <th className="px-3 py-2 font-medium">Activo</th>
                </tr>
              </thead>
              <tbody>
                {jugadores.map((j) => (
                  <tr key={j.nombre} className={`border-b border-border/60 ${j.activo ? "" : "text-foreground/40"}`}>
                    <td className="py-2 pr-4 font-medium">{j.nombre}</td>
                    <td className="px-3 py-2">
                      <select
                        value={j.posicion}
                        disabled={!puedeEditar || pendiente}
                        onChange={(e) => ejecutar(() => guardarJugadorGps(club, j.nombre, { posicion: e.target.value as Posicion }))}
                        className="rounded-md border border-border bg-surface px-2 py-1 text-sm"
                        style={{ color: COLOR_POSICION[j.posicion] }}
                      >
                        {OPCIONES.map((p) => (
                          <option key={p} value={p}>
                            {ETIQUETA_POSICION[p]}
                            {p !== "N/D" && ` (${p})`}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="px-3 py-2">
                      <input
                        type="checkbox"
                        checked={j.activo}
                        disabled={!puedeEditar || pendiente}
                        onChange={(e) => ejecutar(() => guardarJugadorGps(club, j.nombre, { activo: e.target.checked }))}
                        className="h-4 w-4 accent-primary"
                        aria-label={`${j.nombre} activo`}
                      />
                    </td>
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

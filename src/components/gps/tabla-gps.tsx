"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import type { GpsRegistroConSesion } from "@/lib/gps-data";
import { agruparPorJugador } from "@/lib/gps-comparativas";
import { agregarMetrica, redondear, type ClaveMetrica } from "@/lib/gps-metricas";
import { formatearNombreJugador } from "@/lib/gps-nombres";
import { fondoHeatmap, rangoColumna } from "@/lib/heatmap";

type Columna = { clave: ClaveMetrica | "sesiones" | "nombre"; label: string; unidad: string };

const COLUMNAS: Columna[] = [
  { clave: "sesiones", label: "Sesiones", unidad: "" },
  { clave: "duracionMin", label: "Min", unidad: "" },
  { clave: "distanciaTotalM", label: "Distancia", unidad: "m" },
  { clave: "distanciaPorMin", label: "m/min", unidad: "" },
  { clave: "distAltaVelocidadM", label: "HSR", unidad: "m" },
  { clave: "distMuyAltaVelocidadM", label: "Sprint", unidad: "m" },
  { clave: "velocidadMaximaKmh", label: "Vel. máx.", unidad: "km/h" },
  { clave: "aceleracionesCant", label: "Acc", unidad: "" },
  { clave: "desaceleracionesCant", label: "Dec", unidad: "" },
];

/** Tabla compacta por jugador para el período filtrado: cada fila es un agregado (no una fila
 * por sesión), ordenable por cualquier columna, con la primera columna y el encabezado fijos. */
export function TablaGps({ registros }: { registros: GpsRegistroConSesion[] }) {
  const [orden, setOrden] = useState<{ clave: Columna["clave"]; asc: boolean }>({ clave: "distanciaTotalM", asc: false });
  const [busqueda, setBusqueda] = useState("");

  const filas = useMemo(() => {
    const porJugador = agruparPorJugador(registros);
    const base = Array.from(porJugador.entries()).map(([nombre, regs]) => {
      const fila: Record<string, number | string> = { nombre, sesiones: regs.length };
      for (const c of COLUMNAS) {
        if (c.clave === "sesiones" || c.clave === "nombre") continue;
        fila[c.clave] = agregarMetrica(regs, c.clave) ?? 0;
      }
      return fila as { nombre: string; sesiones: number } & Record<ClaveMetrica, number>;
    });
    const filtradas = busqueda ? base.filter((f) => f.nombre.toLowerCase().includes(busqueda.toLowerCase())) : base;
    return filtradas.sort((a, b) => {
      const va = a[orden.clave as keyof typeof a];
      const vb = b[orden.clave as keyof typeof b];
      const cmp = typeof va === "string" ? (va as string).localeCompare(vb as string) : (va as number) - (vb as number);
      return orden.asc ? cmp : -cmp;
    });
  }, [registros, orden, busqueda]);

  function ordenarPor(clave: Columna["clave"]) {
    setOrden((prev) => (prev.clave === clave ? { clave, asc: !prev.asc } : { clave, asc: false }));
  }

  const rangos = useMemo(() => {
    const mapa = new Map<string, { min: number; max: number }>();
    for (const c of COLUMNAS) {
      if (c.clave === "sesiones" || c.clave === "nombre") continue;
      mapa.set(c.clave, rangoColumna(filas.map((f) => f[c.clave as ClaveMetrica] as number)));
    }
    return mapa;
  }, [filas]);

  return (
    <div className="rounded-xl border border-border bg-surface">
      <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
        <h3 className="text-sm font-semibold text-foreground">Tabla por jugador</h3>
        <input
          type="search"
          placeholder="Buscar jugador…"
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          className="w-48 rounded-md border border-border px-2.5 py-1 text-xs focus:border-primary focus:outline-none"
        />
      </div>
      {filas.length === 0 ? (
        <p className="px-4 py-10 text-center text-sm text-foreground/40">No hay datos de GPS en este filtro.</p>
      ) : (
        <div className="max-h-[520px] overflow-auto">
          <table className="w-full text-sm">
            <thead className="sticky top-0 z-10 bg-primary text-[11px] font-semibold uppercase tracking-wider text-white/90">
              <tr>
                <th className="sticky left-0 z-20 bg-primary px-4 py-3 text-left">
                  <button onClick={() => ordenarPor("nombre")} className="hover:text-white">
                    Jugador {orden.clave === "nombre" ? (orden.asc ? "↑" : "↓") : ""}
                  </button>
                </th>
                {COLUMNAS.map((c) => (
                  <th key={c.clave} className="px-4 py-3 text-right">
                    <button onClick={() => ordenarPor(c.clave)} className="hover:text-white">
                      {c.label} {orden.clave === c.clave ? (orden.asc ? "↑" : "↓") : ""}
                    </button>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filas.map((f) => (
                <tr key={f.nombre} className="group">
                  <td className="sticky left-0 z-10 bg-surface px-4 py-2.5 font-medium text-foreground transition-colors group-hover:bg-primary/5">
                    <Link href={`/gps/jugadores/${encodeURIComponent(f.nombre)}`} className="hover:text-primary hover:underline">
                      {formatearNombreJugador(f.nombre)}
                    </Link>
                  </td>
                  {COLUMNAS.map((c) => {
                    if (c.clave === "sesiones") {
                      return (
                        <td key={c.clave} className="px-4 py-2.5 text-right tabular-nums text-foreground/80 transition-colors group-hover:bg-primary/5">
                          {f.sesiones}
                        </td>
                      );
                    }
                    const valor = f[c.clave as ClaveMetrica] as number;
                    const rango = rangos.get(c.clave);
                    return (
                      <td
                        key={c.clave}
                        className="px-4 py-2.5 text-right font-medium tabular-nums text-foreground"
                        style={{ backgroundColor: rango ? fondoHeatmap(valor, rango.min, rango.max) : undefined }}
                      >
                        {redondear(valor, c.clave === "distanciaPorMin" || c.clave === "velocidadMaximaKmh" ? 1 : 0).toLocaleString("es-UY")}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

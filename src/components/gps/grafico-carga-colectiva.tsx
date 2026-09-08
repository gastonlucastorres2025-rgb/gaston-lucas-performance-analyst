"use client";

import { useMemo, useState } from "react";
import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { GpsRegistroConSesion } from "@/lib/gps-data";
import { agruparPorJugador } from "@/lib/gps-comparativas";
import { agregarMetrica, defMetrica, METRICAS, type ClaveMetrica } from "@/lib/gps-metricas";
import { formatearNombreJugador } from "@/lib/gps-nombres";

/** Distribución de carga entre jugadores en el período filtrado, ordenada de mayor a menor —
 * barras horizontales porque se leen mucho mejor con nombres que un eje X apretado. Cada barra
 * usa la agregación propia de la métrica (suma para volumen, máximo para velocidad). */
export function GraficoCargaColectiva({ registros }: { registros: GpsRegistroConSesion[] }) {
  const [metrica, setMetrica] = useState<ClaveMetrica>("distanciaTotalM");
  const def = defMetrica(metrica);

  const datos = useMemo(() => {
    const porJugador = agruparPorJugador(registros);
    return Array.from(porJugador.entries())
      .map(([nombre, regs]) => ({ nombre: formatearNombreJugador(nombre), valor: agregarMetrica(regs, metrica) ?? 0 }))
      .filter((d) => d.valor > 0)
      .sort((a, b) => b.valor - a.valor)
      .slice(0, 25);
  }, [registros, metrica]);

  const alto = Math.max(220, datos.length * 26);

  return (
    <div className="rounded-xl border border-border bg-surface p-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-sm font-semibold text-foreground">Carga colectiva por jugador</h3>
        <div className="flex flex-wrap gap-1">
          {METRICAS.filter((m) => m.clave !== "duracionMin" && m.clave !== "distanciaPorMin").map((m) => (
            <button
              key={m.clave}
              onClick={() => setMetrica(m.clave)}
              className={`rounded-full px-2.5 py-1 text-xs font-medium transition-colors ${
                metrica === m.clave ? "bg-primary text-white" : "bg-primary/5 text-foreground/60 hover:bg-primary/10"
              }`}
            >
              {m.corto}
            </button>
          ))}
        </div>
      </div>
      {datos.length === 0 ? (
        <p className="py-10 text-center text-sm text-foreground/40">No hay datos suficientes para este gráfico.</p>
      ) : (
        <ResponsiveContainer width="100%" height={alto}>
          <BarChart data={datos} layout="vertical" margin={{ top: 0, right: 24, left: 0, bottom: 0 }}>
            <CartesianGrid stroke="var(--color-border)" strokeDasharray="3 3" horizontal={false} />
            <XAxis type="number" tick={{ fontSize: 11, fill: "#8a93a3" }} axisLine={false} tickLine={false} />
            <YAxis
              type="category"
              dataKey="nombre"
              width={110}
              tick={{ fontSize: 11, fill: "#2b3242" }}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip
              formatter={(v) => [`${Number(v).toLocaleString("es-UY")} ${def.unidad}`, def.label]}
              contentStyle={{ fontSize: 12, borderRadius: 8, borderColor: "var(--color-border)" }}
            />
            <Bar dataKey="valor" radius={[0, 4, 4, 0]} maxBarSize={16}>
              {datos.map((d, i) => (
                <Cell key={d.nombre} fill={i < 3 ? "var(--color-accent)" : "var(--color-primary)"} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}

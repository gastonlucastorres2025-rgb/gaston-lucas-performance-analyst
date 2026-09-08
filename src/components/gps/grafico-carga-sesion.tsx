"use client";

import { useMemo, useState } from "react";
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { GpsRegistroConSesion } from "@/lib/gps-data";
import { defMetrica, METRICAS, valorMetrica, type ClaveMetrica } from "@/lib/gps-metricas";

/** Carga por sesión a lo largo del tiempo. Cada punto es el promedio del equipo esa sesión (no
 * la suma total) para que sesiones con distinta cantidad de jugadores presentes sean
 * comparables entre sí — es la misma razón por la que un promedio de equipo se lee mejor que un
 * acumulado cuando cambia la asistencia. */
export function GraficoCargaSesion({ registros }: { registros: GpsRegistroConSesion[] }) {
  const [metrica, setMetrica] = useState<ClaveMetrica>("distanciaTotalM");
  const def = defMetrica(metrica);

  const datos = useMemo(() => {
    const porSesion = new Map<string, { fecha: string; md: string | null; valores: number[] }>();
    for (const r of registros) {
      const entrada = porSesion.get(r.sesionId) ?? { fecha: r.fecha, md: r.md, valores: [] };
      const v = valorMetrica(r, metrica);
      if (v !== null) entrada.valores.push(v);
      porSesion.set(r.sesionId, entrada);
    }
    return Array.from(porSesion.values())
      .filter((e) => e.valores.length > 0)
      .sort((a, b) => a.fecha.localeCompare(b.fecha))
      .map((e) => ({
        fecha: new Date(`${e.fecha}T00:00:00`).toLocaleDateString("es-UY", { day: "2-digit", month: "2-digit" }),
        md: e.md,
        valor: Math.round((e.valores.reduce((a, b) => a + b, 0) / e.valores.length) * 10) / 10,
      }));
  }, [registros, metrica]);

  return (
    <div className="rounded-xl border border-border bg-surface p-4">
      <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
        <div>
          <h3 className="text-sm font-semibold text-foreground">Carga por sesión</h3>
          <p className="text-xs text-foreground/40">Promedio por jugador presente cada sesión</p>
        </div>
        <div className="flex flex-wrap gap-1">
          {METRICAS.filter((m) => m.clave !== "duracionMin").map((m) => (
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
        <ResponsiveContainer width="100%" height={260}>
          <LineChart data={datos} margin={{ top: 4, right: 8, left: -12, bottom: 0 }}>
            <CartesianGrid stroke="var(--color-border)" strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="fecha" tick={{ fontSize: 11, fill: "#8a93a3" }} axisLine={{ stroke: "var(--color-border)" }} tickLine={false} />
            <YAxis tick={{ fontSize: 11, fill: "#8a93a3" }} axisLine={false} tickLine={false} width={48} />
            <Tooltip
              formatter={(v) => [`${Number(v).toLocaleString("es-UY")} ${def.unidad}`, `${def.label} (prom.)`]}
              labelFormatter={(label, payload) => {
                const md = (payload?.[0]?.payload as { md?: string | null } | undefined)?.md;
                return md ? `${label} · ${md}` : label;
              }}
              contentStyle={{ fontSize: 12, borderRadius: 8, borderColor: "var(--color-border)" }}
            />
            <Line type="monotone" dataKey="valor" stroke="var(--color-primary)" strokeWidth={2} dot={{ r: 3 }} activeDot={{ r: 5 }} />
          </LineChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}

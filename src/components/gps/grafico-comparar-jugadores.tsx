"use client";

import { useMemo } from "react";
import { Legend, PolarAngleAxis, PolarGrid, PolarRadiusAxis, Radar, RadarChart, ResponsiveContainer, Tooltip } from "recharts";
import { formatearNombreJugador } from "@/lib/gps-nombres";

const COLORES = ["var(--color-primary)", "var(--color-accent)", "#0f9d58", "#e8a33d"];

type Fila = { metrica: string; unidad: string; maxPlantel: number; [jugador: string]: string | number };

/** Radar de comparación: cada eje es una métrica, normalizada a "% del mejor de **todo el
 * plantel** con datos en esa métrica (no solo entre los jugadores elegidos) — si normalizara
 * contra el líder del propio grupo comparado, apenas uno de los elegidos gane la mayoría de las
 * métricas el radar colapsa a 100 en todos los ejes y deja de decir nada. Contra el plantel
 * completo eso es mucho más difícil que pase por casualidad. El tooltip muestra el valor real. */
export function GraficoCompararJugadores({ datos, jugadores }: { datos: Fila[]; jugadores: string[] }) {
  const datosNormalizados = useMemo(() => {
    return datos.map((fila) => {
      const normalizada: Record<string, string | number> = { metrica: fila.metrica };
      for (const j of jugadores) {
        const real = Number(fila[j]) || 0;
        normalizada[j] = fila.maxPlantel > 0 ? Math.round((real / fila.maxPlantel) * 1000) / 10 : 0;
        normalizada[`${j}__real`] = `${real.toLocaleString("es-UY")} ${fila.unidad}`;
      }
      return normalizada;
    });
  }, [datos, jugadores]);

  if (datosNormalizados.length === 0) return null;

  return (
    <ResponsiveContainer width="100%" height={380}>
      <RadarChart data={datosNormalizados} outerRadius="72%">
        <PolarGrid stroke="var(--color-border)" />
        <PolarAngleAxis dataKey="metrica" tick={{ fontSize: 12, fill: "#2b3242", fontWeight: 500 }} />
        <PolarRadiusAxis angle={90} domain={[0, 100]} tick={{ fontSize: 10, fill: "#8a93a3" }} tickCount={5} axisLine={false} />
        <Tooltip
          formatter={(_valor, nombre, item) => {
            const clave = (item as { dataKey?: string } | undefined)?.dataKey;
            const real = clave ? (item?.payload as Record<string, string> | undefined)?.[`${clave}__real`] : undefined;
            return [real ?? "—", nombre as string];
          }}
          contentStyle={{ fontSize: 12, borderRadius: 8, borderColor: "var(--color-border)" }}
        />
        <Legend wrapperStyle={{ fontSize: 12 }} />
        {jugadores.map((j, i) => (
          <Radar
            key={j}
            name={formatearNombreJugador(j)}
            dataKey={j}
            stroke={COLORES[i % COLORES.length]}
            fill={COLORES[i % COLORES.length]}
            fillOpacity={0.15}
            strokeWidth={2}
          />
        ))}
      </RadarChart>
    </ResponsiveContainer>
  );
}

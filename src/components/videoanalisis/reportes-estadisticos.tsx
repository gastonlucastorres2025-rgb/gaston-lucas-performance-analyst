"use client";

import { useMemo, useState } from "react";
import { Bar, BarChart, CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { ChartCard } from "@/components/chart-card";
import {
  agregarPorPartido,
  discrepanciaGoles,
  METRICAS_NUCLEO,
  opcionesFiltro,
  promedioMetrica,
  totalMetrica,
  type AccionVAResumen,
  type PartidoVAResumen,
} from "@/lib/videoanalisis/estadisticas";
import { parseDateKey } from "@/lib/calendar-utils";

const TODOS = "__todos__";
const AXIS_STYLE = { fontSize: 11, fill: "#64748b" };
const AXIS_TICK = { ...AXIS_STYLE, angle: -60, textAnchor: "end" as const };
const PX_PER_MATCH = 46;

function fechaCorta(fecha: string): string {
  return parseDateKey(fecha).toLocaleDateString("es-UY", { day: "numeric", month: "short" });
}

export function ReportesEstadisticos({
  partidos,
  acciones,
}: {
  partidos: PartidoVAResumen[];
  acciones: AccionVAResumen[];
}) {
  const { competencias, rivales, categorias } = useMemo(() => opcionesFiltro(partidos), [partidos]);

  const [competencia, setCompetencia] = useState(TODOS);
  const [rival, setRival] = useState(TODOS);
  const [condicion, setCondicion] = useState(TODOS);
  const [categoria, setCategoria] = useState(TODOS);
  const [desde, setDesde] = useState("");
  const [hasta, setHasta] = useState("");
  const [metricaSel, setMetricaSel] = useState(METRICAS_NUCLEO[0].codigo);

  const partidosFiltrados = useMemo(() => {
    return partidos
      .filter((p) => competencia === TODOS || p.competencia === competencia)
      .filter((p) => rival === TODOS || p.rival === rival)
      .filter((p) => condicion === TODOS || p.condicion === condicion)
      .filter((p) => categoria === TODOS || p.categoria === categoria)
      .filter((p) => !desde || p.fecha >= desde)
      .filter((p) => !hasta || p.fecha <= hasta)
      .sort((a, b) => a.fecha.localeCompare(b.fecha));
  }, [partidos, competencia, rival, condicion, categoria, desde, hasta]);

  const conteos = useMemo(() => agregarPorPartido(partidosFiltrados, acciones), [partidosFiltrados, acciones]);

  const metrica = METRICAS_NUCLEO.find((m) => m.codigo === metricaSel) ?? METRICAS_NUCLEO[0];

  const chartData = useMemo(
    () =>
      conteos.map((c) => ({
        label: `${c.partido.rival} (${fechaCorta(c.partido.fecha)})`,
        fecha: c.partido.fecha,
        valor: c.conteos[metrica.codigo] ?? 0,
      })),
    [conteos, metrica],
  );

  const width = Math.max(600, conteos.length * PX_PER_MATCH);

  function limpiarFiltros() {
    setCompetencia(TODOS);
    setRival(TODOS);
    setCondicion(TODOS);
    setCategoria(TODOS);
    setDesde("");
    setHasta("");
  }

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-center gap-2">
        <select
          value={competencia}
          onChange={(e) => setCompetencia(e.target.value)}
          className="rounded border border-border px-2 py-1.5 text-sm"
        >
          <option value={TODOS}>Competencia: todas</option>
          {competencias.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
        <select value={rival} onChange={(e) => setRival(e.target.value)} className="rounded border border-border px-2 py-1.5 text-sm">
          <option value={TODOS}>Rival: todos</option>
          {rivales.map((r) => (
            <option key={r} value={r}>
              {r}
            </option>
          ))}
        </select>
        <select
          value={condicion}
          onChange={(e) => setCondicion(e.target.value)}
          className="rounded border border-border px-2 py-1.5 text-sm"
        >
          <option value={TODOS}>Condición: todas</option>
          <option value="local">Local</option>
          <option value="visitante">Visitante</option>
        </select>
        {categorias.length > 0 && (
          <select
            value={categoria}
            onChange={(e) => setCategoria(e.target.value)}
            className="rounded border border-border px-2 py-1.5 text-sm"
          >
            <option value={TODOS}>Categoría: todas</option>
            {categorias.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        )}
        <label className="flex items-center gap-1.5 text-xs text-foreground/50">
          Desde
          <input
            type="date"
            value={desde}
            onChange={(e) => setDesde(e.target.value)}
            className="rounded border border-border px-2 py-1.5 text-sm"
          />
        </label>
        <label className="flex items-center gap-1.5 text-xs text-foreground/50">
          Hasta
          <input
            type="date"
            value={hasta}
            onChange={(e) => setHasta(e.target.value)}
            className="rounded border border-border px-2 py-1.5 text-sm"
          />
        </label>
        <button onClick={limpiarFiltros} className="text-xs text-foreground/40 hover:underline">
          Limpiar filtros
        </button>
        <span className="ml-auto rounded-full bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary">
          {partidosFiltrados.length} partido{partidosFiltrados.length === 1 ? "" : "s"}
        </span>
      </div>

      {partidosFiltrados.length === 0 ? (
        <p className="py-16 text-center text-sm text-foreground/50">
          No hay partidos con XML procesado para esta combinación de filtros.
        </p>
      ) : (
        <>
          <div className="mb-5 flex flex-wrap gap-2">
            {METRICAS_NUCLEO.map((m) => (
              <button
                key={m.codigo}
                onClick={() => setMetricaSel(m.codigo)}
                className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
                  metricaSel === m.codigo
                    ? "border-primary bg-primary text-white"
                    : "border-border bg-surface text-foreground/60 hover:bg-primary/5"
                }`}
              >
                {m.label}
              </button>
            ))}
          </div>

          <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-3">
            <div className="rounded-xl border border-border bg-surface p-3 shadow-sm">
              <p className="text-xs text-foreground/50">Total {metrica.label.toLowerCase()}</p>
              <p className="text-lg font-bold text-primary">{totalMetrica(conteos, metrica.codigo)}</p>
            </div>
            <div className="rounded-xl border border-border bg-surface p-3 shadow-sm">
              <p className="text-xs text-foreground/50">Promedio por partido</p>
              <p className="text-lg font-bold text-primary">{promedioMetrica(conteos, metrica.codigo).toFixed(1)}</p>
            </div>
            <div className="rounded-xl border border-border bg-surface p-3 shadow-sm">
              <p className="text-xs text-foreground/50">Partidos con al menos 1</p>
              <p className="text-lg font-bold text-primary">
                {conteos.filter((c) => (c.conteos[metrica.codigo] ?? 0) > 0).length}
              </p>
            </div>
          </div>

          <ChartCard title={`${metrica.label} por partido`} width={width}>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={chartData} margin={{ left: -20, bottom: 60 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#eef0f3" vertical={false} />
                <XAxis dataKey="label" tick={AXIS_TICK} interval={0} height={70} axisLine={{ stroke: "#e2e5ea" }} />
                <YAxis tick={AXIS_STYLE} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, borderColor: "#e2e5ea" }} />
                <Bar dataKey="valor" name={metrica.label} fill={metrica.color} radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>

          {conteos.length >= 3 && (
            <div className="mt-5">
              <ChartCard title={`Evolución de ${metrica.label.toLowerCase()}`} width={width}>
                <ResponsiveContainer width="100%" height={240}>
                  <LineChart data={chartData} margin={{ left: -20, bottom: 60 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#eef0f3" vertical={false} />
                    <XAxis dataKey="label" tick={AXIS_TICK} interval={0} height={70} axisLine={{ stroke: "#e2e5ea" }} />
                    <YAxis tick={AXIS_STYLE} axisLine={false} tickLine={false} allowDecimals={false} />
                    <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, borderColor: "#e2e5ea" }} />
                    <Legend wrapperStyle={{ fontSize: 12 }} />
                    <Line
                      isAnimationActive={false}
                      type="monotone"
                      dataKey="valor"
                      name={metrica.label}
                      stroke={metrica.color}
                      strokeWidth={2.5}
                      dot={{ r: 3 }}
                      activeDot={{ r: 5 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </ChartCard>
            </div>
          )}

          <h2 className="mb-3 mt-8 text-sm font-semibold uppercase tracking-wide text-foreground/50">Detalle por partido</h2>
          <div className="overflow-x-auto rounded-lg border border-border">
            <table className="w-full min-w-[900px] text-sm">
              <thead>
                <tr className="border-b border-border bg-foreground/[0.02] text-left text-xs text-foreground/50">
                  <th className="px-3 py-2 font-medium">Fecha</th>
                  <th className="px-3 py-2 font-medium">Rival</th>
                  <th className="px-3 py-2 font-medium">Competencia</th>
                  <th className="px-3 py-2 font-medium">Cond.</th>
                  {METRICAS_NUCLEO.map((m) => (
                    <th key={m.codigo} className="px-3 py-2 text-right font-medium">
                      {m.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {conteos.map((c) => {
                  const { golesAfDiscrepa, golesEcDiscrepa } = discrepanciaGoles(c);
                  return (
                    <tr key={c.partido.id} className="hover:bg-foreground/[0.02]">
                      <td className="px-3 py-2 text-foreground/60">{fechaCorta(c.partido.fecha)}</td>
                      <td className="px-3 py-2 font-medium">{c.partido.rival}</td>
                      <td className="px-3 py-2 text-foreground/60">{c.partido.competencia ?? "—"}</td>
                      <td className="px-3 py-2 text-foreground/60 capitalize">{c.partido.condicion ?? "—"}</td>
                      {METRICAS_NUCLEO.map((m) => {
                        const esGolAf = m.codigo === "GOL AF";
                        const esGolEc = m.codigo === "GOL EC";
                        const discrepa = (esGolAf && golesAfDiscrepa) || (esGolEc && golesEcDiscrepa);
                        return (
                          <td key={m.codigo} className="px-3 py-2 text-right tabular-nums">
                            {c.conteos[m.codigo] ?? 0}
                            {discrepa && (
                              <span title="No coincide con el marcador cargado en el partido" className="ml-1 text-amber-500">
                                ⚠
                              </span>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}

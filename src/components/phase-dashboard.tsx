"use client";

import { useMemo, useState } from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { ChartCard } from "@/components/chart-card";
import {
  CONSTRUCCION_METRICS,
  DEFENSIVA_METRICS,
  OFENSIVA_METRICS,
} from "@/lib/metricas-config";

type MatchRow = {
  id: string;
  rival: string;
  fecha: string;
  escudo_rival_url: string | null;
  stats_nacional: Record<string, unknown>;
  stats_rival: Record<string, unknown>;
};

const METRICS_BY_CATEGORY = {
  ofensiva: OFENSIVA_METRICS,
  defensiva: DEFENSIVA_METRICS,
  construccion: CONSTRUCCION_METRICS,
};

const AXIS_STYLE = { fontSize: 11, fill: "#64748b" };
const AXIS_TICK = { ...AXIS_STYLE, angle: -60, textAnchor: "end" as const };
const PX_PER_MATCH = 46;

function average(values: (number | null)[]): number | null {
  const valid = values.filter((v): v is number => v !== null);
  if (!valid.length) return null;
  return valid.reduce((a, b) => a + b, 0) / valid.length;
}

export function PhaseDashboard({
  matches,
  category,
}: {
  matches: MatchRow[];
  category: keyof typeof METRICS_BY_CATEGORY;
}) {
  const metrics = METRICS_BY_CATEGORY[category];
  const [selectedKey, setSelectedKey] = useState(metrics[0].key);
  const selected = metrics.find((m) => m.key === selectedKey) ?? metrics[0];

  const chartData = useMemo(
    () =>
      matches.map((m) => ({
        rival: m.rival,
        nacional: Number((selected.extract(m.stats_nacional) ?? 0).toFixed(2)),
        rivalValor: Number((selected.extract(m.stats_rival) ?? 0).toFixed(2)),
      })),
    [matches, selected],
  );

  const width = matches.length * PX_PER_MATCH;

  const averages = useMemo(
    () =>
      metrics.map((metric) => ({
        metric,
        nacional: average(matches.map((m) => metric.extract(m.stats_nacional))),
        rival: average(matches.map((m) => metric.extract(m.stats_rival))),
      })),
    [matches, metrics],
  );

  return (
    <div>
      <div className="mb-6 flex flex-wrap gap-2">
        {metrics.map((metric) => (
          <button
            key={metric.key}
            onClick={() => setSelectedKey(metric.key)}
            className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
              selectedKey === metric.key
                ? "border-primary bg-primary text-white"
                : "border-border bg-surface text-foreground/60 hover:bg-primary/5"
            }`}
          >
            {metric.label}
          </button>
        ))}
      </div>

      <ChartCard title={`${selected.label}${selected.suffix ? ` (${selected.suffix})` : ""} por partido`} width={width}>
        <ResponsiveContainer width="100%" height={280}>
          <LineChart data={chartData} margin={{ left: -20, bottom: 60 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#eef0f3" vertical={false} />
            <XAxis dataKey="rival" tick={AXIS_TICK} interval={0} height={70} axisLine={{ stroke: "#e2e5ea" }} />
            <YAxis tick={AXIS_STYLE} axisLine={false} tickLine={false} />
            <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, borderColor: "#e2e5ea" }} />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            <Line isAnimationActive={false} type="monotone" dataKey="nacional" name="Nacional" stroke="#0b3d91" strokeWidth={2.5} dot={{ r: 3 }} activeDot={{ r: 5 }} />
            <Line isAnimationActive={false} type="monotone" dataKey="rivalValor" name="Rival" stroke="#d7263d" strokeWidth={2.5} dot={{ r: 3 }} activeDot={{ r: 5 }} />
          </LineChart>
        </ResponsiveContainer>
      </ChartCard>

      <h2 className="mt-8 mb-3 text-sm font-semibold uppercase tracking-wide text-foreground/50">
        Promedio de temporada
      </h2>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {averages.map(({ metric, nacional, rival }) => {
          const n = nacional ?? 0;
          const r = rival ?? 0;
          const scale = Math.max(Math.abs(n), Math.abs(r), 1);
          const relDiff = Math.abs(n - r) / scale;
          const nacionalAhead = metric.invert ? n < r : n > r;
          const color =
            relDiff < 0.1 ? "text-amber-600" : nacionalAhead ? "text-emerald-600" : "text-accent";

          return (
            <button
              key={metric.key}
              onClick={() => setSelectedKey(metric.key)}
              className={`rounded-xl border bg-surface p-3 text-left shadow-sm transition-shadow hover:shadow-md ${
                selectedKey === metric.key ? "border-primary" : "border-border"
              }`}
            >
              <p className="text-xs text-foreground/50">{metric.label}</p>
              <p className={`text-lg font-bold ${color}`}>
                {n.toFixed(1)}
                {metric.suffix ?? ""}
              </p>
              <p className="text-xs text-foreground/40">
                Rival: {r.toFixed(1)}
                {metric.suffix ?? ""}
              </p>
            </button>
          );
        })}
      </div>
    </div>
  );
}

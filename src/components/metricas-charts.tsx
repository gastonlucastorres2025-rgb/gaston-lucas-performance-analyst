"use client";

import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

type ChartPoint = {
  fecha: string;
  rival: string;
  golesFavor: number;
  golesContra: number;
  xgFavor: number;
  xgContra: number;
  posesion: number;
};

const AXIS_STYLE = { fontSize: 11, fill: "#10172899" };
const AXIS_TICK = { ...AXIS_STYLE, angle: -35, textAnchor: "end" as const };

export function MetricasCharts({ data }: { data: ChartPoint[] }) {
  const tickInterval = Math.max(0, Math.ceil(data.length / 6) - 1);

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <div className="rounded-lg border border-border bg-surface p-4">
        <h3 className="mb-3 text-sm font-semibold text-foreground/70">Goles por partido</h3>
        <ResponsiveContainer width="100%" height={240}>
          <LineChart data={data} margin={{ left: -20, bottom: 20 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e5ea" />
            <XAxis dataKey="rival" tick={AXIS_TICK} interval={tickInterval} height={50} />
            <YAxis tick={AXIS_STYLE} allowDecimals={false} />
            <Tooltip />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            <Line isAnimationActive={false} type="monotone" dataKey="golesFavor" name="Nacional" stroke="#0b3d91" strokeWidth={2} dot={{ r: 3 }} />
            <Line isAnimationActive={false} type="monotone" dataKey="golesContra" name="Rival" stroke="#d7263d" strokeWidth={2} dot={{ r: 3 }} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="rounded-lg border border-border bg-surface p-4">
        <h3 className="mb-3 text-sm font-semibold text-foreground/70">xG (goles esperados)</h3>
        <ResponsiveContainer width="100%" height={240}>
          <LineChart data={data} margin={{ left: -20, bottom: 20 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e5ea" />
            <XAxis dataKey="rival" tick={AXIS_TICK} interval={tickInterval} height={50} />
            <YAxis tick={AXIS_STYLE} />
            <Tooltip />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            <Line isAnimationActive={false} type="monotone" dataKey="xgFavor" name="Nacional" stroke="#0b3d91" strokeWidth={2} dot={{ r: 3 }} />
            <Line isAnimationActive={false} type="monotone" dataKey="xgContra" name="Rival" stroke="#d7263d" strokeWidth={2} dot={{ r: 3 }} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="rounded-lg border border-border bg-surface p-4 lg:col-span-2">
        <h3 className="mb-3 text-sm font-semibold text-foreground/70">Posesión del balón, %</h3>
        <ResponsiveContainer width="100%" height={220}>
          <LineChart data={data} margin={{ left: -20, bottom: 20 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e5ea" />
            <XAxis dataKey="rival" tick={AXIS_TICK} interval={tickInterval} height={50} />
            <YAxis tick={AXIS_STYLE} domain={[0, 100]} />
            <Tooltip />
            <Line isAnimationActive={false} type="monotone" dataKey="posesion" name="Posesión Nacional" stroke="#0b3d91" strokeWidth={2} dot={{ r: 3 }} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

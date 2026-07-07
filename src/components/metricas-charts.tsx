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
import { ChartCard } from "@/components/chart-card";

type ChartPoint = {
  fecha: string;
  rival: string;
  golesFavor: number;
  golesContra: number;
  xgFavor: number;
  xgContra: number;
  posesion: number;
};

const AXIS_STYLE = { fontSize: 11, fill: "#64748b" };
const AXIS_TICK = { ...AXIS_STYLE, angle: -60, textAnchor: "end" as const };
const PX_PER_MATCH = 46;

export function MetricasCharts({ data }: { data: ChartPoint[] }) {
  const width = data.length * PX_PER_MATCH;

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <ChartCard title="⚽ Goles por partido" width={width}>
        <ResponsiveContainer width="100%" height={260}>
          <LineChart data={data} margin={{ left: -20, bottom: 60 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#eef0f3" vertical={false} />
            <XAxis dataKey="rival" tick={AXIS_TICK} interval={0} height={70} axisLine={{ stroke: "#e2e5ea" }} />
            <YAxis tick={AXIS_STYLE} allowDecimals={false} axisLine={false} tickLine={false} />
            <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, borderColor: "#e2e5ea" }} />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            <Line isAnimationActive={false} type="monotone" dataKey="golesFavor" name="Nacional" stroke="#0b3d91" strokeWidth={2.5} dot={{ r: 3 }} activeDot={{ r: 5 }} />
            <Line isAnimationActive={false} type="monotone" dataKey="golesContra" name="Rival" stroke="#d7263d" strokeWidth={2.5} dot={{ r: 3 }} activeDot={{ r: 5 }} />
          </LineChart>
        </ResponsiveContainer>
      </ChartCard>

      <ChartCard title="📈 xG (goles esperados)" width={width}>
        <ResponsiveContainer width="100%" height={260}>
          <LineChart data={data} margin={{ left: -20, bottom: 60 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#eef0f3" vertical={false} />
            <XAxis dataKey="rival" tick={AXIS_TICK} interval={0} height={70} axisLine={{ stroke: "#e2e5ea" }} />
            <YAxis tick={AXIS_STYLE} axisLine={false} tickLine={false} />
            <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, borderColor: "#e2e5ea" }} />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            <Line isAnimationActive={false} type="monotone" dataKey="xgFavor" name="Nacional" stroke="#0b3d91" strokeWidth={2.5} dot={{ r: 3 }} activeDot={{ r: 5 }} />
            <Line isAnimationActive={false} type="monotone" dataKey="xgContra" name="Rival" stroke="#d7263d" strokeWidth={2.5} dot={{ r: 3 }} activeDot={{ r: 5 }} />
          </LineChart>
        </ResponsiveContainer>
      </ChartCard>

      <div className="lg:col-span-2">
        <ChartCard title="🎯 Posesión del balón, %" width={width}>
          <ResponsiveContainer width="100%" height={240}>
            <LineChart data={data} margin={{ left: -20, bottom: 60 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#eef0f3" vertical={false} />
              <XAxis dataKey="rival" tick={AXIS_TICK} interval={0} height={70} axisLine={{ stroke: "#e2e5ea" }} />
              <YAxis tick={AXIS_STYLE} domain={[0, 100]} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, borderColor: "#e2e5ea" }} />
              <Line isAnimationActive={false} type="monotone" dataKey="posesion" name="Posesión Nacional" stroke="#0b3d91" strokeWidth={2.5} dot={{ r: 3 }} activeDot={{ r: 5 }} />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>
    </div>
  );
}

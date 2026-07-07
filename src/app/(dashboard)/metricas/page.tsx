import Link from "next/link";
import { MetricasCharts } from "@/components/metricas-charts";
import { PageHeader } from "@/components/page-header";
import { parseDateKey } from "@/lib/calendar-utils";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function MetricasPage() {
  const supabase = await createClient();
  const { data: matches } = await supabase
    .from("match_stats")
    .select(
      "id, fecha, rival, competencia, condicion, escudo_rival_url, goles_favor, goles_contra, xg_favor, xg_contra, posesion",
    )
    .order("fecha", { ascending: true });

  const rows = matches ?? [];

  const chartData = rows.map((m) => ({
    fecha: m.fecha,
    rival: m.rival,
    golesFavor: m.goles_favor ?? 0,
    golesContra: m.goles_contra ?? 0,
    xgFavor: Number((m.xg_favor ?? 0).toFixed(2)),
    xgContra: Number((m.xg_contra ?? 0).toFixed(2)),
    posesion: Number((m.posesion ?? 0).toFixed(1)),
  }));

  const ganados = rows.filter((m) => (m.goles_favor ?? 0) > (m.goles_contra ?? 0)).length;
  const empatados = rows.filter((m) => (m.goles_favor ?? 0) === (m.goles_contra ?? 0)).length;
  const perdidos = rows.filter((m) => (m.goles_favor ?? 0) < (m.goles_contra ?? 0)).length;
  const golesFavor = rows.reduce((sum, m) => sum + (m.goles_favor ?? 0), 0);
  const golesContra = rows.reduce((sum, m) => sum + (m.goles_contra ?? 0), 0);
  const posesionProm = rows.length
    ? rows.reduce((sum, m) => sum + (m.posesion ?? 0), 0) / rows.length
    : 0;
  const xgProm = rows.length
    ? rows.reduce((sum, m) => sum + (m.xg_favor ?? 0), 0) / rows.length
    : 0;

  return (
    <div>
      <PageHeader
        title="Métricas de Rendimiento"
        description="Estadísticas de equipo por partido: Nacional vs. cada rival."
      />

      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-5">
        <SummaryCard label="Partidos" value={String(rows.length)} />
        <SummaryCard label="Récord (G-E-P)" value={`${ganados}-${empatados}-${perdidos}`} />
        <SummaryCard label="Goles (F-C)" value={`${golesFavor}-${golesContra}`} />
        <SummaryCard label="Posesión prom." value={`${posesionProm.toFixed(1)}%`} />
        <SummaryCard label="xG promedio" value={xgProm.toFixed(2)} />
      </div>

      <div className="mb-6">
        <MetricasCharts data={chartData} />
      </div>

      <div className="flex flex-col gap-2">
        {rows
          .slice()
          .reverse()
          .map((m) => {
            const favor = m.goles_favor ?? 0;
            const contra = m.goles_contra ?? 0;
            const resultado = favor > contra ? "G" : favor === contra ? "E" : "P";
            const resultadoColor =
              resultado === "G"
                ? "bg-primary/10 text-primary"
                : resultado === "E"
                  ? "bg-foreground/10 text-foreground/60"
                  : "bg-accent/10 text-accent";

            return (
              <Link
                key={m.id}
                href={`/metricas/${m.id}`}
                className="flex items-center gap-4 rounded-lg border border-border bg-surface px-4 py-3 hover:bg-primary/5"
              >
                {m.escudo_rival_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={m.escudo_rival_url} alt="" className="h-9 w-9 object-contain" />
                ) : (
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                    {m.rival.slice(0, 2).toUpperCase()}
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <p className="font-medium">
                    {m.condicion === "local" ? `Nacional vs ${m.rival}` : `${m.rival} vs Nacional`}
                  </p>
                  <p className="text-sm text-foreground/60">
                    <span className="capitalize">
                      {parseDateKey(m.fecha).toLocaleDateString("es-UY", {
                        day: "numeric",
                        month: "long",
                      })}
                    </span>
                    {m.competencia ? ` · ${m.competencia}` : ""}
                  </p>
                </div>
                <span className={`rounded-full px-2 py-1 text-xs font-bold ${resultadoColor}`}>
                  {resultado}
                </span>
                <span className="w-14 text-right font-mono text-lg font-semibold">
                  {favor}-{contra}
                </span>
              </Link>
            );
          })}
      </div>
    </div>
  );
}

function SummaryCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border bg-surface p-3 text-center">
      <p className="text-xl font-bold text-primary">{value}</p>
      <p className="text-xs text-foreground/60">{label}</p>
    </div>
  );
}

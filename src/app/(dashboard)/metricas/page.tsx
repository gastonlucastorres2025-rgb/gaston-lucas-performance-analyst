import Link from "next/link";
import { MetricasTabs } from "@/components/metricas-tabs";
import { PageHeader } from "@/components/page-header";
import { parseDateKey } from "@/lib/calendar-utils";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function MetricasPage() {
  const supabase = await createClient();
  const { data: matches } = await supabase
    .from("match_stats")
    .select(
      "id, fecha, rival, competencia, condicion, escudo_rival_url, goles_favor, goles_contra",
    )
    .order("fecha", { ascending: true });

  const rows = matches ?? [];

  const ganados = rows.filter((m) => (m.goles_favor ?? 0) > (m.goles_contra ?? 0)).length;
  const empatados = rows.filter((m) => (m.goles_favor ?? 0) === (m.goles_contra ?? 0)).length;
  const perdidos = rows.filter((m) => (m.goles_favor ?? 0) < (m.goles_contra ?? 0)).length;
  const golesFavor = rows.reduce((sum, m) => sum + (m.goles_favor ?? 0), 0);
  const golesContra = rows.reduce((sum, m) => sum + (m.goles_contra ?? 0), 0);

  return (
    <div>
      <PageHeader
        title="Métricas de Rendimiento"
        description="Estadísticas de equipo por partido: Nacional vs. cada rival."
      />
      <MetricasTabs />

      <div className="mb-8 grid grid-cols-3 gap-4">
        <SummaryCard icon="⚽" label="Partidos" value={String(rows.length)} />
        <SummaryCard icon="🏆" label="Récord (G-E-P)" value={`${ganados}-${empatados}-${perdidos}`} />
        <SummaryCard icon="🥅" label="Goles (F-C)" value={`${golesFavor}-${golesContra}`} />
      </div>

      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-foreground/50">
        Historial de partidos
      </h2>
      <div className="flex flex-col gap-2.5">
        {rows
          .slice()
          .reverse()
          .map((m) => {
            const favor = m.goles_favor ?? 0;
            const contra = m.goles_contra ?? 0;
            const resultado = favor > contra ? "G" : favor === contra ? "E" : "P";
            const resultadoColor =
              resultado === "G"
                ? "bg-emerald-500/10 text-emerald-600"
                : resultado === "E"
                  ? "bg-amber-400/10 text-amber-600"
                  : "bg-accent/10 text-accent";
            const borderColor =
              resultado === "G"
                ? "border-l-emerald-500"
                : resultado === "E"
                  ? "border-l-amber-400"
                  : "border-l-accent";

            return (
              <Link
                key={m.id}
                href={`/metricas/${m.id}`}
                className={`flex items-center gap-4 rounded-xl border border-border border-l-4 bg-surface px-4 py-3.5 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md ${borderColor}`}
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
                <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${resultadoColor}`}>
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

function SummaryCard({ icon, label, value }: { icon: string; label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border bg-surface p-4 text-center shadow-sm transition-shadow hover:shadow-md">
      <p className="mb-1 text-lg">{icon}</p>
      <p className="text-2xl font-bold text-primary">{value}</p>
      <p className="text-xs text-foreground/60">{label}</p>
    </div>
  );
}

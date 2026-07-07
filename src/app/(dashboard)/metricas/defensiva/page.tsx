import { MetricasTabs } from "@/components/metricas-tabs";
import { PageHeader } from "@/components/page-header";
import { PhaseDashboard } from "@/components/phase-dashboard";
import { SEASON_START_DATE } from "@/lib/metricas-config";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function DefensivaPage() {
  const supabase = await createClient();
  const { data: matches } = await supabase
    .from("match_stats")
    .select("id, rival, fecha, escudo_rival_url, stats_nacional, stats_rival")
    .gte("fecha", SEASON_START_DATE)
    .order("fecha", { ascending: true });

  return (
    <div>
      <PageHeader
        title="Métricas de Rendimiento"
        description="Fase defensiva: goles recibidos, presión, duelos y recuperación."
      />
      <MetricasTabs />
      <PhaseDashboard matches={matches ?? []} category="defensiva" />
    </div>
  );
}

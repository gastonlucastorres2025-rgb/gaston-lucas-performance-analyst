import { MetricasTabs } from "@/components/metricas-tabs";
import { PageHeader } from "@/components/page-header";
import { PhaseDashboard } from "@/components/phase-dashboard";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function ConstruccionPage() {
  const supabase = await createClient();
  const { data: matches } = await supabase
    .from("match_stats")
    .select("id, rival, fecha, escudo_rival_url, stats_nacional, stats_rival")
    .order("fecha", { ascending: true });

  return (
    <div>
      <PageHeader
        title="Métricas de Rendimiento"
        description="Construcción: posesión, circulación de pelota y progresión de pases."
      />
      <MetricasTabs />
      <PhaseDashboard matches={matches ?? []} category="construccion" />
    </div>
  );
}

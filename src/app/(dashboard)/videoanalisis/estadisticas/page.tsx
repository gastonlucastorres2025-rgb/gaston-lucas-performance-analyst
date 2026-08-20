import { PageHeader } from "@/components/page-header";
import { ReportesEstadisticos } from "@/components/videoanalisis/reportes-estadisticos";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function EstadisticasVAPage() {
  const supabase = await createClient();

  const [{ data: partidos }, { data: acciones }] = await Promise.all([
    supabase
      .from("partidos_va")
      .select("id, fecha, rival, competencia, categoria, condicion, goles_favor, goles_contra")
      .not("xml_procesado_en", "is", null)
      .order("fecha", { ascending: true }),
    supabase.from("va_acciones").select("partido_id, codigo, inicio_seg, fin_seg"),
  ]);

  return (
    <div>
      <PageHeader
        title="Reportes estadísticos"
        description="Métricas agregadas de los partidos ya tageados, filtrables por competencia, rival, condición, categoría y fecha."
      />
      <ReportesEstadisticos partidos={partidos ?? []} acciones={acciones ?? []} />
    </div>
  );
}

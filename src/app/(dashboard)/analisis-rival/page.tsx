import { PageHeader } from "@/components/page-header";
import { AnalisisRivalCard } from "@/components/analisis-rival/analisis-rival-card";
import { crearAnalisisRival } from "@/lib/analisis-rival-actions";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function AnalisisRivalPage() {
  const supabase = await createClient();
  const { data: analisis } = await supabase
    .from("analisis_rival")
    .select("id, rival, fecha, tipo_partido, updated_at")
    .order("updated_at", { ascending: false });

  return (
    <div>
      <div className="mb-6 flex items-start justify-between gap-4">
        <PageHeader
          title="Análisis de Rival"
          description="Plan de Partido: estructura, patrones y claves del próximo rival."
        />
        <form action={crearAnalisisRival}>
          <button
            type="submit"
            className="shrink-0 rounded-md bg-primary px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-primary-dark"
          >
            + Nuevo análisis
          </button>
        </form>
      </div>

      {analisis && analisis.length > 0 ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {analisis.map((a) => (
            <AnalisisRivalCard key={a.id} analisis={a} />
          ))}
        </div>
      ) : (
        <p className="py-16 text-center text-sm text-foreground/50">
          Todavía no hay análisis cargados. Empezá el primero con el botón de arriba.
        </p>
      )}
    </div>
  );
}

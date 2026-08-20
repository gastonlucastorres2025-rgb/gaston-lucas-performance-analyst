import { PageHeader } from "@/components/page-header";
import { InformePostPartidoCard } from "@/components/informes-post-partido/informe-post-partido-card";
import { crearInformePostPartido } from "@/lib/informes-post-partido-actions";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function InformesPostPartidoPage() {
  const supabase = await createClient();
  const { data: informes } = await supabase
    .from("informes_post_partido")
    .select("id, rival, fecha, resultado, fases")
    .order("updated_at", { ascending: false });

  return (
    <div>
      <div className="mb-6 flex items-start justify-between gap-4">
        <PageHeader
          title="Informe Post Partido"
          description="Después de jugar: cuestionario por fases (presión, ofensiva, defensiva, transiciones, balón parado) y observaciones generales."
        />
        <form action={crearInformePostPartido}>
          <button
            type="submit"
            className="shrink-0 rounded-md bg-primary px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-primary-dark"
          >
            + Nuevo informe
          </button>
        </form>
      </div>

      {informes && informes.length > 0 ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {informes.map((i) => (
            <InformePostPartidoCard key={i.id} fila={i} />
          ))}
        </div>
      ) : (
        <p className="py-16 text-center text-sm text-foreground/50">
          Todavía no hay informes cargados. Empezá el primero con el botón de arriba.
        </p>
      )}
    </div>
  );
}

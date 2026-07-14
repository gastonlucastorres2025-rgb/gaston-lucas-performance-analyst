import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { FasesRivalCard } from "@/components/fases-rival/fases-rival-card";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function FasesRivalPage() {
  const supabase = await createClient();
  const { data: filas } = await supabase
    .from("fases_rival")
    .select("id, rival, ronda, competencia, fases")
    .order("created_at", { ascending: false });

  return (
    <div>
      <div className="mb-6 flex items-start justify-between gap-4">
        <PageHeader
          title="Fases del Rival"
          description="Conectá una carpeta de Drive con los videos por fase de un rival y generá el PDF con los links."
        />
        <Link
          href="/fases-rival/nuevo"
          className="shrink-0 rounded-md bg-primary px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-primary-dark"
        >
          + Conectar carpeta
        </Link>
      </div>

      {filas && filas.length > 0 ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filas.map((f) => (
            <FasesRivalCard key={f.id} fila={f} />
          ))}
        </div>
      ) : (
        <p className="py-16 text-center text-sm text-foreground/50">
          Todavía no conectaste ninguna carpeta. Empezá con el botón de arriba.
        </p>
      )}
    </div>
  );
}

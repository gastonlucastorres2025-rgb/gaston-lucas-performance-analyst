import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { PartidoVACard } from "@/components/videoanalisis/partido-va-card";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function VideoanalisisPage() {
  const supabase = await createClient();
  const [{ data: partidos }, { data: logos }] = await Promise.all([
    supabase
      .from("partidos_va")
      .select("id, fecha, rival, competencia, categoria, condicion, goles_favor, goles_contra, youtube_video_id")
      .order("fecha", { ascending: false }),
    supabase.from("va_competencia_logos").select("nombre, logo_url"),
  ]);

  const logosPorCompetencia = new Map((logos ?? []).map((l) => [l.nombre, l.logo_url]));

  return (
    <div>
      <div className="mb-6 flex items-start justify-between gap-4">
        <PageHeader title="Videoanálisis" description="Partidos analizados, con video y etiquetado listos para filtrar." />
        <div className="flex shrink-0 items-center gap-2">
          <Link
            href="/videoanalisis/buscar"
            className="rounded-md border border-primary px-4 py-2 text-sm font-medium text-primary transition-colors hover:bg-primary/5"
          >
            Buscar clips
          </Link>
          <Link
            href="/videoanalisis/nuevo"
            className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-primary-dark"
          >
            + Nuevo partido
          </Link>
        </div>
      </div>

      {partidos && partidos.length > 0 ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {partidos.map((p) => (
            <PartidoVACard
              key={p.id}
              partido={p}
              logoCompetencia={(p.competencia && logosPorCompetencia.get(p.competencia)) || null}
            />
          ))}
        </div>
      ) : (
        <p className="py-16 text-center text-sm text-foreground/50">
          No hay partidos analizados todavía. Cargá el primero con el botón de arriba.
        </p>
      )}
    </div>
  );
}

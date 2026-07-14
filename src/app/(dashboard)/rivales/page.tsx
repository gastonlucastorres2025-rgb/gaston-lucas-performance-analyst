import { PageHeader } from "@/components/page-header";
import { RivalCard } from "@/components/rivales/rival-card";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

function contarPorRival(filas: { rival_id: string | null }[]): Map<string, number> {
  const mapa = new Map<string, number>();
  for (const f of filas) {
    if (!f.rival_id) continue;
    mapa.set(f.rival_id, (mapa.get(f.rival_id) ?? 0) + 1);
  }
  return mapa;
}

export default async function RivalesPage() {
  const supabase = await createClient();
  const [{ data: rivales }, { data: planes }, { data: videos }, { data: fases }] = await Promise.all([
    supabase.from("rivales").select("id, nombre, escudo_url").order("nombre"),
    supabase.from("analisis_rival").select("rival_id"),
    supabase.from("partidos_va").select("rival_id"),
    supabase.from("fases_rival").select("rival_id"),
  ]);

  const conteosPlanes = contarPorRival(planes ?? []);
  const conteosVideos = contarPorRival(videos ?? []);
  const conteosFases = contarPorRival(fases ?? []);

  return (
    <div>
      <PageHeader
        title="Rivales"
        description="Ficha unificada por rival: Plan de Partido, Videoanálisis y Fases del Rival en un solo lugar."
      />

      {rivales && rivales.length > 0 ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {rivales.map((r) => (
            <RivalCard
              key={r.id}
              id={r.id}
              nombre={r.nombre}
              escudoUrl={r.escudo_url}
              planes={conteosPlanes.get(r.id) ?? 0}
              videos={conteosVideos.get(r.id) ?? 0}
              fases={conteosFases.get(r.id) ?? 0}
            />
          ))}
        </div>
      ) : (
        <p className="py-16 text-center text-sm text-foreground/50">
          Todavía no hay rivales cargados. Se van a crear solos a medida que uses Análisis de Rival, Videoanálisis o
          Fases del Rival.
        </p>
      )}
    </div>
  );
}

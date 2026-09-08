import { PageHeader } from "@/components/page-header";
import { GpsSubnav } from "@/components/gps/gps-subnav";
import { MatchCard } from "@/components/gps/match-card";
import { obtenerPartidosReales } from "@/lib/gps-partidos";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function GpsPartidosPage() {
  const supabase = await createClient();
  const partidos = (await obtenerPartidosReales(supabase)).slice().sort((a, b) => b.fecha.localeCompare(a.fecha));

  return (
    <div>
      <PageHeader
        title="GPS · Partidos"
        description="Calendario real de partidos (de la planilla de Videoanálisis). Al entrar a cada uno se ve la carga física real del partido (1er/2do tiempo) y los entrenamientos de esa semana."
      />
      <GpsSubnav />

      {partidos.length === 0 ? (
        <p className="text-sm text-foreground/50">No hay partidos cargados en este período.</p>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {partidos.map((p) => (
            <MatchCard key={p.id} partido={p} />
          ))}
        </div>
      )}
    </div>
  );
}

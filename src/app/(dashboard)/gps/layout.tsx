import { PageHeader } from "@/components/page-header";
import { GpsSubnav } from "@/components/gps/gps-subnav";
import { SelectorClub } from "@/components/gps/selector-club";
import { listarClubes, obtenerClubActivo } from "@/lib/gps/club";
import { createClient } from "@/lib/supabase/server";

export default async function GpsLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const clubes = await listarClubes(supabase);
  const activo = await obtenerClubActivo(supabase, clubes);

  return (
    <div>
      <PageHeader title="GPS · Control de carga" description="Carga externa del plantel: ACWR, velocidad máxima y lesiones." />
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3 border-b border-border">
        <GpsSubnav />
        {clubes.length > 1 && (
          <div className="pb-2">
            <SelectorClub clubes={clubes} activo={activo} />
          </div>
        )}
      </div>
      {children}
    </div>
  );
}

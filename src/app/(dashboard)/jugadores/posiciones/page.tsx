import { JugadoresTabs } from "@/components/jugadores-tabs";
import { PageHeader } from "@/components/page-header";
import { TacticalBoard } from "@/components/tactical-board";
import { createClient } from "@/lib/supabase/server";

export default async function PosicionesPage() {
  const supabase = await createClient();
  const { data: players } = await supabase
    .from("players")
    .select("id, dorsal, nombre, apellido, posicion_principal, foto_url")
    .eq("estado", "activo")
    .order("dorsal", { ascending: true, nullsFirst: false });

  return (
    <div>
      <PageHeader
        title="Jugadores"
        description="Arrastrá jugadores para probar distintas formaciones en la reunión."
      />
      <JugadoresTabs />
      <TacticalBoard players={players ?? []} />
    </div>
  );
}

import { JugadoresTabs } from "@/components/jugadores-tabs";
import { PageHeader } from "@/components/page-header";
import { TacticalBoard } from "@/components/tactical-board";
import { createClient } from "@/lib/supabase/server";

export default async function EstructuraPage() {
  const supabase = await createClient();

  const [{ data: players }, { data: physicalData }] = await Promise.all([
    supabase
      .from("players")
      .select("id, dorsal, nombre, apellido, posicion_principal, foto_url")
      .eq("estado", "activo")
      .order("dorsal", { ascending: true, nullsFirst: false }),
    supabase
      .from("player_physical_data")
      .select("player_id, altura")
      .order("fecha", { ascending: false }),
  ]);

  const latestAlturaByPlayer = new Map<string, number | null>();
  for (const record of physicalData ?? []) {
    if (!latestAlturaByPlayer.has(record.player_id)) {
      latestAlturaByPlayer.set(record.player_id, record.altura);
    }
  }

  const playersWithAltura = (players ?? []).map((p) => ({
    ...p,
    altura: latestAlturaByPlayer.get(p.id) ?? null,
  }));

  return (
    <div>
      <PageHeader
        title="Estructura"
        description="Arrastrá jugadores a la cancha para armar la estructura durante la reunión."
      />
      <JugadoresTabs />
      <TacticalBoard players={playersWithAltura} />
    </div>
  );
}

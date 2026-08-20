import { PageHeader } from "@/components/page-header";
import { JugadoresTabla, type FilaJugadorTabla } from "@/components/seguimiento-internacional/jugadores-tabla";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function SeguimientoInternacionalJugadoresPage() {
  const supabase = await createClient();

  const [{ data: jugadores }, { data: observaciones }] = await Promise.all([
    supabase
      .from("si_jugadores")
      .select("id, full_name, current_club, primary_position, preferred_foot, height, tracking_status, profile_state, photo_url")
      .order("full_name"),
    supabase.from("si_observaciones").select("player_id"),
  ]);

  const conteos = new Map<string, number>();
  for (const o of observaciones ?? []) {
    conteos.set(o.player_id, (conteos.get(o.player_id) ?? 0) + 1);
  }

  const filas: FilaJugadorTabla[] = (jugadores ?? []).map((j) => ({
    id: j.id,
    fullName: j.full_name,
    currentClub: j.current_club,
    primaryPosition: j.primary_position,
    preferredFoot: j.preferred_foot,
    height: j.height,
    trackingStatus: j.tracking_status,
    profileState: j.profile_state,
    photoUrl: j.photo_url,
    cantidadObservaciones: conteos.get(j.id) ?? 0,
  }));

  return (
    <div>
      <PageHeader title="Jugadores" description="Todos los perfiles consolidados de Seguimiento Internacional." />
      <JugadoresTabla jugadores={filas} />
    </div>
  );
}

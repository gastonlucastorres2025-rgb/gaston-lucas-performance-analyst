import { LesionesPanel } from "@/components/gps/lesiones-panel";
import { hoyIso } from "@/lib/gps/calculos";
import { cargarCargaDiaria, listarLesiones, listarPlantel, obtenerContextoGps } from "@/lib/gps/datos";
import { obtenerClubActivo, CLUB_ACTUAL } from "@/lib/gps/club";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function GpsLesionesPage() {
  const supabase = await createClient();
  const club = await obtenerClubActivo(supabase);
  const carga = await cargarCargaDiaria(supabase, club);
  const [lesiones, plantel, ctx] = await Promise.all([listarLesiones(supabase, club), listarPlantel(supabase, carga, club), obtenerContextoGps(supabase)]);

  // Un jugador dado de baja puede seguir teniendo lesiones en el historial: se listan los activos
  // para cargar nuevas, y el filtro/tabla muestran todo lo registrado.
  const nombres = Array.from(new Set([...plantel.filter((j) => j.activo).map((j) => j.nombre), ...lesiones.map((l) => l.jugador)])).sort((a, b) =>
    a.localeCompare(b),
  );

  // Club anterior: los "días de baja en curso" se miden al último día con datos de esa temporada.
  let ultima: string | null = null;
  for (const dias of carga.values()) for (const f of dias.keys()) if (!ultima || f > ultima) ultima = f;
  const hoy = club === CLUB_ACTUAL ? hoyIso() : (ultima ?? hoyIso());

  return <LesionesPanel club={club} lesiones={lesiones} jugadores={nombres} puedeEditar={ctx?.puedeEditar ?? false} hoy={hoy} />;
}

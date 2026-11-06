import { PlantelPanel } from "@/components/gps/plantel-panel";
import { cargarCargaDiaria, listarPlantel, obtenerContextoGps } from "@/lib/gps/datos";
import { obtenerClubActivo } from "@/lib/gps/club";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function GpsPlantelPage() {
  const supabase = await createClient();
  const club = await obtenerClubActivo(supabase);
  const carga = await cargarCargaDiaria(supabase, club);
  const [plantel, ctx] = await Promise.all([listarPlantel(supabase, carga, club), obtenerContextoGps(supabase)]);

  return <PlantelPanel club={club} jugadores={plantel} puedeEditar={ctx?.puedeEditar ?? false} />;
}

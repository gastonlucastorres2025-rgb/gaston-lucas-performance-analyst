import { PageHeader } from "@/components/page-header";
import { ScoutingDashboard } from "@/components/scouting-dashboard";
import { createClient } from "@/lib/supabase/server";

export default async function ScoutingPage() {
  const supabase = await createClient();
  const { data: targets } = await supabase
    .from("scouting_targets")
    .select(
      "id, nombre, apellido, equipo_actual, liga, pais_liga, fecha_nacimiento, nacionalidad, posicion, club_formativo, proceso_seleccion, experiencia_altura, categoria, etiqueta",
    )
    .order("apellido", { ascending: true });

  return (
    <div>
      <PageHeader
        title="Scouting"
        description="Jugadores en seguimiento: filtrá y ubicá dónde están jugando."
      />
      <ScoutingDashboard targets={targets ?? []} />
    </div>
  );
}

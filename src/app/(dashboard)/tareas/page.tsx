import { PageHeader } from "@/components/page-header";
import { TareasPanel } from "@/components/tareas-panel";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function TareasPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: tareas } = await supabase
    .from("tareas")
    .select("id, titulo, descripcion, fecha, hora, completada, notificado")
    .eq("staff_id", user?.id ?? "")
    .order("fecha", { ascending: true })
    .order("hora", { ascending: true });

  return (
    <div>
      <PageHeader title="Tareas" description="Organizá tu semana y recibí avisos en el día y horario que marques." />
      <TareasPanel tareas={tareas ?? []} />
    </div>
  );
}

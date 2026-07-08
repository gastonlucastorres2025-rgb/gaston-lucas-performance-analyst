import { notFound } from "next/navigation";
import { PageHeader } from "@/components/page-header";
import { SesionPlanificador } from "@/components/sesion-planificador";
import { parseDateKey } from "@/lib/calendar-utils";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const FECHA_REGEX = /^\d{4}-\d{2}-\d{2}$/;

export default async function SesionDiaPage({
  params,
}: {
  params: Promise<{ fecha: string }>;
}) {
  const { fecha } = await params;
  if (!FECHA_REGEX.test(fecha)) notFound();

  const supabase = await createClient();
  const [{ data: sesion }, { data: jugadores }] = await Promise.all([
    supabase.from("sesiones").select("*").eq("fecha", fecha).maybeSingle(),
    supabase
      .from("players")
      .select("id, nombre, apellido, dorsal, foto_url, posicion_principal")
      .eq("estado", "activo")
      .order("apellido", { ascending: true }),
  ]);

  const fechaTexto = parseDateKey(fecha).toLocaleDateString("es-UY", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return (
    <div>
      <PageHeader title="Planificación de la sesión" description={fechaTexto} />
      <SesionPlanificador fecha={fecha} sesion={sesion ?? null} jugadores={jugadores ?? []} />
    </div>
  );
}

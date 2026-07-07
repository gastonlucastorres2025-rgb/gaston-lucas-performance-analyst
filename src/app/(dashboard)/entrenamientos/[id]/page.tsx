import { PageHeader } from "@/components/page-header";

export default async function EntrenamientoDetallePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return (
    <PageHeader
      title="Detalle de entrenamiento"
      description={`Asistencia y ejercicios de la sesión ${id}.`}
    />
  );
}

import { PageHeader } from "@/components/page-header";

export default async function JugadorDetallePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return (
    <PageHeader
      title="Ficha del jugador"
      description={`Datos personales, físicos, médicos, estadísticas y videos del jugador ${id}.`}
    />
  );
}

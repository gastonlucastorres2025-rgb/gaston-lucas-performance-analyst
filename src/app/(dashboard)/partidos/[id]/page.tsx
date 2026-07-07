import { PageHeader } from "@/components/page-header";

export default async function PartidoDetallePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return (
    <PageHeader
      title="Detalle de partido"
      description={`Alineación, eventos y estadísticas del partido ${id}.`}
    />
  );
}

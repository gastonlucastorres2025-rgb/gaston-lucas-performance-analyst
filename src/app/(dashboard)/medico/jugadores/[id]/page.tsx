import { PageHeader } from "@/components/page-header";

export default async function HistorialMedicoPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return (
    <PageHeader
      title="Historial médico"
      description={`Lesiones y chequeos del jugador ${id}.`}
    />
  );
}

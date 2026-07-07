import { PageHeader } from "@/components/page-header";

export default async function ScoutingDetallePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return (
    <PageHeader
      title="Informe de scouting"
      description={`Fortalezas, debilidades y recomendación sobre el objetivo ${id}.`}
    />
  );
}

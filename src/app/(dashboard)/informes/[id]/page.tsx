import { PageHeader } from "@/components/page-header";

export default async function InformeDetallePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return <PageHeader title="Informe" description={`Contenido del informe ${id}.`} />;
}

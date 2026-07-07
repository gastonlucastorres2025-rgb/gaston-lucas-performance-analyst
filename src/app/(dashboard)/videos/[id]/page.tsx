import { PageHeader } from "@/components/page-header";

export default async function VideoDetallePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return (
    <PageHeader
      title="Video"
      description={`Reproductor y etiquetas tácticas del video ${id}.`}
    />
  );
}

export default async function VideoDetallePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return (
    <div>
      <h1 className="text-2xl font-semibold">Video</h1>
      <p className="mt-2 text-sm text-black/60">
        Reproductor y etiquetas tácticas del video {id}.
      </p>
    </div>
  );
}

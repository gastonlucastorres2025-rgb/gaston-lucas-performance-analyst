export default async function PartidoDetallePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return (
    <div>
      <h1 className="text-2xl font-semibold">Detalle de partido</h1>
      <p className="mt-2 text-sm text-foreground/60">
        Alineación, eventos y estadísticas del partido {id}.
      </p>
    </div>
  );
}

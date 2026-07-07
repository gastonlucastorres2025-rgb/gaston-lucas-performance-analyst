export default async function JugadorDetallePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return (
    <div>
      <h1 className="text-2xl font-semibold">Ficha del jugador</h1>
      <p className="mt-2 text-sm text-foreground/60">
        Datos personales, físicos, médicos, estadísticas y videos del jugador {id}.
      </p>
    </div>
  );
}

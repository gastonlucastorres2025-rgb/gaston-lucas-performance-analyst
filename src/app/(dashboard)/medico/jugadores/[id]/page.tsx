export default async function HistorialMedicoPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return (
    <div>
      <h1 className="text-2xl font-semibold">Historial médico</h1>
      <p className="mt-2 text-sm text-black/60">
        Lesiones y chequeos del jugador {id}.
      </p>
    </div>
  );
}

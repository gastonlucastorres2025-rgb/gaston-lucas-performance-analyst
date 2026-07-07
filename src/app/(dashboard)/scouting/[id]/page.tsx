export default async function ScoutingDetallePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return (
    <div>
      <h1 className="text-2xl font-semibold">Informe de scouting</h1>
      <p className="mt-2 text-sm text-black/60">
        Fortalezas, debilidades y recomendación sobre el objetivo {id}.
      </p>
    </div>
  );
}

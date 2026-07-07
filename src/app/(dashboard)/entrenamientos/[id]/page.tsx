export default async function EntrenamientoDetallePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return (
    <div>
      <h1 className="text-2xl font-semibold">Detalle de entrenamiento</h1>
      <p className="mt-2 text-sm text-foreground/60">
        Asistencia y ejercicios de la sesión {id}.
      </p>
    </div>
  );
}

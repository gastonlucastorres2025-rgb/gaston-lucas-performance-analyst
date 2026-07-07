export default async function InformeDetallePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return (
    <div>
      <h1 className="text-2xl font-semibold">Informe</h1>
      <p className="mt-2 text-sm text-foreground/60">Contenido del informe {id}.</p>
    </div>
  );
}

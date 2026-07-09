import Link from "next/link";

type Tarea = { id: string; titulo: string; fecha: string; hora: string };

function toDateTime(fecha: string, hora: string): Date {
  return new Date(`${fecha}T${hora}`);
}

function formatFechaHora(fecha: string, hora: string): string {
  const dt = toDateTime(fecha, hora);
  const fechaTexto = dt.toLocaleDateString("es-UY", { weekday: "short", day: "numeric", month: "short" });
  return `${fechaTexto} · ${hora.slice(0, 5)}`;
}

export function TareasResumen({ tareas }: { tareas: Tarea[] }) {
  const now = new Date();
  const ordenadas = [...tareas].sort(
    (a, b) => toDateTime(a.fecha, a.hora).getTime() - toDateTime(b.fecha, b.hora).getTime(),
  );
  const proximas = ordenadas.slice(0, 6);

  return (
    <div className="rounded-xl border border-border bg-surface p-5 shadow-sm">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-foreground/50">Tareas pendientes</h2>
        <Link href="/tareas" className="text-xs font-medium text-primary hover:underline">
          Ver todas →
        </Link>
      </div>

      {proximas.length === 0 ? (
        <p className="py-4 text-center text-sm text-foreground/40">No tenés tareas pendientes.</p>
      ) : (
        <div className="flex flex-col gap-2">
          {proximas.map((t) => {
            const vencida = toDateTime(t.fecha, t.hora) < now;
            return (
              <Link
                key={t.id}
                href="/tareas"
                className={`flex items-center justify-between rounded-lg border border-l-4 border-border px-3 py-2 text-sm transition-colors hover:bg-primary/5 ${
                  vencida ? "border-l-accent" : "border-l-primary/40"
                }`}
              >
                <span className="min-w-0 flex-1 truncate">{t.titulo}</span>
                <span className={`ml-3 shrink-0 text-xs capitalize ${vencida ? "text-accent" : "text-foreground/40"}`}>
                  {formatFechaHora(t.fecha, t.hora)}
                </span>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

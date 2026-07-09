type Jugador = { nombre: string; foto: string; goles: number; asistencias: number };

function JugadorRow({ jugador, valor, label }: { jugador: Jugador; valor: number; label: string }) {
  return (
    <div className="flex items-center gap-3 rounded-lg border border-border bg-surface px-3 py-2">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={jugador.foto}
        alt=""
        width={36}
        height={36}
        className="h-9 w-9 shrink-0 rounded-full border border-border object-cover"
      />
      <span className="min-w-0 flex-1 truncate text-sm font-medium">{jugador.nombre}</span>
      <span className="shrink-0 text-sm font-bold text-primary">
        {valor} <span className="text-xs font-normal text-foreground/40">{label}</span>
      </span>
    </div>
  );
}

export function RivalJugadores({
  rival,
  goleadores,
  asistidores,
}: {
  rival: string;
  goleadores: Jugador[];
  asistidores: Jugador[];
}) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <div>
        <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-foreground/50">
          Goleadores de {rival}
        </h3>
        <div className="flex flex-col gap-1.5">
          {goleadores.length > 0 ? (
            goleadores.map((j) => <JugadorRow key={j.nombre} jugador={j} valor={j.goles} label="goles" />)
          ) : (
            <p className="text-xs text-foreground/40">Sin datos.</p>
          )}
        </div>
      </div>
      <div>
        <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-foreground/50">
          Asistidores de {rival}
        </h3>
        <div className="flex flex-col gap-1.5">
          {asistidores.length > 0 ? (
            asistidores.map((j) => <JugadorRow key={j.nombre} jugador={j} valor={j.asistencias} label="asist." />)
          ) : (
            <p className="text-xs text-foreground/40">Sin datos.</p>
          )}
        </div>
      </div>
    </div>
  );
}

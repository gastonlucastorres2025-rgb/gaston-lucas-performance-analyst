type Equipo = { nombre: string; escudo: string | null; goles: number | null };
type Competencia = { nombre: string; logoUrl: string | null } | null;

function Escudo({ nombre, escudo, size }: { nombre: string; escudo: string | null; size: number }) {
  if (escudo) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={escudo}
        alt={nombre}
        width={size}
        height={size}
        className="shrink-0 rounded-full border border-border bg-white object-contain"
        style={{ width: size, height: size }}
      />
    );
  }
  return (
    <span
      className="flex shrink-0 items-center justify-center rounded-full border border-border bg-surface font-semibold text-foreground/40"
      style={{ width: size, height: size, fontSize: size * 0.4 }}
    >
      {nombre.charAt(0).toUpperCase()}
    </span>
  );
}

export function PlacaPartido({
  local,
  visitante,
  competencia,
  size = "lg",
}: {
  local: Equipo;
  visitante: Equipo;
  competencia?: Competencia;
  size?: "sm" | "lg";
}) {
  const escudoSize = size === "lg" ? 56 : 32;
  const tieneResultado = local.goles != null && visitante.goles != null;
  const nombreClase = size === "lg" ? "text-sm font-semibold" : "text-xs font-medium";

  return (
    <div className="flex flex-col items-center gap-2">
      {competencia?.nombre && (
        <div className="flex items-center gap-2 rounded-full bg-surface px-2.5 py-1 text-[11px] font-medium text-foreground/60">
          {competencia.logoUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={competencia.logoUrl} alt="" width={22} height={22} className="shrink-0 object-contain" />
          )}
          <span className="truncate">{competencia.nombre}</span>
        </div>
      )}
      <div className="flex w-full items-center justify-center gap-3">
        <div className="flex flex-1 flex-col items-center gap-1 text-center">
          <Escudo nombre={local.nombre} escudo={local.escudo} size={escudoSize} />
          <span className={`${nombreClase} max-w-full truncate`}>{local.nombre}</span>
        </div>

        {tieneResultado ? (
          <div className="flex shrink-0 items-center gap-1.5 rounded-md bg-primary px-2.5 py-1 font-mono font-bold text-white">
            <span>{local.goles}</span>
            <span className="text-white/50">-</span>
            <span>{visitante.goles}</span>
          </div>
        ) : (
          <span className="shrink-0 text-xs font-semibold text-foreground/30">VS</span>
        )}

        <div className="flex flex-1 flex-col items-center gap-1 text-center">
          <Escudo nombre={visitante.nombre} escudo={visitante.escudo} size={escudoSize} />
          <span className={`${nombreClase} max-w-full truncate`}>{visitante.nombre}</span>
        </div>
      </div>
    </div>
  );
}

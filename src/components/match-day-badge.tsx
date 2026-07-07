import Link from "next/link";

type Match = {
  id: string;
  tipo: string;
  rival: string | null;
  competencia: string | null;
  escudo_rival_url: string | null;
  condicion: string | null;
  notas: string | null;
};

export function MatchDayBadge({ match }: { match: Match }) {
  if (match.tipo === "viaje") {
    return (
      <div
        className="flex items-center gap-1 truncate rounded bg-accent/10 px-1.5 py-0.5 text-[11px] font-medium text-accent"
        title={match.notas ?? ""}
      >
        <span>🚢</span>
        <span className="truncate">{match.notas ?? "Viaje"}</span>
      </div>
    );
  }

  return (
    <Link
      href={`/partidos/${match.id}`}
      className="flex items-center gap-1.5 rounded bg-accent/10 px-1.5 py-1 hover:bg-accent/20"
      title={`${match.rival ?? ""}${match.competencia ? ` · ${match.competencia}` : ""}`}
    >
      {match.escudo_rival_url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={match.escudo_rival_url}
          alt=""
          className="h-4 w-4 shrink-0 object-contain"
        />
      ) : (
        <span className="shrink-0">⚽</span>
      )}
      <span className="min-w-0 leading-tight">
        <span className="block truncate text-[11px] font-medium text-accent">
          {match.rival}
        </span>
        {match.competencia && (
          <span className="block truncate text-[9px] text-accent/70">
            {match.competencia}
          </span>
        )}
      </span>
    </Link>
  );
}

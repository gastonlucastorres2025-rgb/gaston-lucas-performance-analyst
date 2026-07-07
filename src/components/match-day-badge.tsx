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
      className="flex items-center gap-1 truncate rounded bg-accent/10 px-1.5 py-0.5 text-[11px] font-medium text-accent hover:bg-accent/20"
      title={`${match.rival ?? ""}${match.competencia ? ` · ${match.competencia}` : ""}`}
    >
      {match.escudo_rival_url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={match.escudo_rival_url}
          alt=""
          width={14}
          height={14}
          className="h-3.5 w-3.5 shrink-0 object-contain"
        />
      ) : (
        <span className="shrink-0">⚽</span>
      )}
      <span className="truncate">{match.rival}</span>
    </Link>
  );
}

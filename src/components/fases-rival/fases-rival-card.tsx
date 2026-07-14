import Link from "next/link";

type Fila = {
  id: string;
  rival: string;
  ronda: string;
  competencia: string;
  fases: { nombre: string; link: string }[];
};

export function FasesRivalCard({ fila }: { fila: Fila }) {
  return (
    <Link
      href={`/fases-rival/${fila.id}`}
      className="flex flex-col gap-2 rounded-xl border border-border bg-surface p-4 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md"
    >
      <p className="truncate font-semibold text-foreground">{fila.rival || "Rival sin nombre"}</p>
      <p className="truncate text-xs text-foreground/50">
        {[fila.ronda, fila.competencia].filter(Boolean).join(" · ") || "Sin datos"}
      </p>
      <p className="mt-1 text-[11px] text-foreground/40">
        {fila.fases.length} {fila.fases.length === 1 ? "fase" : "fases"}
      </p>
    </Link>
  );
}

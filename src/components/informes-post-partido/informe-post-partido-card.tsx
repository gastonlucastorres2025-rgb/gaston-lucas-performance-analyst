import Link from "next/link";
import { contarProgreso, type RespuestasFase } from "@/lib/informes-post-partido-types";

type Fila = {
  id: string;
  rival: string;
  fecha: string | null;
  resultado: string;
  fases: Record<string, RespuestasFase> | null;
};

export function InformePostPartidoCard({ fila }: { fila: Fila }) {
  const { respondidas, total } = contarProgreso(fila.fases);

  return (
    <Link
      href={`/informes-post-partido/${fila.id}`}
      className="flex flex-col gap-2 rounded-xl border border-border bg-surface p-4 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md"
    >
      <p className="truncate font-semibold text-foreground">{fila.rival || "Rival sin nombre"}</p>
      <p className="truncate text-xs text-foreground/50">
        {[fila.fecha, fila.resultado].filter(Boolean).join(" · ") || "Sin datos"}
      </p>
      {total > 0 && (
        <span className="mt-1 inline-block w-fit rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary">
          {respondidas}/{total} preguntas respondidas
        </span>
      )}
    </Link>
  );
}

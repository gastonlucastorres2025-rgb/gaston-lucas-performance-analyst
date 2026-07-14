import Link from "next/link";
import { EVALUACION_LABEL, type Evaluacion } from "@/lib/informes-post-partido-types";

type Fila = {
  id: string;
  rival: string;
  fecha: string | null;
  resultado: string;
  plan_funciono: Evaluacion;
};

export function InformePostPartidoCard({ fila }: { fila: Fila }) {
  return (
    <Link
      href={`/informes-post-partido/${fila.id}`}
      className="flex flex-col gap-2 rounded-xl border border-border bg-surface p-4 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md"
    >
      <p className="truncate font-semibold text-foreground">{fila.rival || "Rival sin nombre"}</p>
      <p className="truncate text-xs text-foreground/50">
        {[fila.fecha, fila.resultado].filter(Boolean).join(" · ") || "Sin datos"}
      </p>
      {fila.plan_funciono && (
        <span className="mt-1 inline-block w-fit rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary">
          Plan: {EVALUACION_LABEL[fila.plan_funciono]}
        </span>
      )}
    </Link>
  );
}

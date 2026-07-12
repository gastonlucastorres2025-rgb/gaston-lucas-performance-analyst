import Link from "next/link";
import { parseDateKey } from "@/lib/calendar-utils";

type Fila = {
  id: string;
  rival: string;
  fecha: string | null;
  tipo_partido: string;
  updated_at: string;
};

export function AnalisisRivalCard({ analisis }: { analisis: Fila }) {
  const fechaTexto = analisis.fecha
    ? parseDateKey(analisis.fecha).toLocaleDateString("es-UY", { day: "numeric", month: "short", year: "numeric" })
    : null;
  const actualizadoTexto = new Date(analisis.updated_at).toLocaleDateString("es-UY", {
    day: "numeric",
    month: "short",
  });

  return (
    <Link
      href={`/analisis-rival/${analisis.id}`}
      className="flex flex-col gap-2 rounded-xl border border-border bg-surface p-4 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md"
    >
      <p className="truncate font-semibold text-foreground">{analisis.rival || "Rival sin nombre"}</p>
      <p className="truncate text-xs text-foreground/50">
        {[fechaTexto, analisis.tipo_partido].filter(Boolean).join(" · ") || "Sin datos cargados"}
      </p>
      <p className="mt-1 text-[11px] text-foreground/40">Editado el {actualizadoTexto}</p>
    </Link>
  );
}

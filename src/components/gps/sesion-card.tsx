import Link from "next/link";
import { promedioSimple } from "@/lib/gps-metricas";
import type { GpsRegistro } from "@/lib/gps-data";

const TURNO_LABEL: Record<string, string> = { M: "Matutino", V: "Vespertino" };

export function SesionCard({
  id,
  fecha,
  turno,
  md,
  cantidadJugadores,
  registros,
}: {
  id: string;
  fecha: string;
  turno: string | null;
  md: string | null;
  cantidadJugadores: number;
  registros: GpsRegistro[];
}) {
  const fechaObj = new Date(`${fecha}T00:00:00`);
  const distancia = promedioSimple(registros, "distanciaTotalM");
  const hsr = promedioSimple(registros, "distAltaVelocidadM");
  const sprint = promedioSimple(registros, "distMuyAltaVelocidadM");

  return (
    <Link
      href={`/gps/sesiones/${id}`}
      className="group flex flex-col rounded-xl border border-border bg-surface p-4 transition-all hover:-translate-y-0.5 hover:shadow-md"
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-foreground/45">
            {fechaObj.toLocaleDateString("es-UY", { day: "2-digit", month: "short" })}
            {turno ? ` · ${TURNO_LABEL[turno] ?? turno}` : ""}
          </p>
          <p className="mt-0.5 text-sm font-semibold text-foreground">Entrenamiento</p>
        </div>
        {md && (
          <span className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold ${md === "MD" ? "bg-accent text-white" : "bg-primary/10 text-primary"}`}>
            {md === "MD" ? "PARTIDO" : md.replace("MD", "M")}
          </span>
        )}
      </div>
      <p className="mt-1 text-xs text-foreground/45">{cantidadJugadores} jugadores</p>
      <div className="mt-3 grid grid-cols-3 gap-2 border-t border-border pt-3 text-center">
        <div>
          <p className="text-sm font-semibold tabular-nums text-foreground">{distancia !== null ? Math.round(distancia).toLocaleString("es-UY") : "—"}</p>
          <p className="text-[10px] uppercase tracking-wide text-foreground/40">Dist. prom. (m)</p>
        </div>
        <div>
          <p className="text-sm font-semibold tabular-nums text-foreground">{hsr !== null ? Math.round(hsr).toLocaleString("es-UY") : "—"}</p>
          <p className="text-[10px] uppercase tracking-wide text-foreground/40">HSR prom. (m)</p>
        </div>
        <div>
          <p className="text-sm font-semibold tabular-nums text-foreground">{sprint !== null ? Math.round(sprint).toLocaleString("es-UY") : "—"}</p>
          <p className="text-[10px] uppercase tracking-wide text-foreground/40">Sprint prom. (m)</p>
        </div>
      </div>
    </Link>
  );
}

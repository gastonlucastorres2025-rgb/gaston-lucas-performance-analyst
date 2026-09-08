import Image from "next/image";
import Link from "next/link";
import { EscudoRival } from "@/components/gps/escudo-rival";
import type { PartidoGps } from "@/lib/gps-partidos";

export function MatchCard({ partido }: { partido: PartidoGps }) {
  const local = partido.condicion === "local";
  const fechaTexto = new Date(`${partido.fecha}T00:00:00`).toLocaleDateString("es-UY", { day: "2-digit", month: "short", year: "numeric" });
  const ganado = partido.golesFavor > partido.golesContra;
  const perdido = partido.golesFavor < partido.golesContra;

  return (
    <Link
      href={`/gps/partidos/${partido.id}`}
      className="group flex flex-col rounded-xl border border-border bg-surface p-4 transition-all hover:-translate-y-0.5 hover:shadow-md"
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-medium text-foreground/45">{fechaTexto}</span>
        <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary">{partido.competencia}</span>
      </div>
      <div className="mt-3 flex items-center justify-center gap-3">
        <div className="flex flex-1 flex-col items-center gap-1">
          <Image src="/escudo-nacional.png" alt="Nacional" width={32} height={32} />
          <span className="text-[11px] text-foreground/50">Nacional</span>
        </div>
        <div className={`rounded-lg px-3 py-1 text-lg font-bold tabular-nums ${ganado ? "bg-emerald-50 text-emerald-700" : perdido ? "bg-accent/10 text-accent" : "bg-primary/5 text-foreground"}`}>
          {local ? `${partido.golesFavor} - ${partido.golesContra}` : `${partido.golesContra} - ${partido.golesFavor}`}
        </div>
        <div className="flex flex-1 flex-col items-center gap-1">
          <EscudoRival nombre={partido.rival} url={partido.rivalEscudo} size={32} />
          <span className="max-w-[6.5rem] truncate text-[11px] text-foreground/50">{partido.rival}</span>
        </div>
      </div>
      <p className="mt-3 text-center text-xs text-foreground/40">{local ? "Local" : "Visitante"}</p>
    </Link>
  );
}

import Link from "next/link";
import { parseDateKey } from "@/lib/calendar-utils";

type Partido = {
  id: string;
  fecha: string;
  rival: string;
  competencia: string | null;
  categoria: string | null;
  condicion: string | null;
  goles_favor: number | null;
  goles_contra: number | null;
  youtube_video_id: string;
};

export function PartidoVACard({ partido }: { partido: Partido }) {
  const fechaTexto = parseDateKey(partido.fecha).toLocaleDateString("es-UY", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
  const tieneResultado = partido.goles_favor != null && partido.goles_contra != null;

  return (
    <Link
      href={`/videoanalisis/${partido.id}`}
      className="group overflow-hidden rounded-xl border border-border bg-surface shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md"
    >
      <div className="relative aspect-video w-full overflow-hidden bg-black">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={`https://img.youtube.com/vi/${partido.youtube_video_id}/mqdefault.jpg`}
          alt=""
          className="h-full w-full object-cover transition-transform group-hover:scale-105"
        />
        <div className="absolute inset-0 flex items-center justify-center bg-black/0 transition-colors group-hover:bg-black/20">
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-white/90 text-primary opacity-0 shadow-md transition-opacity group-hover:opacity-100">
            ▶
          </span>
        </div>
        {tieneResultado && (
          <span className="absolute right-2 top-2 rounded-full bg-black/70 px-2 py-0.5 font-mono text-xs font-semibold text-white">
            {partido.goles_favor} - {partido.goles_contra}
          </span>
        )}
      </div>
      <div className="p-3">
        <p className="truncate font-medium">
          {partido.condicion === "visitante" ? `${partido.rival} vs Nacional` : `Nacional vs ${partido.rival}`}
        </p>
        <p className="mt-0.5 truncate text-xs text-foreground/50">
          {fechaTexto}
          {partido.competencia ? ` · ${partido.competencia}` : ""}
        </p>
        {partido.categoria && (
          <span className="mt-2 inline-block rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary">
            {partido.categoria}
          </span>
        )}
      </div>
    </Link>
  );
}

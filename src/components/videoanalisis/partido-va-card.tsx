import Link from "next/link";
import { parseDateKey } from "@/lib/calendar-utils";
import { equiposPlaca } from "@/lib/videoanalisis/placa-helpers";
import { PlacaPartido } from "@/components/videoanalisis/placa-partido";

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

export function PartidoVACard({
  partido,
  logoCompetencia,
}: {
  partido: Partido;
  logoCompetencia: string | null;
}) {
  const fechaTexto = parseDateKey(partido.fecha).toLocaleDateString("es-UY", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
  const { local, visitante } = equiposPlaca(partido);

  return (
    <Link
      href={`/videoanalisis/${partido.id}`}
      className="group overflow-hidden rounded-xl border border-border bg-surface shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md"
    >
      <div className="relative aspect-video w-full overflow-hidden">
        {logoCompetencia ? (
          <div className="flex h-full w-full items-center justify-center bg-white p-6">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={logoCompetencia}
              alt=""
              className="h-full w-full object-contain transition-transform group-hover:scale-105"
            />
          </div>
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={`https://img.youtube.com/vi/${partido.youtube_video_id}/mqdefault.jpg`}
            alt=""
            className="h-full w-full bg-black object-cover transition-transform group-hover:scale-105"
          />
        )}
        <div className="absolute inset-0 flex items-center justify-center bg-black/0 transition-colors group-hover:bg-black/20">
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-white/90 text-primary opacity-0 shadow-md transition-opacity group-hover:opacity-100">
            ▶
          </span>
        </div>
      </div>
      <div className="p-3">
        <PlacaPartido
          local={local}
          visitante={visitante}
          competencia={partido.competencia ? { nombre: partido.competencia, logoUrl: logoCompetencia } : null}
          size="sm"
        />
        <div className="mt-2 flex items-center justify-between gap-2">
          <p className="truncate text-xs text-foreground/50">{fechaTexto}</p>
          {partido.categoria && (
            <span className="shrink-0 rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary">
              {partido.categoria}
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}

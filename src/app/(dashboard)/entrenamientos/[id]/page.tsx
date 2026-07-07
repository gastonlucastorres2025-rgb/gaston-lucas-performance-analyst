import { notFound } from "next/navigation";
import { PageHeader } from "@/components/page-header";
import { SessionVideoPlayer } from "@/components/session-video-player";
import { parseDateKey } from "@/lib/calendar-utils";
import { fetchTrainingSessions } from "@/lib/training-sheet";

export const dynamic = "force-dynamic";

const TURNO_LABEL: Record<string, string> = {
  M: "Matutino",
  V: "Vespertino",
};

export default async function EntrenamientoDetallePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const sessions = await fetchTrainingSessions();
  const session = sessions.find((s) => s.id === id);

  if (!session) notFound();

  const fechaTexto = parseDateKey(session.fecha).toLocaleDateString("es-UY", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return (
    <div>
      <PageHeader
        title="Entrenamiento"
        description={`${fechaTexto}${session.turno ? ` · ${TURNO_LABEL[session.turno]}` : ""}`}
      />

      <div className="mb-6 flex flex-wrap gap-2">
        {session.lugar && (
          <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
            📍 {session.lugar}
          </span>
        )}
        {session.rival && (
          <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
            {session.rival}
          </span>
        )}
        {session.gpsUrl && (
          <a
            href={session.gpsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-full bg-accent/10 px-3 py-1 text-xs font-medium text-accent hover:bg-accent/20"
          >
            📊 Ver informe GPS
          </a>
        )}
      </div>

      <SessionVideoPlayer tareas={session.tareas} sesionCompletaUrl={session.sesionCompletaUrl} />
    </div>
  );
}

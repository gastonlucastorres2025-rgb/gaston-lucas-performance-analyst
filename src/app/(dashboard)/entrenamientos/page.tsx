import Link from "next/link";
import { MatchDayBadge } from "@/components/match-day-badge";
import { MonthCalendar } from "@/components/month-calendar";
import { MonthNav } from "@/components/month-nav";
import { PageHeader } from "@/components/page-header";
import { fetchTrainingSessions, type TrainingSession } from "@/lib/training-sheet";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function EntrenamientosPage({
  searchParams,
}: {
  searchParams: Promise<{ mes?: string }>;
}) {
  const { mes } = await searchParams;
  const today = new Date();

  const [year, month] = mes
    ? mes.split("-").map(Number)
    : [today.getFullYear(), today.getMonth() + 1];

  const supabase = await createClient();
  const [sessions, { data: matches }] = await Promise.all([
    fetchTrainingSessions(),
    supabase.from("matches").select("*").order("fecha", { ascending: true }),
  ]);

  const sessionsByDate = new Map<string, TrainingSession[]>();
  for (const session of sessions) {
    const list = sessionsByDate.get(session.fecha) ?? [];
    list.push(session);
    sessionsByDate.set(session.fecha, list);
  }

  const matchesByDate = new Map<string, NonNullable<typeof matches>>();
  for (const match of matches ?? []) {
    const list = matchesByDate.get(match.fecha) ?? [];
    list.push(match);
    matchesByDate.set(match.fecha, list);
  }

  return (
    <div>
      <PageHeader
        title="Entrenamientos"
        description="Calendario de sesiones y partidos, actualizado en vivo desde Google Sheets."
      />

      <MonthNav year={year} month={month} />

      <MonthCalendar
        year={year}
        month={month}
        renderDay={(_date, key) => {
          const daySessions = sessionsByDate.get(key) ?? [];
          const dayMatches = matchesByDate.get(key) ?? [];

          return (
            <>
              {dayMatches.map((match) => (
                <MatchDayBadge key={match.id} match={match} />
              ))}
              {daySessions.map((session) => (
                <Link
                  key={session.id}
                  href={`/entrenamientos/${session.id}`}
                  className="truncate rounded bg-primary/10 px-1.5 py-0.5 text-[11px] font-medium text-primary hover:bg-primary/20"
                  title={session.lugar ?? ""}
                >
                  {session.turno === "M" ? "🌅 " : session.turno === "V" ? "🌆 " : ""}
                  {session.lugar ?? "Entrenamiento"}
                </Link>
              ))}
            </>
          );
        }}
      />
    </div>
  );
}

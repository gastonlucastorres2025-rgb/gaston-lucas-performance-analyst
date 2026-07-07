import { MatchDayBadge } from "@/components/match-day-badge";
import { MonthCalendar } from "@/components/month-calendar";
import { MonthNav } from "@/components/month-nav";
import { PageHeader } from "@/components/page-header";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function PartidosPage({
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
  const { data: matches } = await supabase
    .from("matches")
    .select("*")
    .order("fecha", { ascending: true });

  const matchesByDate = new Map<string, NonNullable<typeof matches>>();
  for (const match of matches ?? []) {
    const list = matchesByDate.get(match.fecha) ?? [];
    list.push(match);
    matchesByDate.set(match.fecha, list);
  }

  return (
    <div>
      <PageHeader title="Partidos" description="Calendario de partidos y eventos." />

      <MonthNav year={year} month={month} />

      <MonthCalendar
        year={year}
        month={month}
        renderDay={(_date, key) => {
          const dayMatches = matchesByDate.get(key) ?? [];
          return dayMatches.map((match) => <MatchDayBadge key={match.id} match={match} />);
        }}
      />
    </div>
  );
}

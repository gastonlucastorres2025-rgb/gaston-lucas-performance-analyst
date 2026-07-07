import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { buildMonthGrid, DIAS_SEMANA, MESES, toDateKey } from "@/lib/calendar-utils";
import { fetchTrainingSessions, type TrainingSession } from "@/lib/training-sheet";

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

  const sessions = await fetchTrainingSessions();
  const sessionsByDate = new Map<string, TrainingSession[]>();
  for (const session of sessions) {
    const list = sessionsByDate.get(session.fecha) ?? [];
    list.push(session);
    sessionsByDate.set(session.fecha, list);
  }

  const weeks = buildMonthGrid(year, month);
  const todayKey = toDateKey(today);

  const prevMonth = month === 1 ? { year: year - 1, month: 12 } : { year, month: month - 1 };
  const nextMonth = month === 12 ? { year: year + 1, month: 1 } : { year, month: month + 1 };

  return (
    <div>
      <PageHeader
        title="Entrenamientos"
        description="Calendario de sesiones, actualizado en vivo desde Google Sheets."
      />

      <div className="mb-4 flex items-center justify-between">
        <Link
          href={`?mes=${prevMonth.year}-${prevMonth.month}`}
          className="rounded-md border border-border px-3 py-1.5 text-sm hover:bg-primary/5"
        >
          ← Anterior
        </Link>
        <h2 className="text-lg font-semibold">
          {MESES[month - 1]} {year}
        </h2>
        <Link
          href={`?mes=${nextMonth.year}-${nextMonth.month}`}
          className="rounded-md border border-border px-3 py-1.5 text-sm hover:bg-primary/5"
        >
          Siguiente →
        </Link>
      </div>

      <div className="overflow-hidden rounded-lg border border-border bg-surface">
        <div className="grid grid-cols-7 border-b border-border bg-primary/5 text-xs font-medium uppercase tracking-wide text-foreground/60">
          {DIAS_SEMANA.map((d) => (
            <div key={d} className="px-2 py-2 text-center">
              {d}
            </div>
          ))}
        </div>
        {weeks.map((week, i) => (
          <div key={i} className="grid grid-cols-7">
            {week.map((date) => {
              const key = toDateKey(date);
              const isCurrentMonth = date.getMonth() + 1 === month;
              const daySessions = sessionsByDate.get(key) ?? [];

              return (
                <div
                  key={key}
                  className={`min-h-[110px] border-b border-r border-border p-1.5 last:border-r-0 ${
                    isCurrentMonth ? "" : "bg-background/60"
                  }`}
                >
                  <div
                    className={`mb-1 inline-flex h-6 w-6 items-center justify-center rounded-full text-xs ${
                      key === todayKey
                        ? "bg-primary font-semibold text-white"
                        : isCurrentMonth
                          ? "text-foreground/70"
                          : "text-foreground/30"
                    }`}
                  >
                    {date.getDate()}
                  </div>
                  <div className="flex flex-col gap-1">
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
                  </div>
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}

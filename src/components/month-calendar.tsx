import type { ReactNode } from "react";
import { buildMonthGrid, DIAS_SEMANA, toDateKey } from "@/lib/calendar-utils";

export function MonthCalendar({
  year,
  month,
  renderDay,
}: {
  year: number;
  month: number;
  renderDay: (date: Date, dateKey: string, isCurrentMonth: boolean) => ReactNode;
}) {
  const weeks = buildMonthGrid(year, month);
  const todayKey = toDateKey(new Date());

  return (
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
                <div className="flex flex-col gap-1">{renderDay(date, key, isCurrentMonth)}</div>
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}

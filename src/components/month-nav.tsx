import Link from "next/link";
import { MESES } from "@/lib/calendar-utils";

export function MonthNav({ year, month }: { year: number; month: number }) {
  const prevMonth = month === 1 ? { year: year - 1, month: 12 } : { year, month: month - 1 };
  const nextMonth = month === 12 ? { year: year + 1, month: 1 } : { year, month: month + 1 };

  return (
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
  );
}

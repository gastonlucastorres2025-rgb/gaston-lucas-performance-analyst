import Link from "next/link";
import { MonthCalendar } from "@/components/month-calendar";
import { MonthNav } from "@/components/month-nav";
import { PageHeader } from "@/components/page-header";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function PlanificacionPage({
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
  const { data: sesiones } = await supabase.from("sesiones").select("fecha, lugar");

  const sesionesByDate = new Map((sesiones ?? []).map((s) => [s.fecha, s]));

  return (
    <div>
      <PageHeader
        title="Planificación"
        description="Armá la sesión de cada día: contenido, disponibilidad de jugadores y equipos."
      />

      <MonthNav year={year} month={month} />

      <MonthCalendar
        year={year}
        month={month}
        renderDay={(_date, key) => {
          const sesion = sesionesByDate.get(key);
          return (
            <Link
              href={`/planificacion/${key}`}
              className={`flex items-center gap-1 truncate rounded px-1.5 py-0.5 text-[11px] font-medium transition-colors ${
                sesion
                  ? "bg-primary/10 text-primary hover:bg-primary/20"
                  : "text-foreground/40 hover:bg-primary/5 hover:text-primary"
              }`}
            >
              {sesion ? `📋 ${sesion.lugar || "Sesión"}` : "+ Planificar"}
            </Link>
          );
        }}
      />
    </div>
  );
}

import { notFound } from "next/navigation";
import { PageHeader } from "@/components/page-header";
import { parseDateKey } from "@/lib/calendar-utils";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function PartidoDetallePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: match } = await supabase.from("matches").select("*").eq("id", id).maybeSingle();

  if (!match) notFound();

  const fechaTexto = parseDateKey(match.fecha).toLocaleDateString("es-UY", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return (
    <div>
      <PageHeader title="Partido" description={fechaTexto} />

      <div className="rounded-lg border border-border bg-surface p-8">
        <div className="mb-6 flex items-center justify-center gap-8">
          <div className="flex flex-col items-center gap-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/escudo-nacional.png"
              alt="Nacional"
              width={80}
              height={80}
              className="h-20 w-20 object-contain"
            />
            <p className="text-sm font-semibold">Nacional</p>
          </div>
          <p className="text-2xl font-bold text-foreground/40">VS</p>
          <div className="flex flex-col items-center gap-2">
            {match.escudo_rival_url && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={match.escudo_rival_url}
                alt={match.rival ?? ""}
                width={80}
                height={80}
                className="h-20 w-20 object-contain"
              />
            )}
            <p className="text-sm font-semibold">{match.rival}</p>
          </div>
        </div>

        <div className="flex flex-wrap justify-center gap-2">
          {match.competencia && (
            <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
              {match.competencia}
            </span>
          )}
          {match.ronda && (
            <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
              {match.ronda}
            </span>
          )}
          {match.condicion && (
            <span className="rounded-full bg-accent/10 px-3 py-1 text-xs font-medium text-accent">
              {match.condicion === "local" ? "Local" : "Visitante"}
            </span>
          )}
        </div>

        {match.estadio && (
          <p className="mt-4 text-center text-sm text-foreground/60">📍 {match.estadio}</p>
        )}

        {(match.resultado_propio !== null || match.resultado_rival !== null) && (
          <p className="mt-4 text-center text-3xl font-bold">
            {match.resultado_propio ?? "-"} : {match.resultado_rival ?? "-"}
          </p>
        )}
      </div>
    </div>
  );
}

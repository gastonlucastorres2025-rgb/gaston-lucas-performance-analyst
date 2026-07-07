import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { parseDateKey } from "@/lib/calendar-utils";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function PartidosPage() {
  const supabase = await createClient();
  const { data: matches } = await supabase
    .from("matches")
    .select("*")
    .order("fecha", { ascending: true });

  const todayKey = new Date().toISOString().slice(0, 10);

  return (
    <div>
      <PageHeader
        title="Partidos"
        description="Calendario de partidos y eventos del mes."
      />

      <div className="flex flex-col gap-2">
        {(matches ?? []).map((match) => {
          const fechaTexto = parseDateKey(match.fecha).toLocaleDateString("es-UY", {
            weekday: "long",
            day: "numeric",
            month: "long",
          });
          const esProximo = match.fecha >= todayKey;

          if (match.tipo === "viaje") {
            return (
              <div
                key={match.id}
                className="flex items-center gap-3 rounded-lg border border-border bg-surface px-4 py-3"
              >
                <span className="text-2xl">🚢</span>
                <div>
                  <p className="text-sm font-medium capitalize">{fechaTexto}</p>
                  <p className="text-sm text-foreground/60">{match.notas}</p>
                </div>
              </div>
            );
          }

          return (
            <Link
              key={match.id}
              href={`/partidos/${match.id}`}
              className="flex items-center gap-4 rounded-lg border border-border bg-surface px-4 py-3 hover:bg-primary/5"
            >
              {match.escudo_rival_url && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={match.escudo_rival_url}
                  alt={match.rival ?? ""}
                  className="h-10 w-10 object-contain"
                />
              )}
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-medium">
                    {match.condicion === "local" ? "Nacional vs " : ""}
                    {match.rival}
                    {match.condicion === "visitante" ? " vs Nacional" : ""}
                  </p>
                  {esProximo && (
                    <span className="rounded-full bg-accent/10 px-2 py-0.5 text-xs font-medium text-accent">
                      Próximo
                    </span>
                  )}
                </div>
                <p className="text-sm text-foreground/60">
                  <span className="capitalize">{fechaTexto}</span>
                  {match.competencia ? ` · ${match.competencia}` : ""}
                  {match.ronda ? ` · ${match.ronda}` : ""}
                </p>
                <p className="text-xs text-foreground/50">
                  {match.estadio}
                  {match.condicion ? ` · ${match.condicion === "local" ? "Local" : "Visitante"}` : ""}
                </p>
              </div>
            </Link>
          );
        })}
        {(!matches || matches.length === 0) && (
          <p className="rounded-lg border border-dashed border-border p-8 text-center text-sm text-foreground/50">
            Todavía no hay partidos cargados.
          </p>
        )}
      </div>
    </div>
  );
}

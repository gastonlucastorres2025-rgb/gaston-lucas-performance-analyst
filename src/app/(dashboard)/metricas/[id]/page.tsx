import { notFound } from "next/navigation";
import { PageHeader } from "@/components/page-header";
import { StatCompareRow } from "@/components/stat-compare-row";
import { parseDateKey } from "@/lib/calendar-utils";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type StatGroup = { total?: number; ganados?: number; logrados?: number; a_puerta?: number; precisos?: number; con_remate?: number; pct?: number; pct_puerta?: number };

function group(row: Record<string, unknown> | null | undefined, key: string): StatGroup {
  return (row?.[key] as StatGroup) ?? {};
}

export default async function MetricaDetallePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: m } = await supabase.from("match_stats").select("*").eq("id", id).maybeSingle();

  if (!m) notFound();

  const nac = m.stats_nacional as Record<string, unknown>;
  const riv = m.stats_rival as Record<string, unknown>;

  const fechaTexto = parseDateKey(m.fecha).toLocaleDateString("es-UY", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return (
    <div>
      <PageHeader
        title={m.condicion === "local" ? `Nacional vs ${m.rival}` : `${m.rival} vs Nacional`}
        description={`${fechaTexto}${m.competencia ? ` · ${m.competencia}` : ""}`}
      />

      <div className="mb-6 flex items-center justify-center gap-10 rounded-lg border border-border bg-surface p-8">
        <div className="flex flex-col items-center gap-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/escudo-nacional.png" alt="Nacional" className="h-16 w-16 object-contain" />
          <p className="text-sm font-semibold">Nacional</p>
          <p className="text-xs text-foreground/50">{nac.formacion as string}</p>
        </div>
        <p className="font-mono text-4xl font-bold">
          {m.goles_favor} - {m.goles_contra}
        </p>
        <div className="flex flex-col items-center gap-2">
          {m.escudo_rival_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={m.escudo_rival_url} alt={m.rival} className="h-16 w-16 object-contain" />
          ) : (
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-accent/10 text-lg font-semibold text-accent">
              {m.rival.slice(0, 2).toUpperCase()}
            </div>
          )}
          <p className="text-sm font-semibold">{m.rival}</p>
          <p className="text-xs text-foreground/50">{riv.formacion as string}</p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <StatSection title="Resumen">
          <StatCompareRow label="xG" nacional={nac.xg as number} rival={riv.xg as number} />
          <StatCompareRow label="Posesión %" nacional={nac.posesion as number} rival={riv.posesion as number} suffix="%" />
          <StatCompareRow label="PPDA (presión)" nacional={nac.ppda as number} rival={riv.ppda as number} />
        </StatSection>

        <StatSection title="Ofensiva">
          <StatCompareRow label="Tiros" nacional={group(nac, "tiros").total} rival={group(riv, "tiros").total} />
          <StatCompareRow label="Tiros a puerta" nacional={group(nac, "tiros").a_puerta} rival={group(riv, "tiros").a_puerta} />
          <StatCompareRow label="Córners" nacional={group(nac, "corners").total} rival={group(riv, "corners").total} />
          <StatCompareRow label="Centros precisos" nacional={group(nac, "centros").precisos} rival={group(riv, "centros").precisos} />
          <StatCompareRow label="Duelos ofensivos ganados" nacional={group(nac, "duelos_ofensivos").ganados} rival={group(riv, "duelos_ofensivos").ganados} />
        </StatSection>

        <StatSection title="Pases">
          <StatCompareRow label="Pases totales" nacional={group(nac, "pases").total} rival={group(riv, "pases").total} />
          <StatCompareRow label="Pases logrados" nacional={group(nac, "pases").logrados} rival={group(riv, "pases").logrados} />
          <StatCompareRow label="Pases último tercio" nacional={group(nac, "pases_ultimo_tercio").logrados} rival={group(riv, "pases_ultimo_tercio").logrados} />
          <StatCompareRow label="Pases progresivos" nacional={group(nac, "pases_progresivos").precisos} rival={group(riv, "pases_progresivos").precisos} />
          <StatCompareRow label="Pases en profundidad" nacional={nac.pases_profundidad as number} rival={riv.pases_profundidad as number} />
        </StatSection>

        <StatSection title="Defensiva">
          <StatCompareRow label="Tiros en contra" nacional={group(nac, "tiros_en_contra").total} rival={group(riv, "tiros_en_contra").total} />
          <StatCompareRow label="Duelos defensivos ganados" nacional={group(nac, "duelos_defensivos").ganados} rival={group(riv, "duelos_defensivos").ganados} />
          <StatCompareRow label="Balones recuperados" nacional={group(nac, "balones_recuperados").total} rival={group(riv, "balones_recuperados").total} />
          <StatCompareRow label="Balones perdidos" nacional={group(nac, "balones_perdidos").total} rival={group(riv, "balones_perdidos").total} />
        </StatSection>

        <StatSection title="Disciplina">
          <StatCompareRow label="Faltas" nacional={nac.faltas as number} rival={riv.faltas as number} />
          <StatCompareRow label="Tarjetas amarillas" nacional={nac.amarillas as number} rival={riv.amarillas as number} />
          <StatCompareRow label="Tarjetas rojas" nacional={nac.rojas as number} rival={riv.rojas as number} />
        </StatSection>

        <StatSection title="Duelos">
          <StatCompareRow label="Duelos totales ganados" nacional={group(nac, "duelos").ganados} rival={group(riv, "duelos").ganados} />
          <StatCompareRow label="Jugadas a balón parado con remate" nacional={group(nac, "balon_parado").con_remate} rival={group(riv, "balon_parado").con_remate} />
        </StatSection>
      </div>
    </div>
  );
}

function StatSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-border bg-surface p-4">
      <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-foreground/50">
        {title}
      </h3>
      <div className="divide-y divide-border">{children}</div>
    </div>
  );
}

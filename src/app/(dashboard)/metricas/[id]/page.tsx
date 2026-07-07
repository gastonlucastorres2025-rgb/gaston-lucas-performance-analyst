import { notFound } from "next/navigation";
import { PageHeader } from "@/components/page-header";
import { StatCompareRow } from "@/components/stat-compare-row";
import { parseDateKey } from "@/lib/calendar-utils";
import {
  CONSTRUCCION_METRICS,
  DEFENSIVA_METRICS,
  OFENSIVA_METRICS,
  type MetricDef,
} from "@/lib/metricas-config";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const RESUMEN_METRICS: MetricDef[] = [
  { key: "xg", label: "xG", extract: (s) => (typeof s.xg === "number" ? s.xg : null) },
  {
    key: "posesion",
    label: "Posesión",
    suffix: "%",
    extract: (s) => (typeof s.posesion === "number" ? s.posesion : null),
  },
  {
    key: "ppda",
    label: "PPDA (presión)",
    invert: true,
    extract: (s) => (typeof s.ppda === "number" ? s.ppda : null),
  },
];

const OFENSIVA_DETALLE = OFENSIVA_METRICS.filter((m) => !["goles", "xg"].includes(m.key));
const DEFENSIVA_DETALLE = DEFENSIVA_METRICS.filter(
  (m) => !["goles_recibidos", "ppda"].includes(m.key),
);
const CONSTRUCCION_DETALLE = CONSTRUCCION_METRICS.filter((m) => m.key !== "posesion");

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
    <div className="mx-auto max-w-3xl">
      <PageHeader
        title={m.condicion === "local" ? `Nacional vs ${m.rival}` : `${m.rival} vs Nacional`}
        description={`${fechaTexto}${m.competencia ? ` · ${m.competencia}` : ""}`}
      />

      <div className="mb-6 flex items-center justify-center gap-4 rounded-lg border border-border bg-surface p-4">
        <div className="flex flex-col items-center gap-1">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/escudo-nacional.png" alt="Nacional" className="h-7 w-7 object-contain" />
          <p className="text-xs font-semibold">Nacional</p>
        </div>
        <p className="font-mono text-2xl font-bold">
          {m.goles_favor} - {m.goles_contra}
        </p>
        <div className="flex flex-col items-center gap-1">
          {m.escudo_rival_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={m.escudo_rival_url} alt={m.rival} className="h-7 w-7 object-contain" />
          ) : (
            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-accent/10 text-[10px] font-semibold text-accent">
              {m.rival.slice(0, 2).toUpperCase()}
            </div>
          )}
          <p className="text-xs font-semibold">{m.rival}</p>
        </div>
      </div>

      <div className="mb-5 flex items-center justify-center gap-4 text-xs text-foreground/60">
        <span className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-emerald-500" /> Mejor
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-amber-400" /> Similar
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-accent" /> Peor
        </span>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Quadrant icon="📋" title="Resumen">
          {RESUMEN_METRICS.map((metric) => (
            <StatCompareRow
              key={metric.key}
              label={metric.label}
              nacional={metric.extract(nac)}
              rival={metric.extract(riv)}
              suffix={metric.suffix}
              invert={metric.invert}
            />
          ))}
        </Quadrant>

        <Quadrant icon="⚔️" title="Ofensiva">
          {OFENSIVA_DETALLE.map((metric) => (
            <StatCompareRow
              key={metric.key}
              label={metric.label}
              nacional={metric.extract(nac)}
              rival={metric.extract(riv)}
              suffix={metric.suffix}
              invert={metric.invert}
            />
          ))}
        </Quadrant>

        <Quadrant icon="🛡️" title="Defensiva">
          {DEFENSIVA_DETALLE.map((metric) => (
            <StatCompareRow
              key={metric.key}
              label={metric.label}
              nacional={metric.extract(nac)}
              rival={metric.extract(riv)}
              suffix={metric.suffix}
              invert={metric.invert}
            />
          ))}
        </Quadrant>

        <Quadrant icon="🎯" title="Construcción">
          {CONSTRUCCION_DETALLE.map((metric) => (
            <StatCompareRow
              key={metric.key}
              label={metric.label}
              nacional={metric.extract(nac)}
              rival={metric.extract(riv)}
              suffix={metric.suffix}
              invert={metric.invert}
            />
          ))}
        </Quadrant>
      </div>
    </div>
  );
}

function Quadrant({
  icon,
  title,
  children,
}: {
  icon: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-border bg-surface p-4 shadow-sm">
      <h3 className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-foreground/50">
        <span>{icon}</span>
        {title}
      </h3>
      <div className="divide-y divide-border">{children}</div>
    </div>
  );
}

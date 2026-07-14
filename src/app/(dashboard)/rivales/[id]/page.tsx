import { notFound } from "next/navigation";
import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { InformeRivalPdfButton } from "@/components/rivales/informe-rival-pdf-button";
import { EVALUACION_LABEL, type Evaluacion } from "@/lib/informes-post-partido-types";
import { parseDateKey } from "@/lib/calendar-utils";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function RivalDetallePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: rival } = await supabase.from("rivales").select("id, nombre, escudo_url").eq("id", id).maybeSingle();
  if (!rival) notFound();

  const [{ data: planes }, { data: partidos }, { data: carpetas }, { data: informes }] = await Promise.all([
    supabase
      .from("analisis_rival")
      .select("id, fecha, cancha, tipo_partido, estructura_base, fase_ofensiva, transiciones_ofensivas, transiciones_defensivas, presion_zona3, zona21, patrones, abp_ofensivas, abp_defensivas, claves")
      .eq("rival_id", id)
      .order("fecha", { ascending: false }),
    supabase
      .from("partidos_va")
      .select("id, fecha, condicion, goles_favor, goles_contra, competencia, youtube_video_id")
      .eq("rival_id", id)
      .order("fecha", { ascending: false }),
    supabase
      .from("fases_rival")
      .select("id, ronda, competencia, fases")
      .eq("rival_id", id)
      .order("created_at", { ascending: false }),
    supabase
      .from("informes_post_partido")
      .select("id, fecha, resultado, plan_funciono, plan_comentario, analisis_acertado, analisis_comentario, conclusiones_generales")
      .eq("rival_id", id)
      .order("fecha", { ascending: false }),
  ]);

  return (
    <div>
      <div className="mb-4">
        <Link href="/rivales" className="text-xs text-foreground/50 hover:text-primary">
          ← Volver a Rivales
        </Link>
      </div>

      <div className="mb-6 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          {rival.escudo_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={rival.escudo_url}
              alt=""
              width={44}
              height={44}
              className="shrink-0 rounded-full border border-border bg-white object-contain"
            />
          ) : (
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-background text-lg font-semibold text-foreground/40">
              {rival.nombre.charAt(0).toUpperCase()}
            </span>
          )}
          <PageHeader title={rival.nombre} />
        </div>
        <InformeRivalPdfButton
          rival={{ nombre: rival.nombre, escudoUrl: rival.escudo_url }}
          planes={planes ?? []}
          partidos={partidos ?? []}
          carpetas={carpetas ?? []}
          informes={informes ?? []}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-xl border border-border bg-surface">
          <div className="rounded-t-xl bg-primary px-4 py-2.5">
            <h2 className="text-sm font-semibold text-white">Plan de partido</h2>
          </div>
          <div className="flex flex-col gap-2 p-4">
            {planes && planes.length > 0 ? (
              planes.map((p) => (
                <Link
                  key={p.id}
                  href={`/analisis-rival/${p.id}`}
                  className="rounded-md border border-border px-3 py-2 text-sm transition-colors hover:bg-primary/5"
                >
                  <p className="font-medium">{rival.nombre}</p>
                  <p className="text-xs text-foreground/50">
                    {[p.tipo_partido, p.fecha, p.cancha].filter(Boolean).join(" · ") || "Sin datos"}
                  </p>
                </Link>
              ))
            ) : (
              <p className="text-xs text-foreground/40">Sin planes cargados.</p>
            )}
          </div>
        </div>

        <div className="rounded-xl border border-border bg-surface">
          <div className="rounded-t-xl px-4 py-2.5" style={{ backgroundColor: "#0f6e56" }}>
            <h2 className="text-sm font-semibold text-white">Videoanálisis</h2>
          </div>
          <div className="flex flex-col gap-2 p-4">
            {partidos && partidos.length > 0 ? (
              partidos.map((p) => {
                const fechaTexto = parseDateKey(p.fecha).toLocaleDateString("es-UY", {
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                });
                const tieneResultado = p.goles_favor != null && p.goles_contra != null;
                return (
                  <Link
                    key={p.id}
                    href={`/videoanalisis/${p.id}`}
                    className="flex items-center justify-between gap-2 rounded-md border border-border px-3 py-2 text-sm transition-colors hover:bg-primary/5"
                  >
                    <div>
                      <p className="font-medium">
                        {p.condicion === "visitante" ? `${rival.nombre} vs Nacional` : `Nacional vs ${rival.nombre}`}
                      </p>
                      <p className="text-xs text-foreground/50">
                        {fechaTexto}
                        {p.competencia ? ` · ${p.competencia}` : ""}
                      </p>
                    </div>
                    {tieneResultado && (
                      <span className="shrink-0 rounded bg-background px-2 py-0.5 font-mono text-xs font-semibold">
                        {p.goles_favor}-{p.goles_contra}
                      </span>
                    )}
                  </Link>
                );
              })
            ) : (
              <p className="text-xs text-foreground/40">Sin partidos analizados.</p>
            )}
          </div>
        </div>

        <div className="rounded-xl border border-border bg-surface">
          <div className="rounded-t-xl px-4 py-2.5" style={{ backgroundColor: "#b45309" }}>
            <h2 className="text-sm font-semibold text-white">Fases del rival</h2>
          </div>
          <div className="flex flex-col gap-2 p-4">
            {carpetas && carpetas.length > 0 ? (
              carpetas.map((c) => (
                <Link
                  key={c.id}
                  href={`/fases-rival/${c.id}`}
                  className="rounded-md border border-border px-3 py-2 text-sm transition-colors hover:bg-primary/5"
                >
                  <p className="font-medium">{[rival.nombre, c.ronda].filter(Boolean).join(" - ")}</p>
                  <p className="text-xs text-foreground/50">
                    {(c.fases as unknown[])?.length ?? 0} videos por fase
                    {c.competencia ? ` · ${c.competencia}` : ""}
                  </p>
                </Link>
              ))
            ) : (
              <p className="text-xs text-foreground/40">Sin carpetas conectadas.</p>
            )}
          </div>
        </div>

        <div className="rounded-xl border border-border bg-surface">
          <div className="rounded-t-xl bg-accent px-4 py-2.5">
            <h2 className="text-sm font-semibold text-white">Informe post partido</h2>
          </div>
          <div className="flex flex-col gap-2 p-4">
            {informes && informes.length > 0 ? (
              informes.map((i) => (
                <Link
                  key={i.id}
                  href={`/informes-post-partido/${i.id}`}
                  className="rounded-md border border-border px-3 py-2 text-sm transition-colors hover:bg-primary/5"
                >
                  <p className="font-medium">{[i.fecha, i.resultado].filter(Boolean).join(" · ") || "Sin datos"}</p>
                  {i.plan_funciono && (
                    <p className="text-xs text-foreground/50">
                      Plan: {EVALUACION_LABEL[i.plan_funciono as Evaluacion]}
                    </p>
                  )}
                </Link>
              ))
            ) : (
              <p className="text-xs text-foreground/40">Sin informes cargados.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

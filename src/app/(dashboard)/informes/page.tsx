import Link from "next/link";
import { InformeUploader } from "@/components/informe-uploader";
import { PageHeader } from "@/components/page-header";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const TABS = [
  { tipo: "informe_rival" as const, label: "Informe de Rival" },
  { tipo: "plan_partido" as const, label: "Plan de Partido" },
];

export default async function InformesPage({
  searchParams,
}: {
  searchParams: Promise<{ tipo?: string }>;
}) {
  const { tipo: tipoParam } = await searchParams;
  const tipo = tipoParam === "plan_partido" ? "plan_partido" : "informe_rival";

  const supabase = await createClient();
  const { data: informes } = await supabase
    .from("informes")
    .select("id, titulo, rival, fecha, tamano_bytes, created_at")
    .eq("tipo", tipo)
    .order("fecha", { ascending: false, nullsFirst: false });

  return (
    <div>
      <PageHeader
        title="Informes"
        description="Informes de rival, planes de partido y (pronto) reportes post-partido."
      />

      <div className="mb-6 flex gap-1 border-b border-border">
        {TABS.map((tab) => (
          <Link
            key={tab.tipo}
            href={`?tipo=${tab.tipo}`}
            className={`-mb-px border-b-2 px-4 py-2 text-sm font-medium transition-colors ${
              tipo === tab.tipo
                ? "border-primary text-primary"
                : "border-transparent text-foreground/60 hover:text-foreground"
            }`}
          >
            {tab.label}
          </Link>
        ))}
      </div>

      <InformeUploader tipo={tipo} />

      <div className="flex flex-col gap-2">
        {(informes ?? []).map((informe) => (
          <Link
            key={informe.id}
            href={`/informes/${informe.id}`}
            className="flex items-center justify-between rounded-lg border border-border bg-surface px-4 py-3 hover:bg-primary/5"
          >
            <div>
              <p className="font-medium">{informe.titulo}</p>
              <p className="text-sm text-foreground/60">
                {informe.rival ? `${informe.rival} · ` : ""}
                {informe.fecha
                  ? new Date(`${informe.fecha}T00:00:00`).toLocaleDateString("es-UY", {
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                    })
                  : "Sin fecha"}
              </p>
            </div>
            {informe.tamano_bytes && (
              <span className="text-xs text-foreground/40">
                {(informe.tamano_bytes / 1024 / 1024).toFixed(1)} MB
              </span>
            )}
          </Link>
        ))}
        {(!informes || informes.length === 0) && (
          <p className="rounded-lg border border-dashed border-border p-8 text-center text-sm text-foreground/50">
            Todavía no hay informes de este tipo.
          </p>
        )}
      </div>
    </div>
  );
}

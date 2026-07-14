import { notFound } from "next/navigation";
import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { FasesRivalAcciones } from "@/components/fases-rival/fases-rival-acciones";
import { FasesRivalPdfButton } from "@/components/fases-rival/fases-rival-pdf-button";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function FasesRivalDetallePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: fila } = await supabase.from("fases_rival").select("*").eq("id", id).maybeSingle();

  if (!fila) notFound();

  const fases: { nombre: string; link: string }[] = fila.fases ?? [];

  return (
    <div>
      <div className="mb-4">
        <Link href="/fases-rival" className="text-xs text-foreground/50 hover:text-primary">
          ← Volver a Fases del Rival
        </Link>
      </div>

      <div className="mb-6 flex items-start justify-between gap-4">
        <PageHeader
          title={fila.rival || "Rival sin nombre"}
          description={[fila.competencia, fila.ronda].filter(Boolean).join(" · ") || "Sin datos"}
        />
        <FasesRivalAcciones id={id} />
      </div>

      <div className="mb-4">
        <FasesRivalPdfButton data={{ rival: fila.rival, ronda: fila.ronda, competencia: fila.competencia, fases }} />
      </div>

      {fases.length === 0 ? (
        <p className="py-10 text-center text-sm text-foreground/50">Esta carpeta no tiene videos.</p>
      ) : (
        <div className="flex flex-col gap-2">
          {fases.map((f, i) => (
            <a
              key={i}
              href={f.link}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-3 rounded-lg border border-border bg-surface px-4 py-3 transition-colors hover:bg-primary/5"
            >
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-semibold text-white">
                {i + 1}
              </span>
              <span className="min-w-0 flex-1 truncate font-medium">{f.nombre}</span>
              <span className="shrink-0 text-xs text-primary">Ver video ↗</span>
            </a>
          ))}
        </div>
      )}
    </div>
  );
}

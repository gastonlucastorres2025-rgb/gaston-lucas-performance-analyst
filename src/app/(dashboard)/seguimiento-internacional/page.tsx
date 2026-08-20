import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

function Metrica({ valor, etiqueta }: { valor: number; etiqueta: string }) {
  return (
    <div className="rounded-xl border border-border bg-surface p-4">
      <div className="text-2xl font-semibold text-foreground">{valor}</div>
      <div className="text-xs text-foreground/50">{etiqueta}</div>
    </div>
  );
}

export default async function SeguimientoInternacionalPage() {
  const supabase = await createClient();

  const [{ count: jugadores }, { count: observaciones }, { count: pendientesRevision }, { data: clubes }, { data: recientes }] =
    await Promise.all([
      supabase.from("si_jugadores").select("*", { count: "exact", head: true }),
      supabase.from("si_observaciones").select("*", { count: "exact", head: true }),
      supabase.from("si_revisiones").select("*", { count: "exact", head: true }).eq("estado", "pendiente"),
      supabase.from("si_jugadores").select("current_club"),
      supabase
        .from("si_jugadores")
        .select("id, full_name, current_club, primary_position, created_at")
        .order("created_at", { ascending: false })
        .limit(8),
    ]);

  const clubesUnicos = new Set((clubes ?? []).map((c) => c.current_club).filter(Boolean));

  return (
    <div>
      <PageHeader
        title="Seguimiento Internacional"
        description="Perfiles consolidados de jugadores rivales analizados, importados desde Google Drive."
      />

      <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Metrica valor={jugadores ?? 0} etiqueta="Jugadores" />
        <Metrica valor={clubesUnicos.size} etiqueta="Clubes" />
        <Metrica valor={observaciones ?? 0} etiqueta="Análisis registrados" />
        <Metrica valor={pendientesRevision ?? 0} etiqueta="Pendientes de revisión" />
      </div>

      <div className="mb-6 flex gap-3">
        <Link
          href="/seguimiento-internacional/jugadores"
          className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90"
        >
          Ver todos los jugadores
        </Link>
        <Link
          href="/seguimiento-internacional/carpetas"
          className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-primary/5"
        >
          Ver carpetas
        </Link>
      </div>

      <div className="rounded-xl border border-border bg-surface p-5">
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-foreground/50">
          Incorporados recientemente
        </h2>
        {recientes && recientes.length > 0 ? (
          <div className="flex flex-col divide-y divide-border">
            {recientes.map((j) => (
              <Link
                key={j.id}
                href={`/seguimiento-internacional/jugadores/${j.id}`}
                className="flex items-center justify-between py-2.5 text-sm hover:text-primary"
              >
                <span className="font-medium">{j.full_name}</span>
                <span className="text-foreground/50">
                  {j.current_club ?? "s/d"} · {j.primary_position ?? "s/d"}
                </span>
              </Link>
            ))}
          </div>
        ) : (
          <p className="text-sm text-foreground/50">Todavía no hay jugadores importados.</p>
        )}
      </div>
    </div>
  );
}

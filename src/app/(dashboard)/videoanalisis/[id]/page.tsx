import { notFound } from "next/navigation";
import { VisorPartido } from "@/components/videoanalisis/visor-partido";
import { PlacaPartido } from "@/components/videoanalisis/placa-partido";
import { equiposPlaca } from "@/lib/videoanalisis/placa-helpers";
import { parseDateKey } from "@/lib/calendar-utils";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function PartidoVADetallePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const [{ data: partido }, { data: categorias }, { data: acciones }] = await Promise.all([
    supabase.from("partidos_va").select("*").eq("id", id).maybeSingle(),
    supabase.from("va_categorias").select("codigo, color_hex").eq("partido_id", id).order("codigo"),
    supabase
      .from("va_acciones")
      .select("id, codigo, inicio_seg, fin_seg")
      .eq("partido_id", id)
      .order("inicio_seg", { ascending: true }),
  ]);

  if (!partido) notFound();

  let logoCompetencia: string | null = null;
  if (partido.competencia) {
    const { data: logo } = await supabase
      .from("va_competencia_logos")
      .select("logo_url")
      .eq("nombre", partido.competencia)
      .maybeSingle();
    logoCompetencia = logo?.logo_url ?? null;
  }

  const fechaTexto = parseDateKey(partido.fecha).toLocaleDateString("es-UY", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  const { local, visitante } = equiposPlaca(partido);

  return (
    <div>
      <div className="mb-6 flex flex-col items-center gap-3 rounded-xl border border-border bg-surface p-5 shadow-sm">
        <PlacaPartido
          local={local}
          visitante={visitante}
          competencia={partido.competencia ? { nombre: partido.competencia, logoUrl: logoCompetencia } : null}
          size="lg"
        />
        <p className="text-xs text-foreground/50">{fechaTexto}</p>
      </div>

      <VisorPartido
        youtubeVideoId={partido.youtube_video_id}
        offsetSegundos={partido.offset_segundos ?? 0}
        categorias={categorias ?? []}
        acciones={acciones ?? []}
      />
    </div>
  );
}

import { notFound } from "next/navigation";
import { PageHeader } from "@/components/page-header";
import { VisorPartido } from "@/components/videoanalisis/visor-partido";
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

  const fechaTexto = parseDateKey(partido.fecha).toLocaleDateString("es-UY", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return (
    <div>
      <PageHeader
        title={partido.condicion === "visitante" ? `${partido.rival} vs Nacional` : `Nacional vs ${partido.rival}`}
        description={`${fechaTexto}${partido.competencia ? ` · ${partido.competencia}` : ""}`}
      />

      <VisorPartido
        youtubeVideoId={partido.youtube_video_id}
        offsetSegundos={partido.offset_segundos ?? 0}
        categorias={categorias ?? []}
        acciones={acciones ?? []}
      />
    </div>
  );
}

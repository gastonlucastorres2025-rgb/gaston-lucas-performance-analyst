import { notFound } from "next/navigation";
import { PlaylistDetalle, type ItemPlaylist } from "@/components/videoanalisis/playlist-detalle";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type FilaItem = {
  id: string;
  orden: number;
  accion: {
    id: string;
    codigo: string;
    inicio_seg: number;
    fin_seg: number;
    partido_id: string;
    partidos_va: {
      rival: string;
      fecha: string;
      competencia: string | null;
      youtube_video_id: string;
      offset_segundos: number;
    } | null;
  } | null;
};

export default async function PlaylistDetallePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: playlist } = await supabase.from("va_playlists").select("id, nombre").eq("id", id).maybeSingle();
  if (!playlist) notFound();

  const { data: itemsRaw } = await supabase
    .from("va_playlist_items")
    .select(
      "id, orden, accion:va_acciones(id, codigo, inicio_seg, fin_seg, partido_id, partidos_va(rival, fecha, competencia, youtube_video_id, offset_segundos))",
    )
    .eq("playlist_id", id)
    .order("orden", { ascending: true });
  const items = (itemsRaw ?? []) as unknown as FilaItem[];

  const partidoIds = [...new Set(items.map((it) => it.accion?.partido_id).filter((x): x is string => Boolean(x)))];
  const { data: categorias } = partidoIds.length
    ? await supabase.from("va_categorias").select("partido_id, codigo, color_hex").in("partido_id", partidoIds)
    : { data: [] as { partido_id: string; codigo: string; color_hex: string | null }[] };
  const colorPorClave = new Map((categorias ?? []).map((c) => [`${c.partido_id}::${c.codigo}`, c.color_hex]));

  const itemsResueltos: ItemPlaylist[] = items
    .filter((it): it is FilaItem & { accion: NonNullable<FilaItem["accion"]> } => Boolean(it.accion?.partidos_va))
    .map((it) => ({
      itemId: it.id,
      accionId: it.accion.id,
      codigo: it.accion.codigo,
      inicioSeg: it.accion.inicio_seg,
      finSeg: it.accion.fin_seg,
      colorHex: colorPorClave.get(`${it.accion.partido_id}::${it.accion.codigo}`) ?? null,
      partido: {
        rival: it.accion.partidos_va!.rival,
        fecha: it.accion.partidos_va!.fecha,
        competencia: it.accion.partidos_va!.competencia,
        youtubeVideoId: it.accion.partidos_va!.youtube_video_id,
        offsetSegundos: it.accion.partidos_va!.offset_segundos,
      },
    }));

  return <PlaylistDetalle playlistId={playlist.id} nombreInicial={playlist.nombre} itemsIniciales={itemsResueltos} />;
}

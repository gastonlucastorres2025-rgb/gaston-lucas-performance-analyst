"use server";

import { encontrarCategoriasCoincidentes, extraerDuracionSegundos, extraerFranjaMinutos } from "@/lib/videoanalisis/buscar-clips";
import { createClient } from "@/lib/supabase/server";

export type ClipEncontrado = {
  id: string;
  codigo: string;
  inicioSeg: number;
  finSeg: number;
  colorHex: string | null;
  partido: {
    id: string;
    rival: string;
    fecha: string;
    competencia: string | null;
    youtubeVideoId: string;
    offsetSegundos: number;
  };
};

export type ResultadoBusquedaClips = {
  error: string | null;
  categoriasCoincidentes: string[];
  duracionSegundos: number | null;
  desdeMin: number | null;
  hastaMin: number | null;
  clips: ClipEncontrado[];
};

export async function buscarClips(consulta: string): Promise<ResultadoBusquedaClips> {
  const vacio = { categoriasCoincidentes: [], duracionSegundos: null, desdeMin: null, hastaMin: null, clips: [] };
  if (!consulta.trim()) return { error: "Escribí qué querés buscar.", ...vacio };

  const supabase = await createClient();

  const { data: categoriasRows } = await supabase.from("va_categorias").select("codigo");
  const categoriasDisponibles = [...new Set((categoriasRows ?? []).map((c) => c.codigo))].sort();

  const categoriasCoincidentes = encontrarCategoriasCoincidentes(consulta, categoriasDisponibles);
  const duracionSegundos = extraerDuracionSegundos(consulta);
  const { desdeMin, hastaMin } = extraerFranjaMinutos(consulta);

  if (categoriasCoincidentes.length === 0) {
    return {
      error:
        categoriasDisponibles.length > 0
          ? `No encontré esa categoría. Categorías disponibles: ${categoriasDisponibles.join(", ")}.`
          : "Todavía no hay categorías tageadas en ningún partido de Videoanálisis.",
      ...vacio,
    };
  }

  const { data: colores } = await supabase
    .from("va_categorias")
    .select("codigo, color_hex")
    .in("codigo", categoriasCoincidentes);
  const colorPorCodigo = new Map((colores ?? []).map((c) => [c.codigo, c.color_hex]));

  const { data: acciones, error } = await supabase
    .from("va_acciones")
    .select(
      "id, codigo, inicio_seg, fin_seg, partidos_va(id, rival, fecha, competencia, youtube_video_id, offset_segundos)",
    )
    .in("codigo", categoriasCoincidentes);

  if (error) {
    return { error: `No se pudieron buscar los clips: ${error.message}`, ...vacio };
  }

  type FilaAccion = {
    id: string;
    codigo: string;
    inicio_seg: number;
    fin_seg: number;
    partidos_va: {
      id: string;
      rival: string;
      fecha: string;
      competencia: string | null;
      youtube_video_id: string;
      offset_segundos: number;
    } | null;
  };

  const clips: ClipEncontrado[] = ((acciones ?? []) as unknown as FilaAccion[])
    .filter((a) => a.partidos_va)
    .filter((a) => desdeMin === null || a.inicio_seg >= desdeMin * 60)
    .filter((a) => hastaMin === null || a.inicio_seg <= hastaMin * 60)
    .map((a) => ({
      id: a.id,
      codigo: a.codigo,
      inicioSeg: a.inicio_seg,
      finSeg: a.fin_seg,
      colorHex: colorPorCodigo.get(a.codigo) ?? null,
      partido: {
        id: a.partidos_va!.id,
        rival: a.partidos_va!.rival,
        fecha: a.partidos_va!.fecha,
        competencia: a.partidos_va!.competencia,
        youtubeVideoId: a.partidos_va!.youtube_video_id,
        offsetSegundos: a.partidos_va!.offset_segundos ?? 0,
      },
    }))
    .sort((a, b) => a.partido.fecha.localeCompare(b.partido.fecha) || a.inicioSeg - b.inicioSeg);

  return { error: null, categoriasCoincidentes, duracionSegundos, desdeMin, hastaMin, clips };
}

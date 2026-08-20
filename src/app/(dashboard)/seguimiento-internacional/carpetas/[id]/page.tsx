import { notFound } from "next/navigation";
import { CarpetaDetalle, type JugadorDeCarpeta } from "@/components/seguimiento-internacional/carpeta-detalle";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function CarpetaSeguimientoDetallePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: carpeta } = await supabase.from("si_carpetas").select("id, nombre").eq("id", id).maybeSingle();
  if (!carpeta) notFound();

  const { data: jugadoresRaw } = await supabase
    .from("si_carpeta_jugadores")
    .select("id, nombre_jugador, notas, video_links, orden")
    .eq("carpeta_id", id)
    .order("orden", { ascending: true });

  const jugadores: JugadorDeCarpeta[] = (jugadoresRaw ?? []).map((j) => ({
    id: j.id,
    nombre: j.nombre_jugador,
    notas: j.notas,
    videoLinks: j.video_links ?? [],
  }));

  return <CarpetaDetalle carpetaId={carpeta.id} nombreInicial={carpeta.nombre} jugadoresIniciales={jugadores} />;
}

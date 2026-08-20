import { notFound } from "next/navigation";
import { InformePostPartidoEditor } from "@/components/informes-post-partido/informe-post-partido-editor";
import { informePostPartidoVacio, type InformePostPartidoData } from "@/lib/informes-post-partido-types";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function InformePostPartidoDetallePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: fila } = await supabase.from("informes_post_partido").select("*").eq("id", id).maybeSingle();

  if (!fila) notFound();

  const vacio = informePostPartidoVacio();
  const informe: InformePostPartidoData = {
    rival: fila.rival,
    fecha: fila.fecha,
    resultado: fila.resultado,
    competencia: fila.competencia,
    fases: { ...vacio.fases, ...(fila.fases ?? {}) },
    otras_observaciones: fila.otras_observaciones ?? "",
  };

  return <InformePostPartidoEditor id={id} informeInicial={informe} />;
}

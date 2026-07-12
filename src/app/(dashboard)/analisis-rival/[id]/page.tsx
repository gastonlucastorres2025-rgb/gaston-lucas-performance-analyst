import { notFound } from "next/navigation";
import { AnalisisRivalEditor } from "@/components/analisis-rival/analisis-rival-editor";
import type { AnalisisRivalData } from "@/lib/analisis-rival-types";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function AnalisisRivalDetallePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: fila } = await supabase.from("analisis_rival").select("*").eq("id", id).maybeSingle();

  if (!fila) notFound();

  const plan: AnalisisRivalData = {
    rival: fila.rival,
    fecha: fila.fecha,
    cancha: fila.cancha,
    tipo_partido: fila.tipo_partido,
    analista: fila.analista,
    partidos_analizados: fila.partidos_analizados,
    fuentes_globales: fila.fuentes_globales,
    estructura_base: fila.estructura_base,
    fase_ofensiva: fila.fase_ofensiva,
    transiciones_ofensivas: fila.transiciones_ofensivas,
    transiciones_defensivas: fila.transiciones_defensivas,
    presion_zona3: fila.presion_zona3,
    zona21: fila.zona21,
    patrones: fila.patrones,
    abp_ofensivas: fila.abp_ofensivas,
    abp_defensivas: fila.abp_defensivas,
    claves: fila.claves,
  };

  return <AnalisisRivalEditor id={id} planInicial={plan} />;
}

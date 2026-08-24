"use server";

import { listarRegistrosEnRango } from "@/lib/gps-data";
import { createClient } from "@/lib/supabase/server";

export type BloqueParaPdf = { fecha: string; turno: string | null; registros: Awaited<ReturnType<typeof listarRegistrosEnRango>>[number]["registros"] };

/** Trae los datos de GPS de un rango de fechas para armar el PDF (un día, una semana/microciclo, o
 * cualquier rango) — usado desde el botón de exportar, que corre en el cliente. */
export async function obtenerBloquesGpsParaPdf(desde: string, hasta: string): Promise<BloqueParaPdf[]> {
  const supabase = await createClient();
  const bloques = await listarRegistrosEnRango(supabase, desde, hasta);
  return bloques.map(({ sesion, registros }) => ({ fecha: sesion.fecha, turno: sesion.turno, registros }));
}

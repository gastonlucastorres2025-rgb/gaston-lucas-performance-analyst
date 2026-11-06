import { GraficoBarrasJugadores } from "@/components/gps/grafico-barras-jugadores";
import { SinDatos, Tarjeta, formatearFecha } from "@/components/gps/piezas";
import { ETIQUETA_BARRAS, VARIABLES_BARRAS, instantaneaDia } from "@/lib/gps/calculos";
import { cargarCargaDiaria, listarFechasPartidos, listarPlantel } from "@/lib/gps/datos";
import { obtenerClubActivo } from "@/lib/gps/club";
import { calcularMdRelativo } from "@/lib/gps/md";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function GpsSemanaPage() {
  const supabase = await createClient();
  const club = await obtenerClubActivo(supabase);
  const carga = await cargarCargaDiaria(supabase, club);

  let ultimaFecha: string | null = null;
  for (const dias of carga.values()) for (const fecha of dias.keys()) if (!ultimaFecha || fecha > ultimaFecha) ultimaFecha = fecha;
  if (!ultimaFecha) return <SinDatos />;

  const [plantel, fechasPartidos] = await Promise.all([listarPlantel(supabase, carga, club), listarFechasPartidos(supabase)]);
  const nombres = plantel.filter((j) => j.activo && carga.has(j.nombre)).map((j) => j.nombre);
  const md = calcularMdRelativo(ultimaFecha, fechasPartidos);

  return (
    <Tarjeta
      titulo={`Último día de carga GPS — ${formatearFecha(ultimaFecha)}${md ? ` (${md})` : ""}`}
      nota="Se actualiza solo con el último día cargado. Una columna por jugador, de mayor a menor, con el promedio del plantel."
    >
      <div className="space-y-8">
        {VARIABLES_BARRAS.map((v) => (
          <section key={v}>
            <h3 className="mb-2 text-sm font-semibold text-foreground/60">{ETIQUETA_BARRAS[v].titulo}</h3>
            <GraficoBarrasJugadores filas={instantaneaDia(carga, nombres, ultimaFecha, v)} unidad={ETIQUETA_BARRAS[v].unidad} />
          </section>
        ))}
      </div>
    </Tarjeta>
  );
}

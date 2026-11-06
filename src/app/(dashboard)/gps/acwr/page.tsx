import { Insignia, InsigniaAcwr, InsigniaLesion, InsigniaVmax, SinDatos, Tarjeta, formatearFecha } from "@/components/gps/piezas";
import { COLOR_POSICION, ETIQUETAS_VARIABLE, ETIQUETA_POSICION, POSICIONES, VARIABLES_ACWR, type Posicion } from "@/lib/gps/calculos";
import { obtenerClubActivo } from "@/lib/gps/club";
import { cargarPanel } from "@/lib/gps/panel";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const ORDEN_POSICIONES: Posicion[] = [...POSICIONES, "N/D"];

export default async function GpsAcwrPage() {
  const supabase = await createClient();
  const club = await obtenerClubActivo(supabase);
  const panel = await cargarPanel(supabase, club);

  if (!panel.ultimaFecha) return <SinDatos />;

  return (
    <Tarjeta
      titulo="Ratio ACWR (EWMA agudo:crónico) — plantel completo, formato semáforo"
      nota={`Estado más reciente de cada jugador a la fecha ${formatearFecha(panel.hoy)}.`}
    >
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs text-foreground/60">
              <th className="py-2 pr-4 font-medium">Jugador</th>
              {VARIABLES_ACWR.map((v) => (
                <th key={v} className="px-3 py-2 text-center font-medium">
                  {ETIQUETAS_VARIABLE[v]}
                </th>
              ))}
              <th className="px-3 py-2 text-center font-medium">Días sin 90% VMAX</th>
              <th className="px-3 py-2 text-center font-medium">Lesión</th>
            </tr>
          </thead>
          <tbody>
            {ORDEN_POSICIONES.map((pos) => {
              const filas = panel.filas.filter((f) => f.posicion === pos);
              if (filas.length === 0) return null;
              return [
                <tr key={`h-${pos}`}>
                  <td colSpan={VARIABLES_ACWR.length + 3} className="bg-background px-2 py-1.5 text-xs font-semibold" style={{ color: COLOR_POSICION[pos] }}>
                    {ETIQUETA_POSICION[pos]}
                    {pos !== "N/D" && ` (${pos})`}
                  </td>
                </tr>,
                ...filas.map((f) => (
                  <tr key={f.nombre} className="border-b border-border/60">
                    <td className="py-2 pr-4 font-medium">{f.nombre}</td>
                    {VARIABLES_ACWR.map((v) => (
                      <td key={v} className="px-3 py-2 text-center">
                        <InsigniaAcwr valor={f.acwr[v]} />
                      </td>
                    ))}
                    <td className="px-3 py-2 text-center">
                      <InsigniaVmax estado={f.vmax} />
                    </td>
                    <td className="px-3 py-2 text-center">
                      <InsigniaLesion lesion={f.lesion} />
                    </td>
                  </tr>
                )),
              ];
            })}
          </tbody>
        </table>
      </div>

      <div className="mt-4 flex flex-wrap gap-x-4 gap-y-1 text-xs text-foreground/70">
        <span className="flex items-center gap-1.5"><Insignia color="azul">&lt;0.8</Insignia> carga baja</span>
        <span className="flex items-center gap-1.5"><Insignia color="verde">0.8–1.3</Insignia> zona objetivo</span>
        <span className="flex items-center gap-1.5"><Insignia color="amarillo">1.3–1.5</Insignia> precaución</span>
        <span className="flex items-center gap-1.5"><Insignia color="rojo">&gt;1.5</Insignia> riesgo alto</span>
        <span className="flex items-center gap-1.5"><Insignia color="gris">—</Insignia> sin datos suficientes</span>
      </div>
      <p className="mt-3 text-xs text-foreground/60">
        EWMA agudo (λ 7 días) / EWMA crónico (λ 28 días), Williams et al. (2016, Br J Sports Med). Bandas de Gabbett (2016) y Hulin et al.
        (2016, Br J Sports Med). Los días sin sesión cuentan como carga cero.
      </p>
      <p className="mt-2 text-xs text-foreground/60">
        “Días sin 90% VMAX” = hace cuántos días el jugador no llega al 90% de su velocidad máxima de referencia (el pico más alto de su
        historial cargado, no el techo real de su carrera). Verde: menos de 7 días · amarillo: 7–13 · rojo: 14 o más. Pasá el mouse sobre el
        número para ver el detalle. “Lesión” es el estado vigente en la pestaña Lesiones / molestias.
      </p>
    </Tarjeta>
  );
}

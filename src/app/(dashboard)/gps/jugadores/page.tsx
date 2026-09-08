import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { GpsSubnav } from "@/components/gps/gps-subnav";
import { listarRegistrosDetallado } from "@/lib/gps-data";
import { agruparPorJugador, resumirPeriodo } from "@/lib/gps-comparativas";
import { formatearNombreJugador } from "@/lib/gps-nombres";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function GpsJugadoresPage() {
  const supabase = await createClient();
  const registros = await listarRegistrosDetallado(supabase);
  const porJugador = agruparPorJugador(registros);

  const filas = Array.from(porJugador.entries())
    .map(([nombre, regs]) => ({ nombre, resumen: resumirPeriodo(regs) }))
    .sort((a, b) => (b.resumen.distanciaTotalM ?? 0) - (a.resumen.distanciaTotalM ?? 0));

  return (
    <div>
      <PageHeader title="GPS · Jugadores" description="Un jugador = una identidad por nombre del proveedor GPS. No depende del plantel cargado en Jugadores." />
      <GpsSubnav />

      {filas.length === 0 ? (
        <p className="text-sm text-foreground/50">No hay jugadores con datos de GPS.</p>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filas.map((f) => (
            <Link
              key={f.nombre}
              href={`/gps/jugadores/${encodeURIComponent(f.nombre)}`}
              className="group flex flex-col rounded-xl border border-border bg-surface p-4 transition-all hover:-translate-y-0.5 hover:shadow-md"
            >
              <p className="text-sm font-semibold text-foreground group-hover:text-primary">{formatearNombreJugador(f.nombre)}</p>
              <p className="mt-0.5 text-xs text-foreground/45">{f.resumen.sesiones} sesiones registradas</p>
              <div className="mt-3 grid grid-cols-3 gap-2 border-t border-border pt-3 text-center">
                <div>
                  <p className="text-sm font-semibold tabular-nums text-foreground">{Math.round(f.resumen.distanciaTotalM ?? 0).toLocaleString("es-UY")}</p>
                  <p className="text-[10px] uppercase tracking-wide text-foreground/40">Dist. total (m)</p>
                </div>
                <div>
                  <p className="text-sm font-semibold tabular-nums text-foreground">{Math.round(f.resumen.distAltaVelocidadM ?? 0).toLocaleString("es-UY")}</p>
                  <p className="text-[10px] uppercase tracking-wide text-foreground/40">HSR total (m)</p>
                </div>
                <div>
                  <p className="text-sm font-semibold tabular-nums text-foreground">{(f.resumen.velocidadMaximaKmh ?? 0).toLocaleString("es-UY")}</p>
                  <p className="text-[10px] uppercase tracking-wide text-foreground/40">Vel. máx. (km/h)</p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

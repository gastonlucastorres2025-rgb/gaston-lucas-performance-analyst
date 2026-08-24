import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { GpsExportarPdf } from "@/components/gps/gps-exportar-pdf";
import { listarRegistrosEnRango, listarSesiones, resumenPorJugador } from "@/lib/gps-data";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const TURNO_LABEL: Record<string, string> = { M: "Matutino", V: "Vespertino" };

export default async function GpsPage({ searchParams }: { searchParams: Promise<{ desde?: string; hasta?: string }> }) {
  const { desde, hasta } = await searchParams;
  const supabase = await createClient();

  const [sesiones, bloques] = await Promise.all([
    listarSesiones(supabase, desde, hasta),
    listarRegistrosEnRango(supabase, desde, hasta),
  ]);
  const jugadores = resumenPorJugador(bloques);

  return (
    <div>
      <PageHeader
        title="GPS"
        description="Carga física real del período de trabajo, cargada desde los CSV del proveedor. No depende del plantel de ningún club en particular."
      />

      <GpsExportarPdf desdeInicial={desde} hastaInicial={hasta} />

      <div className="mt-8">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-foreground/50">
          Resumen por jugador {desde || hasta ? "(rango filtrado)" : "(todo el período)"}
        </h2>
        {jugadores.length === 0 ? (
          <p className="text-sm text-foreground/50">No hay datos de GPS en este rango.</p>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-border">
            <table className="w-full text-sm">
              <thead className="bg-primary/5 text-xs uppercase tracking-wide text-foreground/50">
                <tr>
                  <th className="px-3 py-2 text-left">Jugador</th>
                  <th className="px-3 py-2 text-center">Sesiones</th>
                  <th className="px-3 py-2 text-center">Distancia total (m)</th>
                  <th className="px-3 py-2 text-center">Promedio/sesión (m)</th>
                  <th className="px-3 py-2 text-center">Vel. máxima (km/h)</th>
                  <th className="px-3 py-2 text-center">Aceleraciones (prom.)</th>
                  <th className="px-3 py-2 text-center">Desaceleraciones (prom.)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {jugadores.map((j) => (
                  <tr key={j.nombre}>
                    <td className="px-3 py-2 font-medium text-foreground">{j.nombre}</td>
                    <td className="px-3 py-2 text-center">{j.sesiones}</td>
                    <td className="px-3 py-2 text-center">{j.distanciaTotalM.toLocaleString("es-UY")}</td>
                    <td className="px-3 py-2 text-center">{j.distanciaPromedioM.toLocaleString("es-UY")}</td>
                    <td className="px-3 py-2 text-center">{j.velocidadMaximaKmh}</td>
                    <td className="px-3 py-2 text-center">{j.aceleracionesProm}</td>
                    <td className="px-3 py-2 text-center">{j.desaceleracionesProm}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="mt-8">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-foreground/50">Sesiones</h2>
        {sesiones.length === 0 ? (
          <p className="text-sm text-foreground/50">No hay sesiones en este rango.</p>
        ) : (
          <div className="divide-y divide-border rounded-lg border border-border">
            {sesiones.map((s) => (
              <Link
                key={s.id}
                href={`/gps/${s.id}`}
                className="flex items-center justify-between px-4 py-2.5 text-sm hover:bg-primary/5"
              >
                <span className="font-medium text-foreground">
                  {new Date(`${s.fecha}T00:00:00`).toLocaleDateString("es-UY", { weekday: "short", day: "2-digit", month: "2-digit", year: "numeric" })}
                  {s.turno ? ` · ${TURNO_LABEL[s.turno] ?? s.turno}` : ""}
                </span>
                <span className="text-foreground/50">{s.cantidadJugadores} jugadores</span>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

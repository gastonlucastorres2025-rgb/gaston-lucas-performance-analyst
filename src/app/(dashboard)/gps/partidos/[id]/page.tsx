import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { EscudoRival } from "@/components/gps/escudo-rival";
import { GpsPartidoPdfButton } from "@/components/gps/gps-partido-pdf-button";
import { KpiCard } from "@/components/gps/kpi-card";
import { GraficoCargaColectiva } from "@/components/gps/grafico-carga-colectiva";
import { TablaGps } from "@/components/gps/tabla-gps";
import { listarRegistrosDetallado, type GpsRegistroConSesion } from "@/lib/gps-data";
import { cargaPartidoARegistros, obtenerCargaPartido, obtenerPartidosReales, type PartidoGps } from "@/lib/gps-partidos";
import { promedioSimple, redondear } from "@/lib/gps-metricas";
import { formatearNombreJugador } from "@/lib/gps-nombres";
import { fondoHeatmap, rangoColumna } from "@/lib/heatmap";
import { createClient } from "@/lib/supabase/server";
import type { SupabaseClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

function diaUtc(fecha: string): number {
  // Date.UTC espera el mes 0-indexado — hay que restarle 1 al mes de la fecha (ver gps-md.ts).
  const [year, month, day] = fecha.split("-").map(Number);
  return Date.UTC(year, month - 1, day);
}
function sumarDias(fecha: string, dias: number): string {
  return new Date(diaUtc(fecha) + dias * 86_400_000).toISOString().slice(0, 10);
}

/** El microciclo completo de un partido: los entrenamientos reales de esa semana + la carga real
 * del partido mismo (1er/2do tiempo) — todo junto, para que la carga de la semana y del partido
 * se lean como una sola historia, no como dos cosas separadas. */
async function construirMicrociclo(supabase: SupabaseClient, registros: GpsRegistroConSesion[], partidos: PartidoGps[], idx: number) {
  const partido = partidos[idx];
  const anterior = partidos[idx - 1];
  const desde = anterior ? sumarDias(anterior.fecha, 1) : sumarDias(partido.fecha, -7);
  const entrenamientos = registros.filter((r) => r.fecha >= desde && r.fecha < partido.fecha);
  const cargaPartido = await obtenerCargaPartido(supabase, partido.fecha);
  const partidoComoRegistros = cargaPartidoARegistros(partido, cargaPartido);
  return { desde, cargaPartido, registros: [...entrenamientos, ...partidoComoRegistros] };
}

export default async function GpsPartidoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const partidos = (await obtenerPartidosReales(supabase)).slice().sort((a, b) => a.fecha.localeCompare(b.fecha));
  const idx = partidos.findIndex((p) => p.id === id);
  if (idx === -1) notFound();
  const partido = partidos[idx];

  const registros = await listarRegistrosDetallado(supabase);
  const microciclo = await construirMicrociclo(supabase, registros, partidos, idx);

  const local = partido.condicion === "local";
  const ganado = partido.golesFavor > partido.golesContra;
  const perdido = partido.golesFavor < partido.golesContra;
  const fechaTexto = new Date(`${partido.fecha}T00:00:00`).toLocaleDateString("es-UY", { weekday: "long", day: "2-digit", month: "long", year: "numeric" });

  const rangosPartido = {
    duracionMin: rangoColumna(microciclo.cargaPartido.map((j) => j.duracionMin ?? 0)),
    distanciaTotalM: rangoColumna(microciclo.cargaPartido.map((j) => j.distanciaTotalM ?? 0)),
    distanciaPorMin: rangoColumna(microciclo.cargaPartido.map((j) => j.distanciaPorMin ?? 0)),
    distAltaVelocidadM: rangoColumna(microciclo.cargaPartido.map((j) => j.distAltaVelocidadM ?? 0)),
    distMuyAltaVelocidadM: rangoColumna(microciclo.cargaPartido.map((j) => j.distMuyAltaVelocidadM ?? 0)),
    velocidadMaximaKmh: rangoColumna(microciclo.cargaPartido.map((j) => j.velocidadMaximaKmh ?? 0)),
    aceleracionesCant: rangoColumna(microciclo.cargaPartido.map((j) => j.aceleracionesCant ?? 0)),
    desaceleracionesCant: rangoColumna(microciclo.cargaPartido.map((j) => j.desaceleracionesCant ?? 0)),
  };

  return (
    <div>
      <Link href="/gps/partidos" className="mb-3 inline-block text-xs text-foreground/50 hover:text-primary">
        ← Partidos
      </Link>

      <div className="mb-6 rounded-xl border border-border bg-surface p-6">
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-foreground/45">
          <span className="capitalize">{fechaTexto}</span>
          <span className="rounded-full bg-primary/10 px-2 py-0.5 font-medium text-primary">{partido.competencia}</span>
        </div>
        <div className="mt-4 flex items-center justify-center gap-6">
          <div className="flex flex-col items-center gap-2">
            <Image src="/escudo-nacional.png" alt="Nacional" width={56} height={56} />
            <span className="text-sm font-medium text-foreground/70">Nacional</span>
          </div>
          <div className={`rounded-xl px-5 py-2 text-3xl font-bold tabular-nums ${ganado ? "bg-emerald-50 text-emerald-700" : perdido ? "bg-accent/10 text-accent" : "bg-primary/5 text-foreground"}`}>
            {local ? `${partido.golesFavor} - ${partido.golesContra}` : `${partido.golesContra} - ${partido.golesFavor}`}
          </div>
          <div className="flex flex-col items-center gap-2">
            <EscudoRival nombre={partido.rival} url={partido.rivalEscudo} size={56} />
            <span className="text-sm font-medium text-foreground/70">{partido.rival}</span>
          </div>
        </div>
        <p className="mt-3 text-center text-xs text-foreground/40">{local ? "Local" : "Visitante"}</p>
      </div>

      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-foreground">Carga física del partido</h2>
        <GpsPartidoPdfButton partidoId={partido.id} rival={partido.rival} fecha={partido.fecha} />
      </div>
      {microciclo.cargaPartido.length === 0 ? (
        <div className="mb-6 rounded-xl border border-dashed border-border bg-surface px-4 py-10 text-center">
          <p className="text-sm text-foreground/50">No hay archivo GPS de este partido — el proveedor no trackeó este día en particular.</p>
        </div>
      ) : (
        <div className="mb-6 rounded-xl border border-border bg-surface p-4">
          <p className="mb-3 text-xs text-foreground/40">
            Sacada de los tramos &ldquo;Primer Tiempo&rdquo; y &ldquo;Segundo Tiempo&rdquo; del GPS de ese día — {microciclo.cargaPartido.length} jugadores con minutos reales registrados.
          </p>
          <div className="overflow-hidden rounded-lg border border-border">
            <table className="w-full text-sm">
              <thead className="bg-primary text-[11px] font-semibold uppercase tracking-wider text-white/90">
                <tr>
                  <th className="px-4 py-2.5 text-left">Jugador</th>
                  <th className="px-4 py-2.5 text-right">Min</th>
                  <th className="px-4 py-2.5 text-right">Distancia (m)</th>
                  <th className="px-4 py-2.5 text-right">m/min</th>
                  <th className="px-4 py-2.5 text-right">HSR (m)</th>
                  <th className="px-4 py-2.5 text-right">Sprint (m)</th>
                  <th className="px-4 py-2.5 text-right">Vel. máx.</th>
                  <th className="px-4 py-2.5 text-right">Acc</th>
                  <th className="px-4 py-2.5 text-right">Dec</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {microciclo.cargaPartido.map((j, i) => {
                  const celda = (valor: number | null, rango: { min: number; max: number }, dec: number) => (
                    <td className="px-4 py-2.5 text-right font-medium tabular-nums text-foreground" style={{ backgroundColor: fondoHeatmap(valor ?? 0, rango.min, rango.max) }}>
                      {redondear(valor ?? 0, dec).toLocaleString("es-UY")}
                    </td>
                  );
                  return (
                    <tr key={j.nombre} className="transition-colors hover:bg-primary/5">
                      <td className="px-4 py-2.5 font-medium text-foreground">
                        <span className={`mr-2 inline-block w-4 text-right text-xs tabular-nums ${i < 3 ? "font-semibold text-accent" : "text-foreground/30"}`}>{i + 1}</span>
                        {formatearNombreJugador(j.nombre)}
                      </td>
                      {celda(j.duracionMin, rangosPartido.duracionMin, 0)}
                      {celda(j.distanciaTotalM, rangosPartido.distanciaTotalM, 0)}
                      {celda(j.distanciaPorMin, rangosPartido.distanciaPorMin, 1)}
                      {celda(j.distAltaVelocidadM, rangosPartido.distAltaVelocidadM, 0)}
                      {celda(j.distMuyAltaVelocidadM, rangosPartido.distMuyAltaVelocidadM, 0)}
                      {celda(j.velocidadMaximaKmh, rangosPartido.velocidadMaximaKmh, 1)}
                      {celda(j.aceleracionesCant, rangosPartido.aceleracionesCant, 0)}
                      {celda(j.desaceleracionesCant, rangosPartido.desaceleracionesCant, 0)}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="mb-3 flex items-baseline justify-between">
        <h2 className="text-sm font-semibold text-foreground">Microciclo completo (entrenamientos + partido)</h2>
        <span className="text-xs text-foreground/40">
          {microciclo.desde} → {partido.fecha}
        </span>
      </div>

      {microciclo.registros.length === 0 ? (
        <div className="mb-6 rounded-xl border border-dashed border-border bg-surface px-4 py-10 text-center">
          <p className="text-sm text-foreground/50">No hay datos de GPS registrados en la semana de este partido.</p>
        </div>
      ) : (
        <>
          <p className="mb-3 text-xs text-foreground/40">Promedio por sesión de toda la semana — entrenamientos previos más el partido.</p>
          <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            <KpiCard label="Distancia" valor={`${Math.round(promedioSimple(microciclo.registros, "distanciaTotalM") ?? 0).toLocaleString("es-UY")} m`} />
            <KpiCard label="HSR" valor={`${Math.round(promedioSimple(microciclo.registros, "distAltaVelocidadM") ?? 0).toLocaleString("es-UY")} m`} />
            <KpiCard label="Sprint" valor={`${Math.round(promedioSimple(microciclo.registros, "distMuyAltaVelocidadM") ?? 0).toLocaleString("es-UY")} m`} />
            <KpiCard label="Vel. máxima" valor={`${(promedioSimple(microciclo.registros, "velocidadMaximaKmh") ?? 0).toLocaleString("es-UY")} km/h`} />
            <KpiCard label="Sesiones" valor={new Set(microciclo.registros.map((r) => r.sesionId)).size.toLocaleString("es-UY")} />
          </div>

          <div className="mb-6">
            <GraficoCargaColectiva registros={microciclo.registros} />
          </div>

          <TablaGps registros={microciclo.registros} />
        </>
      )}
    </div>
  );
}

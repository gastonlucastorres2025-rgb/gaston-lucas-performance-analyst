import { PageHeader } from "@/components/page-header";
import { GpsExportarPdf } from "@/components/gps/gps-exportar-pdf";
import { GpsSubnav } from "@/components/gps/gps-subnav";
import { FiltrosGps } from "@/components/gps/filtros-gps";
import { KpiCard } from "@/components/gps/kpi-card";
import { GraficoCargaSesion } from "@/components/gps/grafico-carga-sesion";
import { GraficoCargaColectiva } from "@/components/gps/grafico-carga-colectiva";
import { TablaGps } from "@/components/gps/tabla-gps";
import { listarRegistrosDetallado, type GpsRegistroConSesion } from "@/lib/gps-data";
import { obtenerPartidosReales } from "@/lib/gps-partidos";
import { promedioSimple } from "@/lib/gps-metricas";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

function filtrar(registros: GpsRegistroConSesion[], jugador?: string, md?: string) {
  return registros.filter((r) => (!jugador || r.nombre === jugador) && (!md || r.md === md));
}

export default async function GpsPage({
  searchParams,
}: {
  searchParams: Promise<{ desde?: string; hasta?: string; jugador?: string; md?: string; partido?: string }>;
}) {
  const { desde, hasta, jugador, md, partido } = await searchParams;
  const supabase = await createClient();

  const [registrosRango, partidos] = await Promise.all([listarRegistrosDetallado(supabase, desde, hasta), obtenerPartidosReales(supabase)]);
  const jugadoresDisponibles = Array.from(new Set(registrosRango.map((r) => r.nombre))).sort((a, b) => a.localeCompare(b));
  const registrosFiltrados = filtrar(registrosRango, jugador, md);

  const sesionesDistintas = new Set(registrosFiltrados.map((r) => r.sesionId)).size;
  const jugadoresDistintos = new Set(registrosFiltrados.map((r) => r.nombre)).size;

  return (
    <div>
      <PageHeader title="GPS · Performance" description="Centro de análisis de carga física — datos reales del proveedor GPS, sin depender del plantel de ningún club en particular." />
      <GpsSubnav />

      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <FiltrosGps
          basePath="/gps"
          jugadores={jugadoresDisponibles}
          partidos={partidos.map((p) => ({ id: p.id, fecha: p.fecha, rival: p.rival }))}
          valores={{ desde, hasta, jugador, md, partido }}
        />
        <GpsExportarPdf desde={desde} hasta={hasta} />
      </div>

      {registrosFiltrados.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-surface px-4 py-16 text-center">
          <p className="text-sm text-foreground/50">No hay datos suficientes para esta combinación de filtros.</p>
        </div>
      ) : (
        <>
          <p className="mb-3 text-xs text-foreground/40">Promedio por sesión del filtro actual (no un acumulado — así sesiones con distinta asistencia son comparables entre sí).</p>
          <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            <KpiCard label="Sesiones" valor={sesionesDistintas.toLocaleString("es-UY")} contexto="en el filtro actual" />
            <KpiCard label="Jugadores" valor={jugadoresDistintos.toLocaleString("es-UY")} contexto="con datos en el filtro" />
            <KpiCard label="Distancia" valor={`${Math.round(promedioSimple(registrosFiltrados, "distanciaTotalM") ?? 0).toLocaleString("es-UY")} m`} />
            <KpiCard label="Distancia / min" valor={`${(promedioSimple(registrosFiltrados, "distanciaPorMin") ?? 0).toLocaleString("es-UY")} m/min`} />
            <KpiCard label="HSR" valor={`${Math.round(promedioSimple(registrosFiltrados, "distAltaVelocidadM") ?? 0).toLocaleString("es-UY")} m`} />
            <KpiCard label="Sprint (zona 6)" valor={`${Math.round(promedioSimple(registrosFiltrados, "distMuyAltaVelocidadM") ?? 0).toLocaleString("es-UY")} m`} />
            <KpiCard label="Velocidad máxima" valor={`${(promedioSimple(registrosFiltrados, "velocidadMaximaKmh") ?? 0).toLocaleString("es-UY")} km/h`} />
            <KpiCard label="Aceleraciones" valor={`${Math.round(promedioSimple(registrosFiltrados, "aceleracionesCant") ?? 0)}`} />
            <KpiCard label="Desaceleraciones" valor={`${Math.round(promedioSimple(registrosFiltrados, "desaceleracionesCant") ?? 0)}`} />
          </div>

          <div className="mb-6 grid gap-4 lg:grid-cols-2">
            <GraficoCargaSesion registros={registrosFiltrados} />
            <GraficoCargaColectiva registros={registrosFiltrados} />
          </div>

          <TablaGps registros={registrosFiltrados} />
        </>
      )}
    </div>
  );
}

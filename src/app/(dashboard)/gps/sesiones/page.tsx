import { PageHeader } from "@/components/page-header";
import { GpsSubnav } from "@/components/gps/gps-subnav";
import { FiltrosGps } from "@/components/gps/filtros-gps";
import { SesionCard } from "@/components/gps/sesion-card";
import { listarRegistrosEnRango } from "@/lib/gps-data";
import { obtenerPartidosReales } from "@/lib/gps-partidos";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function GpsSesionesPage({
  searchParams,
}: {
  searchParams: Promise<{ desde?: string; hasta?: string; jugador?: string; md?: string; partido?: string }>;
}) {
  const { desde, hasta, jugador, md, partido } = await searchParams;
  const supabase = await createClient();

  const [bloques, partidos] = await Promise.all([listarRegistrosEnRango(supabase, desde, hasta), obtenerPartidosReales(supabase)]);
  const jugadoresDisponibles = Array.from(new Set(bloques.flatMap((b) => b.registros.map((r) => r.nombre)))).sort((a, b) => a.localeCompare(b));

  const filtrados = bloques
    .filter((b) => !md || b.sesion.md === md)
    .map((b) => ({ ...b, registros: jugador ? b.registros.filter((r) => r.nombre === jugador) : b.registros }))
    .filter((b) => b.registros.length > 0)
    .sort((a, b) => b.sesion.fecha.localeCompare(a.sesion.fecha));

  return (
    <div>
      <PageHeader title="GPS · Sesiones" description="Cada entrenamiento como una entidad visual, con su día de microciclo (MD) real según los partidos del período." />
      <GpsSubnav />

      <div className="mb-6">
        <FiltrosGps
          basePath="/gps/sesiones"
          jugadores={jugadoresDisponibles}
          partidos={partidos.map((p) => ({ id: p.id, fecha: p.fecha, rival: p.rival }))}
          valores={{ desde, hasta, jugador, md, partido }}
        />
      </div>

      {filtrados.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-surface px-4 py-16 text-center">
          <p className="text-sm text-foreground/50">No hay sesiones para esta combinación de filtros.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filtrados.map((b) => (
            <SesionCard
              key={b.sesion.id}
              id={b.sesion.id}
              fecha={b.sesion.fecha}
              turno={b.sesion.turno}
              md={b.sesion.md}
              cantidadJugadores={b.registros.length}
              registros={b.registros}
            />
          ))}
        </div>
      )}
    </div>
  );
}

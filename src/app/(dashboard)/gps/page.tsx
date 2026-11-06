import { SinDatos, Tarjeta, TarjetaAlerta, Tile, formatearFecha } from "@/components/gps/piezas";
import { VARIABLES_ACWR, bandaAcwr, severidadVmax } from "@/lib/gps/calculos";
import { obtenerClubActivo } from "@/lib/gps/club";
import { cargarPanel } from "@/lib/gps/panel";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function GpsResumenPage() {
  const supabase = await createClient();
  const club = await obtenerClubActivo(supabase);
  const panel = await cargarPanel(supabase, club);

  if (!panel.ultimaFecha) return <SinDatos />;

  const alertasAcwr = panel.filas
    .map((f) => ({ f, altos: VARIABLES_ACWR.filter((v) => (f.acwr[v] ?? 0) > 1.3) }))
    .filter((x) => x.altos.length > 0)
    .map(({ f, altos }) => ({
      nombre: f.nombre,
      peor: Math.max(...altos.map((v) => f.acwr[v] as number)),
      detalle: altos.map((v) => `${v}: ${(f.acwr[v] as number).toFixed(2)}`).join(" · "),
    }))
    .sort((a, b) => b.peor - a.peor);

  const alertasVmax = panel.filas
    .filter((f) => f.vmax && f.vmax.dias >= 7)
    .sort((a, b) => b.vmax!.dias - a.vmax!.dias);

  const lesionesAbiertas = panel.lesiones.filter((l) => l.estado !== "Alta");

  return (
    <div>
      <Tarjeta
        titulo={`Resumen del día — ${formatearFecha(panel.hoy)}`}
        nota={`Último día con datos GPS cargados: ${formatearFecha(panel.ultimaFecha)}. Todo lo que hoy necesita atención, junto.`}
      >
        <div className="flex flex-wrap gap-3">
          <Tile numero={alertasAcwr.length} etiqueta="jugadores en ACWR amarillo/rojo" severidad={alertasAcwr.length ? "alerta" : "ok"} />
          <Tile numero={alertasVmax.length} etiqueta="con VMAX atrasada (≥7 días)" severidad={alertasVmax.length ? "atencion" : "ok"} />
          <Tile numero={lesionesAbiertas.length} etiqueta="lesiones activas / en recuperación" severidad={lesionesAbiertas.length ? "alerta" : "ok"} />
        </div>
      </Tarjeta>

      <Tarjeta titulo="Alertas — ACWR en amarillo/rojo">
        {alertasAcwr.length === 0 ? (
          <p className="text-sm text-foreground/60">Nadie en amarillo/rojo de ACWR hoy.</p>
        ) : (
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {alertasAcwr.map((a) => (
              <TarjetaAlerta key={a.nombre} titulo={a.nombre} detalle={a.detalle} severidad={bandaAcwr(a.peor) === "riesgo" ? "alerta" : "atencion"} />
            ))}
          </div>
        )}
      </Tarjeta>

      <Tarjeta titulo="Alertas — velocidad máxima atrasada">
        {alertasVmax.length === 0 ? (
          <p className="text-sm text-foreground/60">Todos llegaron al 90% de su VMAX en los últimos 7 días.</p>
        ) : (
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {alertasVmax.map((f) => (
              <TarjetaAlerta
                key={f.nombre}
                titulo={f.nombre}
                detalle={`Sin llegar al 90% de su VMAX de referencia hace ${f.vmax!.dias} días (último: ${formatearFecha(f.vmax!.ultimoDia)})`}
                severidad={severidadVmax(f.vmax!.dias) === "alerta" ? "alerta" : "atencion"}
              />
            ))}
          </div>
        )}
      </Tarjeta>

      <Tarjeta titulo="Lesiones activas / en recuperación">
        {lesionesAbiertas.length === 0 ? (
          <p className="text-sm text-foreground/60">No hay lesiones activas ni en recuperación.</p>
        ) : (
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {lesionesAbiertas.map((l) => (
              <TarjetaAlerta
                key={l.id}
                titulo={`${l.jugador}${l.zona ? ` — ${l.zona}` : ""}`}
                detalle={`${l.estado} · desde ${formatearFecha(l.fecha)}`}
                severidad={l.estado === "Activa" ? "alerta" : "atencion"}
              />
            ))}
          </div>
        )}
      </Tarjeta>
    </div>
  );
}

import Link from "next/link";
import { notFound } from "next/navigation";
import { KpiCard } from "@/components/gps/kpi-card";
import { GraficoCargaSesion } from "@/components/gps/grafico-carga-sesion";
import { listarRegistrosDetallado } from "@/lib/gps-data";
import { ultimasNSesiones } from "@/lib/gps-comparativas";
import { METRICAS, promedioSimple, valorMetrica, formatearValor } from "@/lib/gps-metricas";
import { formatearNombreJugador } from "@/lib/gps-nombres";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const TURNO_LABEL: Record<string, string> = { M: "Matutino", V: "Vespertino" };

export default async function GpsJugadorPage({ params }: { params: Promise<{ nombre: string }> }) {
  const { nombre: nombreCodificado } = await params;
  const nombre = decodeURIComponent(nombreCodificado);
  const supabase = await createClient();
  const registros = (await listarRegistrosDetallado(supabase)).filter((r) => r.nombre === nombre);
  if (registros.length === 0) notFound();

  const recientes = ultimasNSesiones(registros, 8);

  return (
    <div>
      <Link href="/gps/jugadores" className="mb-3 inline-block text-xs text-foreground/50 hover:text-primary">
        ← Jugadores
      </Link>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-foreground">{formatearNombreJugador(nombre)}</h1>
          <p className="mt-1 text-xs text-foreground/45">{registros.length} sesiones registradas · identidad por nombre del proveedor GPS (sin posición: no disponible en este módulo)</p>
        </div>
        <Link
          href={`/gps/comparar?jugadorA=${encodeURIComponent(nombre)}`}
          className="rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-white hover:bg-primary-dark"
        >
          Comparar con otro jugador
        </Link>
      </div>

      <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-foreground/45">Promedio por sesión ({registros.length} sesiones)</h2>
      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        <KpiCard label="Distancia" valor={`${Math.round(promedioSimple(registros, "distanciaTotalM") ?? 0).toLocaleString("es-UY")} m`} />
        <KpiCard label="HSR" valor={`${Math.round(promedioSimple(registros, "distAltaVelocidadM") ?? 0).toLocaleString("es-UY")} m`} />
        <KpiCard label="Sprint" valor={`${Math.round(promedioSimple(registros, "distMuyAltaVelocidadM") ?? 0).toLocaleString("es-UY")} m`} />
        <KpiCard label="Vel. máxima" valor={`${(promedioSimple(registros, "velocidadMaximaKmh") ?? 0).toLocaleString("es-UY")} km/h`} />
        <KpiCard
          label="Acel. / Desac."
          valor={`${Math.round(promedioSimple(registros, "aceleracionesCant") ?? 0)} / ${Math.round(promedioSimple(registros, "desaceleracionesCant") ?? 0)}`}
        />
      </div>

      <div className="mb-6">
        <GraficoCargaSesion registros={registros} />
      </div>

      <div className="mb-6 grid gap-4 lg:grid-cols-2">
        <div className="rounded-xl border border-border bg-surface p-4">
          <h3 className="mb-3 text-sm font-semibold text-foreground">Sesiones recientes</h3>
          <div className="divide-y divide-border">
            {recientes.map((r) => (
              <div key={r.sesionId} className="flex items-center justify-between py-2 text-sm">
                <span className="text-foreground/70">
                  {new Date(`${r.fecha}T00:00:00`).toLocaleDateString("es-UY", { day: "2-digit", month: "2-digit" })}
                  {r.turno ? ` · ${TURNO_LABEL[r.turno] ?? r.turno}` : ""}
                  {r.md && <span className="ml-1.5 text-xs text-foreground/40">({r.md === "MD" ? "Partido" : r.md.replace("MD", "M")})</span>}
                </span>
                <span className="tabular-nums text-foreground/60">{r.distanciaTotalM?.toLocaleString("es-UY") ?? "—"} m</span>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-xl border border-border bg-surface p-4">
          <h3 className="mb-3 text-sm font-semibold text-foreground">Máximos personales del período</h3>
          <p className="mb-3 text-xs text-foreground/40">Mejor valor individual registrado en una sola sesión.</p>
          <div className="divide-y divide-border">
            {METRICAS.filter((m) => m.clave !== "duracionMin").map((def) => {
              const valores = registros.map((r) => valorMetrica(r, def.clave)).filter((v): v is number => v !== null);
              const max = valores.length > 0 ? Math.max(...valores) : null;
              return (
                <div key={def.clave} className="flex items-center justify-between py-2 text-sm">
                  <span className="text-foreground/70">{def.label}</span>
                  <span className="tabular-nums font-medium text-foreground">{formatearValor(max, def)}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <p className="text-xs text-foreground/35">
        Esto es solo carga de entrenamiento. La carga real de partidos de {formatearNombreJugador(nombre)} se ve en cada partido, dentro de{" "}
        <Link href="/gps/partidos" className="underline hover:text-primary">
          Partidos
        </Link>
        .
      </p>
    </div>
  );
}

import Link from "next/link";
import { notFound } from "next/navigation";
import { GpsSesionPdfButton } from "@/components/gps/gps-sesion-pdf-button";
import { KpiCard } from "@/components/gps/kpi-card";
import { TablaGps } from "@/components/gps/tabla-gps";
import { obtenerSesionDetalle, type GpsRegistroConSesion } from "@/lib/gps-data";
import { promedioSimple } from "@/lib/gps-metricas";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const TURNO_LABEL: Record<string, string> = { M: "Matutino", V: "Vespertino" };

export default async function GpsSesionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const sesion = await obtenerSesionDetalle(supabase, id);
  if (!sesion) notFound();

  const fechaTexto = new Date(`${sesion.fecha}T00:00:00`).toLocaleDateString("es-UY", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
  });

  const registrosConSesion: GpsRegistroConSesion[] = sesion.registros.map((r) => ({
    ...r,
    sesionId: sesion.id,
    fecha: sesion.fecha,
    turno: sesion.turno,
    nombreBloque: sesion.nombreBloque,
    md: sesion.md,
  }));

  return (
    <div>
      <Link href="/gps/sesiones" className="mb-3 inline-block text-xs text-foreground/50 hover:text-primary">
        ← Sesiones
      </Link>
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-semibold capitalize tracking-tight text-foreground">{fechaTexto}</h1>
            {sesion.md && (
              <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${sesion.md === "MD" ? "bg-accent text-white" : "bg-primary/10 text-primary"}`}>
                {sesion.md === "MD" ? "PARTIDO" : sesion.md.replace("MD", "M")}
              </span>
            )}
          </div>
          <p className="mt-1 text-sm text-foreground/60">
            Entrenamiento{sesion.turno ? ` · ${TURNO_LABEL[sesion.turno] ?? sesion.turno}` : ""} · {sesion.cantidadJugadores} jugadores
          </p>
        </div>
        <GpsSesionPdfButton id={sesion.id} fecha={sesion.fecha} cantidadJugadores={sesion.cantidadJugadores} />
      </div>

      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        <KpiCard label="Distancia prom." valor={`${Math.round(promedioSimple(sesion.registros, "distanciaTotalM") ?? 0).toLocaleString("es-UY")} m`} />
        <KpiCard label="Dist. / min prom." valor={`${(promedioSimple(sesion.registros, "distanciaPorMin") ?? 0).toLocaleString("es-UY")} m/min`} />
        <KpiCard label="HSR prom." valor={`${Math.round(promedioSimple(sesion.registros, "distAltaVelocidadM") ?? 0).toLocaleString("es-UY")} m`} />
        <KpiCard label="Sprint prom." valor={`${Math.round(promedioSimple(sesion.registros, "distMuyAltaVelocidadM") ?? 0).toLocaleString("es-UY")} m`} />
        <KpiCard label="Vel. máx. prom." valor={`${(promedioSimple(sesion.registros, "velocidadMaximaKmh") ?? 0).toLocaleString("es-UY")} km/h`} />
      </div>

      <TablaGps registros={registrosConSesion} />
    </div>
  );
}

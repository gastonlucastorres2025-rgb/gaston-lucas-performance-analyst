import Link from "next/link";
import { notFound } from "next/navigation";
import { GpsSesionPdfButton } from "@/components/gps/gps-sesion-pdf-button";
import { obtenerSesionDetalle } from "@/lib/gps-data";
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

  return (
    <div>
      <Link href="/gps" className="mb-3 inline-block text-xs text-foreground/50 hover:text-primary">
        ← GPS
      </Link>
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-foreground">Sesión de GPS</h1>
          <p className="mt-1 text-sm text-foreground/60">
            {fechaTexto}
            {sesion.turno ? ` · ${TURNO_LABEL[sesion.turno] ?? sesion.turno}` : ""} · {sesion.cantidadJugadores} jugadores
          </p>
        </div>
        <GpsSesionPdfButton fecha={sesion.fecha} registros={sesion.registros} />
      </div>

      <div className="overflow-x-auto rounded-lg border border-border">
        <table className="w-full text-sm">
          <thead className="bg-primary/5 text-xs uppercase tracking-wide text-foreground/50">
            <tr>
              <th className="px-3 py-2 text-left">Jugador</th>
              <th className="px-3 py-2 text-center">Tiempo (min)</th>
              <th className="px-3 py-2 text-center">Distancia (m)</th>
              <th className="px-3 py-2 text-center">Dist./min</th>
              <th className="px-3 py-2 text-center">Vel. máxima (km/h)</th>
              <th className="px-3 py-2 text-center">Dist. alta vel. (m)</th>
              <th className="px-3 py-2 text-center">Aceleraciones</th>
              <th className="px-3 py-2 text-center">Desaceleraciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {sesion.registros.map((r) => (
              <tr key={r.id}>
                <td className="px-3 py-2 font-medium text-foreground">{r.nombre}</td>
                <td className="px-3 py-2 text-center">{r.duracionMin ?? "—"}</td>
                <td className="px-3 py-2 text-center">{r.distanciaTotalM ?? "—"}</td>
                <td className="px-3 py-2 text-center">{r.distanciaPorMin ?? "—"}</td>
                <td className="px-3 py-2 text-center">{r.velocidadMaximaKmh ?? "—"}</td>
                <td className="px-3 py-2 text-center">{r.distAltaVelocidadM ?? "—"}</td>
                <td className="px-3 py-2 text-center">{r.aceleracionesCant ?? "—"}</td>
                <td className="px-3 py-2 text-center">{r.desaceleracionesCant ?? "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

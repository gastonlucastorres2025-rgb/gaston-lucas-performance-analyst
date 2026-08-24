"use client";

import { pdf } from "@react-pdf/renderer";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { GpsPdfDocument } from "@/components/gps/gps-pdf";
import { obtenerBloquesGpsParaPdf } from "@/lib/gps-actions";

function hoy() {
  return new Date().toISOString().slice(0, 10);
}

/** Filtro de rango de fechas para GPS: sirve tanto para filtrar la tabla en pantalla (un día, una
 * semana/microciclo, o cualquier rango) como para exportar ese mismo rango a PDF. Pedido explícito
 * del usuario: poder descargar un día puntual, un microciclo o una semana. */
export function GpsExportarPdf({ desdeInicial, hastaInicial }: { desdeInicial?: string; hastaInicial?: string }) {
  const router = useRouter();
  const [desde, setDesde] = useState(desdeInicial ?? "");
  const [hasta, setHasta] = useState(hastaInicial ?? "");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function aplicarFiltro() {
    const params = new URLSearchParams();
    if (desde) params.set("desde", desde);
    if (hasta) params.set("hasta", hasta);
    router.push(`/gps${params.toString() ? `?${params.toString()}` : ""}`);
  }

  async function descargarPdf() {
    setError(null);
    const rangoDesde = desde || undefined;
    const rangoHasta = hasta || hoy();
    if (!rangoDesde) {
      setError("Elegí al menos la fecha desde.");
      return;
    }
    setPending(true);
    try {
      const bloques = await obtenerBloquesGpsParaPdf(rangoDesde, rangoHasta);
      if (bloques.length === 0) {
        setError("No hay sesiones en ese rango.");
        return;
      }
      const esUnSoloDia = rangoDesde === rangoHasta;
      const titulo = esUnSoloDia ? `GPS — ${rangoDesde}` : `GPS — del ${rangoDesde} al ${rangoHasta}`;
      const blob = await pdf(<GpsPdfDocument data={{ titulo, bloques, generadoEn: new Date().toISOString() }} />).toBlob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `GPS_${rangoDesde}_a_${rangoHasta}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="flex flex-wrap items-end gap-2 rounded-lg border border-border bg-surface p-3">
      <div>
        <label className="block text-xs text-foreground/60">Desde</label>
        <input
          type="date"
          value={desde}
          onChange={(e) => setDesde(e.target.value)}
          className="mt-1 rounded border border-border px-2 py-1.5 text-sm focus:border-primary focus:outline-none"
        />
      </div>
      <div>
        <label className="block text-xs text-foreground/60">Hasta</label>
        <input
          type="date"
          value={hasta}
          onChange={(e) => setHasta(e.target.value)}
          className="mt-1 rounded border border-border px-2 py-1.5 text-sm focus:border-primary focus:outline-none"
        />
      </div>
      <button onClick={aplicarFiltro} className="rounded-md border border-border px-3 py-1.5 text-sm text-foreground hover:bg-primary/5">
        Filtrar
      </button>
      <button
        onClick={descargarPdf}
        disabled={pending}
        className="rounded-md bg-accent px-4 py-1.5 text-sm font-medium text-white transition-colors hover:bg-accent/90 disabled:opacity-50"
      >
        {pending ? "Generando..." : "⬇ Exportar PDF del rango"}
      </button>
      {error && <p className="w-full text-xs text-accent">{error}</p>}
    </div>
  );
}

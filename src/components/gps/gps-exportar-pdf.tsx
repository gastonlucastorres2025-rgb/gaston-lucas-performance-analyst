"use client";

import { pdf } from "@react-pdf/renderer";
import { useState } from "react";
import { GpsPdfDocument } from "@/components/gps/gps-pdf";
import { obtenerBloquesGpsParaPdf } from "@/lib/gps-actions";

/** Exporta a PDF exactamente el rango de fechas activo en el filtro de arriba (un único filtro
 * compartido, no uno propio) — así lo que se ve en pantalla es siempre lo que se descarga. Si no
 * hay fechas elegidas, exporta todo el período disponible. */
export function GpsExportarPdf({ desde, hasta }: { desde?: string; hasta?: string }) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function descargarPdf() {
    setError(null);
    setPending(true);
    try {
      const bloques = await obtenerBloquesGpsParaPdf(desde, hasta);
      if (bloques.length === 0) {
        setError("No hay sesiones en este filtro.");
        return;
      }
      const rangoDesde = bloques[0].fecha;
      const rangoHasta = bloques[bloques.length - 1].fecha;
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
    <div className="flex flex-col items-end gap-1">
      <button
        onClick={descargarPdf}
        disabled={pending}
        className="rounded-md bg-accent px-4 py-1.5 text-sm font-medium text-white transition-colors hover:bg-accent/90 disabled:opacity-50"
      >
        {pending ? "Generando..." : "⬇ Exportar PDF del filtro actual"}
      </button>
      {error && <p className="text-xs text-accent">{error}</p>}
    </div>
  );
}

"use client";

import { pdf } from "@react-pdf/renderer";
import { useState } from "react";
import { GpsPdfPartidoDocument } from "@/components/gps/gps-pdf-partido";
import { obtenerDatosPdfPartido } from "@/lib/gps-actions";

export function GpsPartidoPdfButton({ partidoId, rival, fecha }: { partidoId: string; rival: string; fecha: string }) {
  const [pending, setPending] = useState(false);

  async function handleDescargar() {
    setPending(true);
    try {
      const data = await obtenerDatosPdfPartido(partidoId);
      const blob = await pdf(<GpsPdfPartidoDocument data={data} />).toBlob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `GPS_partido_${fecha}_vs_${rival.replace(/\s+/g, "-")}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setPending(false);
    }
  }

  return (
    <button
      onClick={handleDescargar}
      disabled={pending}
      className="rounded-lg bg-accent px-4 py-2 text-xs font-semibold text-white shadow-sm transition-colors hover:bg-accent/90 disabled:opacity-50"
    >
      {pending ? "Generando..." : "⬇ Descargar PDF del partido"}
    </button>
  );
}

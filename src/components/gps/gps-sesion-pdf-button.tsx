"use client";

import { pdf } from "@react-pdf/renderer";
import { useState } from "react";
import { GpsPdfSesionDocument } from "@/components/gps/gps-pdf-sesion";
import { obtenerDatosPdfSesion } from "@/lib/gps-actions";

export function GpsSesionPdfButton({ id, fecha, cantidadJugadores }: { id: string; fecha: string; cantidadJugadores: number }) {
  const [pending, setPending] = useState(false);

  async function handleDescargar() {
    setPending(true);
    try {
      const data = await obtenerDatosPdfSesion(id);
      const blob = await pdf(<GpsPdfSesionDocument data={data} />).toBlob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `GPS_entrenamiento_${fecha}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setPending(false);
    }
  }

  return (
    <button
      onClick={handleDescargar}
      disabled={pending || cantidadJugadores === 0}
      className="shrink-0 rounded-md bg-accent px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-accent/90 disabled:opacity-50"
    >
      {pending ? "Generando..." : "⬇ Descargar PDF"}
    </button>
  );
}

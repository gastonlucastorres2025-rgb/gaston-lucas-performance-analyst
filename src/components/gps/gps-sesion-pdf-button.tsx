"use client";

import { pdf } from "@react-pdf/renderer";
import { useState } from "react";
import { GpsPdfDocument } from "@/components/gps/gps-pdf";
import type { GpsRegistro } from "@/lib/gps-data";

export function GpsSesionPdfButton({ fecha, registros }: { fecha: string; registros: GpsRegistro[] }) {
  const [pending, setPending] = useState(false);

  async function handleDescargar() {
    setPending(true);
    try {
      const blob = await pdf(
        <GpsPdfDocument
          data={{
            titulo: "GPS — sesión de entrenamiento",
            bloques: [{ fecha, turno: null, registros }],
            generadoEn: new Date().toISOString(),
          }}
        />,
      ).toBlob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `GPS_${fecha}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setPending(false);
    }
  }

  return (
    <button
      onClick={handleDescargar}
      disabled={pending || registros.length === 0}
      className="shrink-0 rounded-md bg-accent px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-accent/90 disabled:opacity-50"
    >
      {pending ? "Generando..." : "⬇ Descargar PDF"}
    </button>
  );
}

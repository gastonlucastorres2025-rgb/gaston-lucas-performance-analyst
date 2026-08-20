"use client";

import { pdf } from "@react-pdf/renderer";
import { useState } from "react";
import { CarpetaPdfDocument, type JugadorCarpetaPdf } from "@/components/seguimiento-internacional/carpeta-pdf";

export function CarpetaPdfButton({ carpetaNombre, jugadores }: { carpetaNombre: string; jugadores: JugadorCarpetaPdf[] }) {
  const [pending, setPending] = useState(false);

  async function handleDescargar() {
    setPending(true);
    try {
      const crestUrl = `${window.location.origin}/escudo-nacional.png`;
      const blob = await pdf(
        <CarpetaPdfDocument data={{ carpetaNombre, jugadores, crestUrl, generadoEn: new Date().toISOString() }} />,
      ).toBlob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `Carpeta_${carpetaNombre.replace(/\s+/g, "_")}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setPending(false);
    }
  }

  return (
    <button
      onClick={handleDescargar}
      disabled={pending || jugadores.length === 0}
      title={jugadores.length === 0 ? "Agregá al menos un jugador para exportar" : undefined}
      className="shrink-0 rounded-md bg-accent px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-accent/90 disabled:opacity-50"
    >
      {pending ? "Generando..." : "⬇ Exportar PDF"}
    </button>
  );
}

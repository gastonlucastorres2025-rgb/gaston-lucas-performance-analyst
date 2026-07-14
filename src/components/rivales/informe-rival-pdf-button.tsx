"use client";

import { pdf } from "@react-pdf/renderer";
import { useState } from "react";
import { InformeRivalPdfDocument, type InformeRivalPdfData } from "@/components/rivales/informe-rival-pdf";

export function InformeRivalPdfButton({
  rival,
  planes,
  partidos,
  carpetas,
  informes,
}: Omit<InformeRivalPdfData, "crestUrl">) {
  const [pending, setPending] = useState(false);

  async function handleDescargar() {
    setPending(true);
    try {
      const crestUrl = `${window.location.origin}/escudo-nacional.png`;
      const blob = await pdf(
        <InformeRivalPdfDocument data={{ rival, planes, partidos, carpetas, informes, crestUrl }} />,
      ).toBlob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `Informe_${rival.nombre.replace(/\s+/g, "_")}.pdf`;
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
      className="shrink-0 rounded-md bg-accent px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-accent/90 disabled:opacity-50"
    >
      {pending ? "Generando informe..." : "⬇ Descargar informe PDF"}
    </button>
  );
}

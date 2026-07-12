"use client";

import { pdf } from "@react-pdf/renderer";
import { useState } from "react";
import { AnalisisRivalPdfDocument } from "@/components/analisis-rival/analisis-rival-pdf";
import type { AnalisisRivalData } from "@/lib/analisis-rival-types";

export function AnalisisRivalPdfButton({ plan }: { plan: AnalisisRivalData }) {
  const [pending, setPending] = useState(false);

  async function handleDescargar() {
    setPending(true);
    try {
      const crestUrl = `${window.location.origin}/escudo-nacional.png`;
      const blob = await pdf(<AnalisisRivalPdfDocument plan={plan} crestUrl={crestUrl} />).toBlob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `Plan_de_Partido_${(plan.rival || "rival").replace(/\s+/g, "_")}.pdf`;
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
      className="rounded-md bg-accent px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-accent/90 disabled:opacity-50"
    >
      {pending ? "Generando PDF..." : "⬇ Descargar PDF"}
    </button>
  );
}

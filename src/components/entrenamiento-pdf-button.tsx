"use client";

import { pdf } from "@react-pdf/renderer";
import { useState } from "react";
import { EntrenamientoPdfDocument, type EntrenamientoPdfData } from "@/components/entrenamiento-pdf";

export function EntrenamientoPdfButton({ data }: { data: Omit<EntrenamientoPdfData, "crestUrl"> }) {
  const [pending, setPending] = useState(false);

  async function handleDescargar() {
    setPending(true);
    try {
      const crestUrl = `${window.location.origin}/escudo-nacional.png`;
      const blob = await pdf(<EntrenamientoPdfDocument data={{ ...data, crestUrl }} />).toBlob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `entrenamiento-${data.fecha}${data.turno ? `-${data.turno}` : ""}.pdf`;
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

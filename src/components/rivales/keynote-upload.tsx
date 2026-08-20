"use client";

import { useState } from "react";
import { subirKeynoteRival, eliminarKeynoteRival } from "@/lib/rivales-actions";

export function KeynoteUpload({
  rivalId,
  keynoteUrlInicial,
  keynoteNombreInicial,
}: {
  rivalId: string;
  keynoteUrlInicial: string | null;
  keynoteNombreInicial: string | null;
}) {
  const [keynoteUrl, setKeynoteUrl] = useState(keynoteUrlInicial);
  const [keynoteNombre, setKeynoteNombre] = useState(keynoteNombreInicial);
  const [subiendo, setSubiendo] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setSubiendo(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.set("file", file);
      const res = await subirKeynoteRival(rivalId, formData);
      if (res.error) {
        setError(res.error);
        return;
      }
      setKeynoteUrl(res.url);
      setKeynoteNombre(res.nombre);
    } finally {
      setSubiendo(false);
      e.target.value = "";
    }
  }

  async function handleQuitar() {
    if (!keynoteUrl) return;
    setKeynoteUrl(null);
    setKeynoteNombre(null);
    await eliminarKeynoteRival(rivalId, keynoteUrl);
  }

  return (
    <div className="border-b border-border p-3">
      {keynoteUrl ? (
        <div className="flex items-center justify-between gap-2">
          <a
            href={keynoteUrl}
            target="_blank"
            rel="noreferrer"
            className="truncate text-sm font-medium text-primary hover:underline"
          >
            📎 {keynoteNombre || "Ver Keynote"}
          </a>
          <button onClick={handleQuitar} className="shrink-0 text-xs text-accent hover:underline">
            Quitar
          </button>
        </div>
      ) : (
        <label className="flex cursor-pointer items-center gap-2 text-sm text-primary hover:underline">
          <span>{subiendo ? "Subiendo..." : "📎 Cargar Keynote"}</span>
          <input type="file" onChange={handleFile} disabled={subiendo} accept=".key,.pdf,.ppt,.pptx" className="hidden" />
        </label>
      )}
      {error && <p className="mt-1 text-xs text-accent">{error}</p>}
    </div>
  );
}

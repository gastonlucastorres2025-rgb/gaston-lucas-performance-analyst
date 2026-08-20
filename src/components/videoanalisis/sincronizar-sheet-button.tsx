"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { sincronizarPartidosVADesdeSheet, type SincronizarSheetResult } from "@/lib/videoanalisis-actions";

export function SincronizarSheetButton() {
  const [pending, startTransition] = useTransition();
  const [resultado, setResultado] = useState<SincronizarSheetResult | null>(null);
  const router = useRouter();

  function sincronizar() {
    setResultado(null);
    startTransition(async () => {
      const res = await sincronizarPartidosVADesdeSheet();
      setResultado(res);
      if (res.creados > 0 || res.xmlCompletados > 0) router.refresh();
    });
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        onClick={sincronizar}
        disabled={pending}
        className="rounded-md border border-primary px-4 py-2 text-sm font-medium text-primary transition-colors hover:bg-primary/5 disabled:opacity-50"
      >
        {pending ? "Sincronizando..." : "↻ Sincronizar desde Sheet"}
      </button>
      {resultado && (
        <div className="max-w-xs text-right text-xs">
          {resultado.error ? (
            <p className="text-accent">{resultado.error}</p>
          ) : (
            <>
              <p className="text-foreground/60">
                {resultado.creados} creado{resultado.creados === 1 ? "" : "s"}, {resultado.saltados} ya
                importado{resultado.saltados === 1 ? "" : "s"}
                {resultado.xmlCompletados > 0 &&
                  `, ${resultado.xmlCompletados} completado${resultado.xmlCompletados === 1 ? "" : "s"} con XML`}
                {resultado.fallidos.length > 0 && `, ${resultado.fallidos.length} con error`}.
              </p>
              {resultado.fallidos.map((f) => (
                <p key={f.fila} className="text-accent">
                  {f.fila}: {f.motivo}
                </p>
              ))}
            </>
          )}
        </div>
      )}
    </div>
  );
}

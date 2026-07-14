"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { actualizarFasesRival, eliminarFasesRival } from "@/lib/fases-rival-actions";

export function FasesRivalAcciones({ id }: { id: string }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  function actualizar() {
    setError(null);
    startTransition(async () => {
      const res = await actualizarFasesRival(id);
      if (res?.error) setError(res.error);
      else router.refresh();
    });
  }

  function eliminar() {
    if (!confirm("¿Eliminar esta conexión? No se puede deshacer.")) return;
    startTransition(async () => {
      await eliminarFasesRival(id);
      window.location.href = "/fases-rival";
    });
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <div className="flex items-center gap-3">
        <button onClick={actualizar} disabled={pending} className="text-xs text-primary hover:underline disabled:opacity-50">
          {pending ? "Actualizando..." : "↻ Actualizar desde Drive"}
        </button>
        <button onClick={eliminar} disabled={pending} className="text-xs text-accent hover:underline disabled:opacity-50">
          Eliminar
        </button>
      </div>
      {error && <p className="text-xs text-accent">{error}</p>}
    </div>
  );
}

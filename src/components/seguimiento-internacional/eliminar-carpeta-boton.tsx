"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { eliminarCarpeta } from "@/lib/seguimiento-internacional-carpetas-actions";

export function EliminarCarpetaBoton({
  carpetaId,
  nombre,
  redirigirALista,
}: {
  carpetaId: string;
  nombre: string;
  /** Si se elimina desde la página de detalle, hay que volver al listado — no queda nada que refrescar ahí. */
  redirigirALista?: boolean;
}) {
  const router = useRouter();
  const [borrando, setBorrando] = useState(false);

  async function handleEliminar() {
    if (!confirm(`¿Eliminar la carpeta "${nombre}"? Se borran todos los jugadores cargados en ella.`)) return;
    setBorrando(true);
    try {
      await eliminarCarpeta(carpetaId);
      if (redirigirALista) {
        router.push("/seguimiento-internacional/carpetas");
      } else {
        router.refresh();
      }
    } finally {
      setBorrando(false);
    }
  }

  return (
    <button
      onClick={handleEliminar}
      disabled={borrando}
      className="text-xs text-foreground/40 hover:text-accent disabled:opacity-50"
    >
      {borrando ? "Eliminando..." : "Eliminar"}
    </button>
  );
}

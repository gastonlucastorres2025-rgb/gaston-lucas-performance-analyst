"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { eliminarPlaylist } from "@/lib/videoanalisis-playlists-actions";

export function EliminarPlaylistBoton({ playlistId, nombre }: { playlistId: string; nombre: string }) {
  const router = useRouter();
  const [borrando, setBorrando] = useState(false);

  async function handleEliminar() {
    if (!confirm(`¿Eliminar la playlist "${nombre}"? Los cortes originales no se borran, solo esta lista.`)) return;
    setBorrando(true);
    try {
      await eliminarPlaylist(playlistId);
      router.refresh();
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

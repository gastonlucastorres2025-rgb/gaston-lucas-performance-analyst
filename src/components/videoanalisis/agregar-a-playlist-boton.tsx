"use client";

import { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  agregarCorteAPlaylist,
  crearPlaylistYAgregarCorte,
  listarPlaylists,
  type PlaylistResumen,
} from "@/lib/videoanalisis-playlists-actions";

const EVENTO_ABRIR = "va-playlist-popover-abrir";

export function AgregarAPlaylistBoton({ accionId }: { accionId: string }) {
  const id = useId();
  const botonRef = useRef<HTMLButtonElement>(null);
  const [abierto, setAbierto] = useState(false);
  const [posicion, setPosicion] = useState({ top: 0, left: 0 });
  const [cargando, setCargando] = useState(false);
  const [playlists, setPlaylists] = useState<PlaylistResumen[] | null>(null);
  const [nuevoNombre, setNuevoNombre] = useState("");
  const [mensaje, setMensaje] = useState<string | null>(null);

  // Solo un popover puede estar abierto a la vez: al abrir uno se avisa a los demás
  // para que se cierren (evita que dos queden superpuestos en listas largas con scroll).
  useEffect(() => {
    function onOtroAbierto(e: Event) {
      const detalle = (e as CustomEvent<string>).detail;
      if (detalle !== id) setAbierto(false);
    }
    window.addEventListener(EVENTO_ABRIR, onOtroAbierto);
    return () => window.removeEventListener(EVENTO_ABRIR, onOtroAbierto);
  }, [id]);

  async function abrir() {
    const yaAbierto = abierto;
    if (!yaAbierto && botonRef.current) {
      const rect = botonRef.current.getBoundingClientRect();
      setPosicion({ top: rect.bottom + 4, left: Math.max(8, rect.right - 256) });
      window.dispatchEvent(new CustomEvent(EVENTO_ABRIR, { detail: id }));
    }
    setAbierto((prev) => !prev);
    setMensaje(null);
    if (!playlists) {
      setCargando(true);
      try {
        setPlaylists(await listarPlaylists());
      } finally {
        setCargando(false);
      }
    }
  }

  async function elegirExistente(playlistId: string) {
    setCargando(true);
    try {
      const res = await agregarCorteAPlaylist(playlistId, accionId);
      setMensaje(res.ok ? "Agregado ✓" : res.error);
      if (res.ok) setTimeout(() => setAbierto(false), 700);
    } finally {
      setCargando(false);
    }
  }

  async function crearYAgregar() {
    if (!nuevoNombre.trim()) return;
    setCargando(true);
    try {
      const res = await crearPlaylistYAgregarCorte(nuevoNombre.trim(), accionId);
      if (res.ok) {
        setMensaje("Agregado ✓");
        setNuevoNombre("");
        setPlaylists(null);
        setTimeout(() => setAbierto(false), 700);
      } else {
        setMensaje(res.error);
      }
    } finally {
      setCargando(false);
    }
  }

  return (
    <div className="inline-block">
      <button
        ref={botonRef}
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          abrir();
        }}
        className="rounded border border-border px-2 py-1 text-xs text-foreground/70 transition-colors hover:border-primary hover:text-primary"
        title="Agregar a playlist"
      >
        + Playlist
      </button>

      {abierto &&
        createPortal(
          <>
            <div className="fixed inset-0 z-40" onClick={(e) => { e.stopPropagation(); setAbierto(false); }} />
            <div
              onClick={(e) => e.stopPropagation()}
              style={{ top: posicion.top, left: posicion.left }}
              className="fixed z-50 w-64 rounded-md border border-border bg-background p-2 shadow-lg"
            >
              {mensaje && <p className="mb-2 text-xs text-foreground/70">{mensaje}</p>}
              {cargando && !playlists ? (
                <p className="px-2 py-1 text-xs text-foreground/50">Cargando...</p>
              ) : (
                <>
                  {playlists && playlists.length > 0 && (
                    <div className="mb-2 max-h-40 space-y-0.5 overflow-y-auto">
                      {playlists.map((p) => (
                        <button
                          key={p.id}
                          type="button"
                          disabled={cargando}
                          onClick={() => elegirExistente(p.id)}
                          className="block w-full rounded px-2 py-1 text-left text-xs text-foreground hover:bg-foreground/5 disabled:opacity-50"
                        >
                          {p.nombre} <span className="text-foreground/40">({p.cantidadCortes})</span>
                        </button>
                      ))}
                    </div>
                  )}
                  {playlists && playlists.length === 0 && (
                    <p className="mb-2 px-2 text-xs text-foreground/50">Todavía no creaste ninguna playlist.</p>
                  )}
                  <div className="flex gap-1 border-t border-border pt-2">
                    <input
                      type="text"
                      value={nuevoNombre}
                      onChange={(e) => setNuevoNombre(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && crearYAgregar()}
                      placeholder="Nueva playlist..."
                      className="min-w-0 flex-1 rounded border border-border px-2 py-1 text-xs focus:border-primary focus:outline-none"
                    />
                    <button
                      type="button"
                      disabled={cargando || !nuevoNombre.trim()}
                      onClick={crearYAgregar}
                      className="shrink-0 rounded bg-primary px-2 py-1 text-xs text-white disabled:opacity-50"
                    >
                      Crear
                    </button>
                  </div>
                </>
              )}
            </div>
          </>,
          document.body,
        )}
    </div>
  );
}

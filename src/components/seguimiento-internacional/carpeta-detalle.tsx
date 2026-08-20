"use client";

import Link from "next/link";
import { useState } from "react";
import { CarpetaPdfButton } from "@/components/seguimiento-internacional/carpeta-pdf-button";
import { EliminarCarpetaBoton } from "@/components/seguimiento-internacional/eliminar-carpeta-boton";
import {
  actualizarJugadorDeCarpeta,
  actualizarLinksDeJugador,
  agregarJugadorACarpeta,
  eliminarJugadorDeCarpeta,
  renombrarCarpeta,
} from "@/lib/seguimiento-internacional-carpetas-actions";

export type JugadorDeCarpeta = { id: string; nombre: string; notas: string; videoLinks: string[] };

export function CarpetaDetalle({
  carpetaId,
  nombreInicial,
  jugadoresIniciales,
}: {
  carpetaId: string;
  nombreInicial: string;
  jugadoresIniciales: JugadorDeCarpeta[];
}) {
  const [nombre, setNombre] = useState(nombreInicial);
  const [editandoNombre, setEditandoNombre] = useState(false);
  const [jugadores, setJugadores] = useState(jugadoresIniciales);
  const [agregandoJugador, setAgregandoJugador] = useState(false);

  async function handleGuardarNombre() {
    setEditandoNombre(false);
    if (nombre.trim() && nombre.trim() !== nombreInicial) {
      await renombrarCarpeta(carpetaId, nombre);
    }
  }

  async function handleAgregarJugador() {
    setAgregandoJugador(true);
    try {
      const result = await agregarJugadorACarpeta(carpetaId, "Jugador nuevo");
      if (result.ok) {
        setJugadores((prev) => [...prev, { id: result.id, nombre: "Jugador nuevo", notas: "", videoLinks: [] }]);
      }
    } finally {
      setAgregandoJugador(false);
    }
  }

  async function handleQuitarJugador(jugadorId: string) {
    if (!confirm("¿Quitar este jugador de la carpeta?")) return;
    setJugadores((prev) => prev.filter((j) => j.id !== jugadorId));
    await eliminarJugadorDeCarpeta(jugadorId, carpetaId);
  }

  function actualizarJugadorLocal(jugadorId: string, cambios: Partial<JugadorDeCarpeta>) {
    setJugadores((prev) => prev.map((j) => (j.id === jugadorId ? { ...j, ...cambios } : j)));
  }

  return (
    <div>
      <div className="mb-6 flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <Link href="/seguimiento-internacional/carpetas" className="text-xs text-foreground/50 hover:text-primary">
            ← Carpetas
          </Link>
          {editandoNombre ? (
            <input
              autoFocus
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              onBlur={handleGuardarNombre}
              onKeyDown={(e) => e.key === "Enter" && (e.currentTarget as HTMLInputElement).blur()}
              className="mt-1 block w-full max-w-md rounded border border-primary px-2 py-1 text-xl font-semibold focus:outline-none"
            />
          ) : (
            <h1
              onClick={() => setEditandoNombre(true)}
              className="mt-1 cursor-text text-xl font-semibold tracking-tight text-foreground hover:text-primary"
              title="Tocar para renombrar"
            >
              {nombre}
            </h1>
          )}
          <p className="mt-1 text-xs text-foreground/50">
            {jugadores.length} {jugadores.length === 1 ? "jugador" : "jugadores"}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-3">
          <CarpetaPdfButton carpetaNombre={nombre} jugadores={jugadores} />
          <EliminarCarpetaBoton carpetaId={carpetaId} nombre={nombre} redirigirALista />
        </div>
      </div>

      <div className="space-y-4">
        {jugadores.map((j) => (
          <JugadorCard
            key={j.id}
            carpetaId={carpetaId}
            jugador={j}
            onCambiar={(cambios) => actualizarJugadorLocal(j.id, cambios)}
            onQuitar={() => handleQuitarJugador(j.id)}
          />
        ))}
      </div>

      <button
        onClick={handleAgregarJugador}
        disabled={agregandoJugador}
        className="mt-4 rounded-lg border border-dashed border-border px-4 py-3 text-sm font-medium text-foreground/60 transition-colors hover:border-primary hover:text-primary disabled:opacity-50"
      >
        {agregandoJugador ? "Agregando..." : "+ Agregar jugador"}
      </button>
    </div>
  );
}

function JugadorCard({
  carpetaId,
  jugador,
  onCambiar,
  onQuitar,
}: {
  carpetaId: string;
  jugador: JugadorDeCarpeta;
  onCambiar: (cambios: Partial<JugadorDeCarpeta>) => void;
  onQuitar: () => void;
}) {
  const [nombreLocal, setNombreLocal] = useState(jugador.nombre);
  const [notasLocal, setNotasLocal] = useState(jugador.notas);
  const [linkValor, setLinkValor] = useState("");
  const [linkError, setLinkError] = useState<string | null>(null);
  const [agregandoLink, setAgregandoLink] = useState(false);

  async function handleGuardarNombre() {
    if (nombreLocal.trim() === jugador.nombre) return;
    onCambiar({ nombre: nombreLocal.trim() || "Jugador sin nombre" });
    await actualizarJugadorDeCarpeta(jugador.id, carpetaId, { nombreJugador: nombreLocal });
  }

  async function handleGuardarNotas() {
    if (notasLocal === jugador.notas) return;
    onCambiar({ notas: notasLocal });
    await actualizarJugadorDeCarpeta(jugador.id, carpetaId, { notas: notasLocal });
  }

  async function handleAgregarLink(urlOverride?: string) {
    const url = (urlOverride ?? linkValor).trim();
    setLinkError(null);
    if (!url) return;
    if (!/^https?:\/\//i.test(url)) {
      setLinkError("El link tiene que empezar con http:// o https://");
      return;
    }
    const nuevosLinks = [...jugador.videoLinks, url];
    setAgregandoLink(true);
    try {
      const result = await actualizarLinksDeJugador(jugador.id, carpetaId, nuevosLinks);
      if (!result.ok) {
        setLinkError(result.error);
        return;
      }
      onCambiar({ videoLinks: nuevosLinks });
      setLinkValor("");
    } catch {
      // Si el server action falla de forma inesperada (ej. corte de red), no lo dejamos pasar en
      // silencio: antes esto se perdía sin avisar y el link nunca quedaba guardado.
      setLinkError("No se pudo guardar el link. Probá de nuevo.");
    } finally {
      setAgregandoLink(false);
    }
  }

  async function handleQuitarLink(url: string) {
    const nuevosLinks = jugador.videoLinks.filter((u) => u !== url);
    onCambiar({ videoLinks: nuevosLinks });
    try {
      const result = await actualizarLinksDeJugador(jugador.id, carpetaId, nuevosLinks);
      if (!result.ok) setLinkError(result.error);
    } catch {
      setLinkError("No se pudo quitar el link. Probá de nuevo.");
    }
  }

  return (
    <div className="rounded-lg border border-border p-4">
      <div className="flex items-start justify-between gap-3">
        <input
          value={nombreLocal}
          onChange={(e) => setNombreLocal(e.target.value)}
          onBlur={handleGuardarNombre}
          placeholder="Nombre del jugador rival"
          className="flex-1 rounded border border-transparent px-2 py-1 text-base font-semibold text-foreground hover:border-border focus:border-primary focus:outline-none"
        />
        <button onClick={onQuitar} className="shrink-0 text-xs text-foreground/40 hover:text-accent">
          Quitar
        </button>
      </div>

      <div className="mt-2">
        <label className="text-xs text-foreground/70">Características</label>
        <textarea
          value={notasLocal}
          onChange={(e) => setNotasLocal(e.target.value)}
          onBlur={handleGuardarNotas}
          placeholder="Perfil, fortalezas, debilidades, cómo enfrentarlo..."
          rows={3}
          className="mt-1 w-full rounded border border-border px-3 py-2 text-sm focus:border-primary focus:outline-none"
        />
      </div>

      <div className="mt-2">
        <label className="text-xs text-foreground/70">Videos (Drive u otro link)</label>
        {jugador.videoLinks.length > 0 && (
          <div className="mt-1 space-y-1">
            {jugador.videoLinks.map((url) => (
              <div key={url} className="flex items-center gap-2 rounded border border-border px-2 py-1">
                <span className="truncate text-xs text-foreground/70">🎬 {url}</span>
                <button
                  onClick={() => handleQuitarLink(url)}
                  className="ml-auto shrink-0 text-xs text-foreground/40 hover:text-accent"
                  title="Quitar link"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        )}
        <div className="mt-1.5 flex gap-1.5">
          <input
            type="url"
            value={linkValor}
            onChange={(e) => setLinkValor(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), handleAgregarLink())}
            // Pegar el link ya lo agrega solo — no hace falta tocar el botón. Pedido explícito del
            // usuario en otra parte de la app (paste → se agrega solo, sin pasos extra).
            onPaste={(e) => {
              const pegado = e.clipboardData.getData("text").trim();
              if (/^https?:\/\//i.test(pegado)) {
                e.preventDefault();
                handleAgregarLink(pegado);
              }
            }}
            placeholder="https://drive.google.com/..."
            className="flex-1 rounded border border-border px-2 py-1 text-xs focus:border-primary focus:outline-none"
          />
          <button
            onClick={() => handleAgregarLink()}
            disabled={agregandoLink || !linkValor.trim()}
            className="shrink-0 rounded-full border border-border px-3 py-1 text-xs font-medium text-foreground/60 transition-colors hover:bg-primary/5 disabled:opacity-50"
          >
            + Agregar link
          </button>
        </div>
        <p className="mt-1 text-[10px] text-foreground/40">
          Pegá el link y se agrega solo — si lo escribís a mano, tocá &quot;+ Agregar link&quot; o Enter para guardarlo.
        </p>
        {linkError && <p className="mt-1 text-xs text-accent">{linkError}</p>}
      </div>
    </div>
  );
}

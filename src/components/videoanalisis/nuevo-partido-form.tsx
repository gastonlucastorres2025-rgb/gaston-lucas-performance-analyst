"use client";

import { useActionState, useMemo, useState } from "react";
import { crearPartidoVA, type CrearPartidoVAState } from "@/lib/videoanalisis-actions";

const estadoInicial: CrearPartidoVAState = { error: null };

type LogoCompetencia = { nombre: string; logoUrl: string };

export function NuevoPartidoForm({
  clubes,
  logosCompetencia,
}: {
  clubes: string[];
  logosCompetencia: LogoCompetencia[];
}) {
  const [state, formAction, pending] = useActionState(crearPartidoVA, estadoInicial);
  const [rival, setRival] = useState("");
  const [competencia, setCompetencia] = useState("");

  const logoExistente = useMemo(
    () => logosCompetencia.find((l) => l.nombre.trim().toLowerCase() === competencia.trim().toLowerCase()),
    [logosCompetencia, competencia],
  );

  return (
    <form action={formAction} className="flex max-w-xl flex-col gap-4">
      <div className="grid grid-cols-2 gap-4">
        <label className="flex flex-col gap-1">
          <span className="text-xs font-medium text-foreground/50">Fecha</span>
          <input
            type="date"
            name="fecha"
            required
            className="rounded border border-border px-3 py-2 text-sm focus:border-primary focus:outline-none"
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-xs font-medium text-foreground/50">Rival</span>
          <select
            name="rival"
            required
            value={rival}
            onChange={(e) => setRival(e.target.value)}
            className="rounded border border-border px-3 py-2 text-sm focus:border-primary focus:outline-none"
          >
            <option value="" disabled>
              Elegí un club
            </option>
            {clubes.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
            <option value="__otro__">Otro (escribir)</option>
          </select>
        </label>
      </div>

      {rival === "__otro__" && (
        <label className="flex flex-col gap-1">
          <span className="text-xs font-medium text-foreground/50">Nombre del rival</span>
          <input
            type="text"
            name="rival_otro"
            required
            placeholder="Ej: River Plate (Argentina)"
            className="rounded border border-border px-3 py-2 text-sm focus:border-primary focus:outline-none"
          />
        </label>
      )}

      <div className="grid grid-cols-2 gap-4">
        <label className="flex flex-col gap-1">
          <span className="text-xs font-medium text-foreground/50">Competencia</span>
          <input
            type="text"
            name="competencia"
            list="competencias-existentes"
            value={competencia}
            onChange={(e) => setCompetencia(e.target.value)}
            placeholder="Torneo Intermedio"
            className="rounded border border-border px-3 py-2 text-sm focus:border-primary focus:outline-none"
          />
          <datalist id="competencias-existentes">
            {logosCompetencia.map((l) => (
              <option key={l.nombre} value={l.nombre} />
            ))}
          </datalist>
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-xs font-medium text-foreground/50">Categoría</span>
          <input
            type="text"
            name="categoria"
            placeholder="Primera"
            className="rounded border border-border px-3 py-2 text-sm focus:border-primary focus:outline-none"
          />
        </label>
      </div>

      {competencia.trim() && (
        <div className="flex items-center gap-3 rounded-md border border-border bg-surface px-3 py-2">
          {logoExistente ? (
            <>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={logoExistente.logoUrl} alt="" width={28} height={28} className="shrink-0 object-contain" />
              <p className="text-xs text-foreground/50">
                Ya hay un logo guardado para <strong>{logoExistente.nombre}</strong>, se va a usar automáticamente.
              </p>
            </>
          ) : (
            <label className="flex w-full flex-col gap-1">
              <span className="text-xs font-medium text-foreground/50">
                Logo de &quot;{competencia}&quot; (opcional, se reutiliza en los próximos partidos con este nombre)
              </span>
              <input
                // key=competencia: si el usuario cambia el nombre de la competencia (ej. después de
                // corregir un typo o de un error de validación que no cerró el formulario), el input
                // de archivo se remonta y pierde cualquier logo que hubiera quedado seleccionado de un
                // intento anterior — si no, un logo elegido para "Torneo Apertura" podía reenviarse por
                // error bajo un nombre de competencia distinto (bug real encontrado: "Torneo Intermedio"
                // y "Torneo Intermdio" quedaron con el logo de Apertura).
                key={competencia}
                type="file"
                name="competencia_logo"
                accept="image/*"
                className="text-sm file:mr-3 file:rounded file:border-0 file:bg-primary/10 file:px-3 file:py-1 file:text-xs file:font-medium file:text-primary"
              />
            </label>
          )}
        </div>
      )}

      <div className="grid grid-cols-3 gap-4">
        <label className="flex flex-col gap-1">
          <span className="text-xs font-medium text-foreground/50">Condición</span>
          <select
            name="condicion"
            className="rounded border border-border px-3 py-2 text-sm focus:border-primary focus:outline-none"
          >
            <option value="local">Local</option>
            <option value="visitante">Visitante</option>
          </select>
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-xs font-medium text-foreground/50">Goles a favor</span>
          <input
            type="number"
            name="goles_favor"
            min={0}
            className="rounded border border-border px-3 py-2 text-sm focus:border-primary focus:outline-none"
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-xs font-medium text-foreground/50">Goles en contra</span>
          <input
            type="number"
            name="goles_contra"
            min={0}
            className="rounded border border-border px-3 py-2 text-sm focus:border-primary focus:outline-none"
          />
        </label>
      </div>

      <label className="flex flex-col gap-1">
        <span className="text-xs font-medium text-foreground/50">Link de YouTube</span>
        <input
          type="text"
          name="youtube"
          required
          placeholder="https://youtu.be/..."
          className="rounded border border-border px-3 py-2 text-sm focus:border-primary focus:outline-none"
        />
      </label>

      <label className="flex flex-col gap-1">
        <span className="text-xs font-medium text-foreground/50">XML de Nacsport / Angles</span>
        <input
          type="file"
          name="xml"
          accept=".xml"
          required
          className="rounded border border-border px-3 py-2 text-sm file:mr-3 file:rounded file:border-0 file:bg-primary/10 file:px-3 file:py-1 file:text-xs file:font-medium file:text-primary"
        />
      </label>

      {state.error && <p className="text-sm text-accent">{state.error}</p>}

      <button
        type="submit"
        disabled={pending}
        className="self-start rounded-md bg-primary px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-primary-dark disabled:opacity-50"
      >
        {pending ? "Procesando XML..." : "Crear partido"}
      </button>
    </form>
  );
}

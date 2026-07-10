"use client";

import { useActionState } from "react";
import { PageHeader } from "@/components/page-header";
import { crearPartidoVA, type CrearPartidoVAState } from "@/lib/videoanalisis-actions";

const estadoInicial: CrearPartidoVAState = { error: null };

export default function NuevoPartidoVAPage() {
  const [state, formAction, pending] = useActionState(crearPartidoVA, estadoInicial);

  return (
    <div>
      <PageHeader title="Nuevo partido" description="Cargá el video de YouTube y el XML exportado de Nacsport." />

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
            <input
              type="text"
              name="rival"
              required
              className="rounded border border-border px-3 py-2 text-sm focus:border-primary focus:outline-none"
            />
          </label>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <label className="flex flex-col gap-1">
            <span className="text-xs font-medium text-foreground/50">Competencia</span>
            <input
              type="text"
              name="competencia"
              placeholder="Torneo Intermedio"
              className="rounded border border-border px-3 py-2 text-sm focus:border-primary focus:outline-none"
            />
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
          <span className="text-xs font-medium text-foreground/50">XML de Nacsport</span>
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
    </div>
  );
}

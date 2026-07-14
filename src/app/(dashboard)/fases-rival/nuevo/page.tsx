"use client";

import { useActionState } from "react";
import { PageHeader } from "@/components/page-header";
import { crearFasesRival, type CrearFasesRivalState } from "@/lib/fases-rival-actions";

const estadoInicial: CrearFasesRivalState = { error: null };

export default function NuevaCarpetaFasesRivalPage() {
  const [state, formAction, pending] = useActionState(crearFasesRival, estadoInicial);

  return (
    <div>
      <PageHeader
        title="Conectar carpeta de Drive"
        description={
          'Pegá el link de la carpeta del rival (ej: "Danubio - Fecha 5"), la que tiene un video por fase adentro.'
        }
      />

      <form action={formAction} className="flex max-w-xl flex-col gap-4">
        <label className="flex flex-col gap-1">
          <span className="text-xs font-medium text-foreground/50">Link de la carpeta de Drive</span>
          <input
            type="text"
            name="carpeta_url"
            required
            placeholder="https://drive.google.com/drive/folders/..."
            className="rounded border border-border px-3 py-2 text-sm focus:border-primary focus:outline-none"
          />
        </label>

        {state.error && <p className="text-sm text-accent">{state.error}</p>}

        <button
          type="submit"
          disabled={pending}
          className="self-start rounded-md bg-primary px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-primary-dark disabled:opacity-50"
        >
          {pending ? "Leyendo carpeta..." : "Conectar"}
        </button>
      </form>
    </div>
  );
}

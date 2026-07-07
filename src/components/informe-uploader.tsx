"use client";

import { useActionState, useRef } from "react";
import { subirInforme, type SubirInformeState } from "@/lib/informes-actions";

const initialState: SubirInformeState = { error: null, success: false };

export function InformeUploader({ tipo }: { tipo: "informe_rival" | "plan_partido" }) {
  const [state, formAction, pending] = useActionState(subirInforme, initialState);
  const formRef = useRef<HTMLFormElement>(null);

  return (
    <form
      ref={formRef}
      action={async (formData) => {
        await formAction(formData);
        formRef.current?.reset();
      }}
      className="mb-6 flex flex-wrap items-end gap-3 rounded-lg border border-border bg-surface p-4"
    >
      <input type="hidden" name="tipo" value={tipo} />

      <div className="flex flex-col gap-1">
        <label className="text-xs font-medium text-foreground/60">Título</label>
        <input
          name="titulo"
          required
          placeholder={tipo === "informe_rival" ? "Informe de Rival - ..." : "Plan de Partido - ..."}
          className="rounded border border-border px-2 py-1.5 text-sm"
        />
      </div>

      {tipo === "informe_rival" && (
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-foreground/60">Rival</label>
          <input name="rival" className="rounded border border-border px-2 py-1.5 text-sm" />
        </div>
      )}

      <div className="flex flex-col gap-1">
        <label className="text-xs font-medium text-foreground/60">Fecha</label>
        <input
          type="date"
          name="fecha"
          className="rounded border border-border px-2 py-1.5 text-sm"
        />
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-xs font-medium text-foreground/60">Archivo PDF</label>
        <input
          type="file"
          name="file"
          accept="application/pdf"
          required
          className="text-sm"
        />
      </div>

      <button
        type="submit"
        disabled={pending}
        className="rounded bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-dark disabled:opacity-50"
      >
        {pending ? "Subiendo..." : "Subir informe"}
      </button>

      {state.error && <p className="w-full text-sm text-accent">{state.error}</p>}
      {state.success && !pending && (
        <p className="w-full text-sm text-primary">Informe subido correctamente.</p>
      )}
    </form>
  );
}

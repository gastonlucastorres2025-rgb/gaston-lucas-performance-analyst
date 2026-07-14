"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { type Evaluacion, type InformePostPartidoData } from "@/lib/informes-post-partido-types";
import { guardarInformePostPartido, eliminarInformePostPartido } from "@/lib/informes-post-partido-actions";

const inputClase = "rounded border border-border px-3 py-2 text-sm focus:border-primary focus:outline-none";
const labelClase = "text-xs font-medium text-foreground/50";

function SelectorEvaluacion({
  label,
  value,
  onChange,
}: {
  label: string;
  value: Evaluacion;
  onChange: (v: Evaluacion) => void;
}) {
  return (
    <label className="flex flex-col gap-1">
      <span className={labelClase}>{label}</span>
      <select className={inputClase} value={value} onChange={(e) => onChange(e.target.value as Evaluacion)}>
        <option value="">Sin definir</option>
        <option value="si">Sí</option>
        <option value="parcial">Parcialmente</option>
        <option value="no">No</option>
      </select>
    </label>
  );
}

export function InformePostPartidoEditor({ id, informeInicial }: { id: string; informeInicial: InformePostPartidoData }) {
  const [informe, setInforme] = useState(informeInicial);
  const [estadoGuardado, setEstadoGuardado] = useState<"idle" | "guardando" | "guardado">("idle");
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  function actualizar(next: InformePostPartidoData) {
    setInforme(next);
    setEstadoGuardado("guardando");
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(async () => {
      await guardarInformePostPartido(id, next);
      setEstadoGuardado("guardado");
    }, 700);
  }

  async function eliminar() {
    if (!confirm("¿Eliminar este informe? No se puede deshacer.")) return;
    await eliminarInformePostPartido(id);
    window.location.href = "/informes-post-partido";
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <Link href="/informes-post-partido" className="text-xs text-foreground/50 hover:text-primary">
            ← Volver a Informe Post Partido
          </Link>
          <h1 className="mt-1 text-xl font-semibold">{informe.rival || "Nuevo informe"}</h1>
        </div>
        <div className="flex shrink-0 items-center gap-3">
          <span className="text-xs text-foreground/40">
            {estadoGuardado === "guardando" ? "Guardando..." : estadoGuardado === "guardado" ? "Guardado" : ""}
          </span>
          <button onClick={eliminar} className="text-xs text-accent hover:underline">
            Eliminar
          </button>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-surface p-6">
        <div className="grid grid-cols-2 gap-4">
          <label className="flex flex-col gap-1">
            <span className={labelClase}>Rival</span>
            <input
              type="text"
              className={inputClase}
              value={informe.rival}
              onChange={(e) => actualizar({ ...informe, rival: e.target.value })}
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className={labelClase}>Fecha del partido</span>
            <input
              type="date"
              className={inputClase}
              value={informe.fecha ?? ""}
              onChange={(e) => actualizar({ ...informe, fecha: e.target.value || null })}
            />
          </label>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-4">
          <label className="flex flex-col gap-1">
            <span className={labelClase}>Resultado</span>
            <input
              type="text"
              placeholder="2-1"
              className={inputClase}
              value={informe.resultado}
              onChange={(e) => actualizar({ ...informe, resultado: e.target.value })}
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className={labelClase}>Competencia</span>
            <input
              type="text"
              placeholder="Torneo Intermedio"
              className={inputClase}
              value={informe.competencia}
              onChange={(e) => actualizar({ ...informe, competencia: e.target.value })}
            />
          </label>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-surface p-6">
        <h2 className="mb-3 text-sm font-semibold text-primary">¿Salió el plan?</h2>
        <SelectorEvaluacion
          label="Evaluación"
          value={informe.plan_funciono}
          onChange={(v) => actualizar({ ...informe, plan_funciono: v })}
        />
        <label className="mt-3 flex flex-col gap-1">
          <span className={labelClase}>Comentario</span>
          <textarea
            className={`${inputClase} min-h-[90px] resize-y`}
            placeholder="¿Se pudo llevar adelante lo planificado? ¿Qué funcionó y qué no?"
            value={informe.plan_comentario}
            onChange={(e) => actualizar({ ...informe, plan_comentario: e.target.value })}
          />
        </label>
      </div>

      <div className="rounded-xl border border-border bg-surface p-6">
        <h2 className="mb-3 text-sm font-semibold text-primary">¿El análisis previo fue acertado?</h2>
        <SelectorEvaluacion
          label="Evaluación"
          value={informe.analisis_acertado}
          onChange={(v) => actualizar({ ...informe, analisis_acertado: v })}
        />
        <label className="mt-3 flex flex-col gap-1">
          <span className={labelClase}>Comentario</span>
          <textarea
            className={`${inputClase} min-h-[90px] resize-y`}
            placeholder="¿El rival se comportó como esperábamos en el Plan de Partido? ¿Qué patrón se confirmó o no?"
            value={informe.analisis_comentario}
            onChange={(e) => actualizar({ ...informe, analisis_comentario: e.target.value })}
          />
        </label>
      </div>

      <div className="rounded-xl border border-border bg-surface p-6">
        <h2 className="mb-3 text-sm font-semibold text-primary">Conclusiones generales</h2>
        <textarea
          className={`${inputClase} min-h-[120px] resize-y`}
          placeholder="Balance general del partido, para tener en cuenta de cara al próximo cruce con este rival."
          value={informe.conclusiones_generales}
          onChange={(e) => actualizar({ ...informe, conclusiones_generales: e.target.value })}
        />
      </div>
    </div>
  );
}

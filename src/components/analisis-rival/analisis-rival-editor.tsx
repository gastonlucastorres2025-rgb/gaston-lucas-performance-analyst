"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  ROLES,
  SECCIONES_SIMPLES,
  FUENTE_HELP,
  faseVacia,
  patronVacio,
  type AnalisisRivalData,
  type SeccionSimpleId,
} from "@/lib/analisis-rival-types";
import { generarTextoPlan } from "@/lib/analisis-rival-texto";
import { guardarAnalisisRival, eliminarAnalisisRival } from "@/lib/analisis-rival-actions";
import { AnalisisRivalPdfButton } from "@/components/analisis-rival/analisis-rival-pdf-button";

type SeccionId = "general" | "fuentesGlobal" | "estructuraBase" | SeccionSimpleId | "patrones" | "claves" | "preview";

const NAV: { id: SeccionId; titulo: string }[] = [
  { id: "general", titulo: "Datos generales" },
  { id: "fuentesGlobal", titulo: "Fuentes de datos" },
  { id: "estructuraBase", titulo: "Estructura base" },
  { id: "fase_ofensiva", titulo: "Fase ofensiva" },
  { id: "transiciones_ofensivas", titulo: "Transiciones ofensivas" },
  { id: "transiciones_defensivas", titulo: "Transiciones defensivas" },
  { id: "presion_zona3", titulo: "Presión zona 3" },
  { id: "zona21", titulo: "Zona 2 / Zona 1" },
  { id: "patrones", titulo: "Patrones puntuales" },
  { id: "abp_ofensivas", titulo: "ABP ofensivas" },
  { id: "abp_defensivas", titulo: "ABP defensivas" },
  { id: "claves", titulo: "Claves del partido" },
  { id: "preview", titulo: "Vista previa y exportar" },
];

function seccionCompleta(plan: AnalisisRivalData, id: SeccionId): boolean {
  if (id === "general") return !!(plan.rival && plan.fecha);
  if (id === "fuentesGlobal") return !!plan.fuentes_globales.trim();
  if (id === "estructuraBase") return plan.estructura_base.some((f) => f.nombre && f.formacion);
  if (id === "patrones") return plan.patrones.some((p) => p.etiqueta && p.descripcion);
  if (id === "claves") return plan.claves.some((c) => c.trim());
  if (id === "preview") return true;
  return !!plan[id].conclusion.trim();
}

export function AnalisisRivalEditor({ id, planInicial }: { id: string; planInicial: AnalisisRivalData }) {
  const [plan, setPlan] = useState(planInicial);
  const [paso, setPaso] = useState(0);
  const [estadoGuardado, setEstadoGuardado] = useState<"idle" | "guardando" | "guardado">("idle");
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  function actualizarPlan(next: AnalisisRivalData) {
    setPlan(next);
    setEstadoGuardado("guardando");
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(async () => {
      await guardarAnalisisRival(id, next);
      setEstadoGuardado("guardado");
    }, 700);
  }

  async function eliminar() {
    if (!confirm("¿Eliminar este análisis? No se puede deshacer.")) return;
    await eliminarAnalisisRival(id);
    window.location.href = "/analisis-rival";
  }

  const seccion = NAV[paso];

  return (
    <div className="flex min-h-[70vh] flex-col gap-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <Link href="/analisis-rival" className="text-xs text-foreground/50 hover:text-primary">
            ← Volver a Análisis de Rival
          </Link>
          <h1 className="mt-1 text-xl font-semibold">
            {plan.rival || "Nuevo análisis"} {plan.fecha ? `· ${plan.fecha}` : ""}
          </h1>
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

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[220px_1fr]">
        <nav className="flex flex-col gap-0.5 self-start rounded-xl border border-border bg-surface p-2">
          {NAV.map((s, i) => (
            <button
              key={s.id}
              onClick={() => setPaso(i)}
              className={`flex items-center gap-2 rounded-md border-l-2 px-3 py-2 text-left text-sm transition-colors ${
                i === paso
                  ? "border-primary bg-primary/5 font-medium text-primary"
                  : "border-transparent text-foreground/70 hover:bg-foreground/5"
              }`}
            >
              <span
                className="h-1.5 w-1.5 shrink-0 rounded-full"
                style={{ backgroundColor: seccionCompleta(plan, s.id) ? "#1f9d55" : "var(--border)" }}
              />
              <span className="min-w-0 truncate">{s.titulo}</span>
            </button>
          ))}
        </nav>

        <div className="rounded-xl border border-border bg-surface p-6">
          {seccion.id === "general" && <SeccionGeneral plan={plan} onChange={actualizarPlan} />}
          {seccion.id === "fuentesGlobal" && <SeccionFuentesGlobal plan={plan} onChange={actualizarPlan} />}
          {seccion.id === "estructuraBase" && <SeccionEstructuraBase plan={plan} onChange={actualizarPlan} />}
          {(
            [
              "fase_ofensiva",
              "transiciones_ofensivas",
              "transiciones_defensivas",
              "presion_zona3",
              "zona21",
              "abp_ofensivas",
              "abp_defensivas",
            ] as SeccionSimpleId[]
          ).includes(seccion.id as SeccionSimpleId) && (
            <SeccionSimpleForm plan={plan} onChange={actualizarPlan} id={seccion.id as SeccionSimpleId} />
          )}
          {seccion.id === "patrones" && <SeccionPatrones plan={plan} onChange={actualizarPlan} />}
          {seccion.id === "claves" && <SeccionClaves plan={plan} onChange={actualizarPlan} />}
          {seccion.id === "preview" && <SeccionPreview plan={plan} id={id} />}

          <div className="mt-6 flex items-center justify-between border-t border-border pt-4">
            <button
              onClick={() => setPaso(Math.max(0, paso - 1))}
              className={`text-sm text-foreground/60 hover:text-primary ${paso === 0 ? "invisible" : ""}`}
            >
              ← Anterior
            </button>
            <button
              onClick={() => setPaso(Math.min(NAV.length - 1, paso + 1))}
              className={`text-sm font-medium text-primary hover:underline ${paso === NAV.length - 1 ? "invisible" : ""}`}
            >
              Siguiente →
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

const inputClase = "rounded border border-border px-3 py-2 text-sm focus:border-primary focus:outline-none";
const labelClase = "text-xs font-medium text-foreground/50";
const btnFantasma =
  "rounded border border-primary px-3 py-1.5 text-xs font-medium text-primary transition-colors hover:bg-primary/5";
const btnQuitar = "text-xs font-medium text-accent hover:underline";

function SeccionGeneral({
  plan,
  onChange,
}: {
  plan: AnalisisRivalData;
  onChange: (p: AnalisisRivalData) => void;
}) {
  return (
    <div className="flex flex-col gap-4">
      <div>
        <h2 className="text-lg font-semibold text-primary">Datos generales</h2>
        <p className="text-sm text-foreground/50">Información del rival y del partido que se va a analizar.</p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <label className="flex flex-col gap-1">
          <span className={labelClase}>Rival</span>
          <input
            type="text"
            className={inputClase}
            value={plan.rival}
            onChange={(e) => onChange({ ...plan, rival: e.target.value })}
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className={labelClase}>Fecha del partido</span>
          <input
            type="date"
            className={inputClase}
            value={plan.fecha ?? ""}
            onChange={(e) => onChange({ ...plan, fecha: e.target.value || null })}
          />
        </label>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <label className="flex flex-col gap-1">
          <span className={labelClase}>Cancha</span>
          <input
            type="text"
            className={inputClase}
            value={plan.cancha}
            onChange={(e) => onChange({ ...plan, cancha: e.target.value })}
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className={labelClase}>Tipo de partido</span>
          <input
            type="text"
            placeholder="Amistoso / Torneo / Copa"
            className={inputClase}
            value={plan.tipo_partido}
            onChange={(e) => onChange({ ...plan, tipo_partido: e.target.value })}
          />
        </label>
      </div>
      <label className="flex flex-col gap-1">
        <span className={labelClase}>Analista</span>
        <input
          type="text"
          className={inputClase}
          value={plan.analista}
          onChange={(e) => onChange({ ...plan, analista: e.target.value })}
        />
      </label>

      <div className="mt-2 rounded-lg border border-border p-4">
        <h3 className="mb-1 text-sm font-semibold">Partidos del rival analizados</h3>
        <p className="mb-3 rounded-md bg-background px-3 py-2 text-xs text-foreground/60">
          Cargar como mínimo 3 partidos recientes del rival (fecha, rival de ese partido, resultado) para poder confirmar
          que los patrones se repiten.
        </p>
        <div className="flex flex-col gap-3">
          {plan.partidos_analizados.map((p, i) => (
            <div key={i} className="rounded-md border border-dashed border-border p-3">
              <div className="grid grid-cols-3 gap-3">
                <label className="flex flex-col gap-1">
                  <span className={labelClase}>Fecha</span>
                  <input
                    type="text"
                    placeholder="dd/mm/aaaa"
                    className={inputClase}
                    value={p.fecha}
                    onChange={(e) => {
                      const partidos = [...plan.partidos_analizados];
                      partidos[i] = { ...partidos[i], fecha: e.target.value };
                      onChange({ ...plan, partidos_analizados: partidos });
                    }}
                  />
                </label>
                <label className="flex flex-col gap-1">
                  <span className={labelClase}>Rival de ese partido</span>
                  <input
                    type="text"
                    className={inputClase}
                    value={p.rival}
                    onChange={(e) => {
                      const partidos = [...plan.partidos_analizados];
                      partidos[i] = { ...partidos[i], rival: e.target.value };
                      onChange({ ...plan, partidos_analizados: partidos });
                    }}
                  />
                </label>
                <label className="flex flex-col gap-1">
                  <span className={labelClase}>Resultado</span>
                  <input
                    type="text"
                    className={inputClase}
                    value={p.resultado}
                    onChange={(e) => {
                      const partidos = [...plan.partidos_analizados];
                      partidos[i] = { ...partidos[i], resultado: e.target.value };
                      onChange({ ...plan, partidos_analizados: partidos });
                    }}
                  />
                </label>
              </div>
              {plan.partidos_analizados.length > 1 && (
                <button
                  className={`${btnQuitar} mt-2`}
                  onClick={() =>
                    onChange({
                      ...plan,
                      partidos_analizados: plan.partidos_analizados.filter((_, j) => j !== i),
                    })
                  }
                >
                  Quitar
                </button>
              )}
            </div>
          ))}
          <button
            className={`${btnFantasma} self-start`}
            onClick={() =>
              onChange({ ...plan, partidos_analizados: [...plan.partidos_analizados, { fecha: "", rival: "", resultado: "" }] })
            }
          >
            + Agregar partido
          </button>
        </div>
      </div>
    </div>
  );
}

function SeccionFuentesGlobal({ plan, onChange }: { plan: AnalisisRivalData; onChange: (p: AnalisisRivalData) => void }) {
  return (
    <div className="flex flex-col gap-3">
      <div>
        <h2 className="text-lg font-semibold text-primary">Fuentes de datos</h2>
        <p className="text-sm text-foreground/50">
          Pegá acá todo lo que tengas del rival (exports de Wyscout, etiquetas/clips de SICS, notas de video). Después
          repartilo o resumilo en cada sección del plan.
        </p>
      </div>
      <textarea
        className={`${inputClase} min-h-[220px] resize-y`}
        placeholder="Pegar acá todo lo que tengas del rival: exports de Wyscout, etiquetas de SICS, notas de video."
        value={plan.fuentes_globales}
        onChange={(e) => onChange({ ...plan, fuentes_globales: e.target.value })}
      />
    </div>
  );
}

function SeccionEstructuraBase({ plan, onChange }: { plan: AnalisisRivalData; onChange: (p: AnalisisRivalData) => void }) {
  return (
    <div className="flex flex-col gap-4">
      <div>
        <h2 className="text-lg font-semibold text-primary">Estructura base</h2>
        <p className="text-sm text-foreground/50">
          Identificar 2-3 formaciones/fases distintas según el momento del partido (ej: presión alta, bloque medio,
          ataque organizado).
        </p>
      </div>

      {plan.estructura_base.map((f, i) => (
        <div key={i} className="rounded-lg border border-border p-4">
          {plan.estructura_base.length > 1 && (
            <div className="mb-2 flex justify-end">
              <button
                className={btnQuitar}
                onClick={() => onChange({ ...plan, estructura_base: plan.estructura_base.filter((_, j) => j !== i) })}
              >
                Quitar fase
              </button>
            </div>
          )}
          <div className="grid grid-cols-2 gap-4">
            <label className="flex flex-col gap-1">
              <span className={labelClase}>Nombre de la fase</span>
              <input
                type="text"
                placeholder="Presión alta / Bloque medio / Ataque organizado"
                className={inputClase}
                value={f.nombre}
                onChange={(e) => {
                  const fases = [...plan.estructura_base];
                  fases[i] = { ...fases[i], nombre: e.target.value };
                  onChange({ ...plan, estructura_base: fases });
                }}
              />
            </label>
            <label className="flex flex-col gap-1">
              <span className={labelClase}>Formación</span>
              <input
                type="text"
                placeholder="4-1-3-2"
                className={inputClase}
                value={f.formacion}
                onChange={(e) => {
                  const fases = [...plan.estructura_base];
                  fases[i] = { ...fases[i], formacion: e.target.value };
                  onChange({ ...plan, estructura_base: fases });
                }}
              />
            </label>
          </div>

          <p className={`${labelClase} mb-1 mt-3`}>Jugadores por rol (nombre y dorsal)</p>
          <div className="grid grid-cols-3 gap-2">
            {ROLES.map((r) => (
              <label key={r} className="flex flex-col gap-1">
                <span className="text-[11px] text-foreground/40">{r}</span>
                <input
                  type="text"
                  className={inputClase}
                  value={f.roles[r]}
                  onChange={(e) => {
                    const fases = [...plan.estructura_base];
                    fases[i] = { ...fases[i], roles: { ...fases[i].roles, [r]: e.target.value } };
                    onChange({ ...plan, estructura_base: fases });
                  }}
                />
              </label>
            ))}
          </div>

          <label className="mt-3 flex flex-col gap-1">
            <span className={labelClase}>Quién gana los duelos aéreos clave</span>
            <input
              type="text"
              className={inputClase}
              value={f.aereo}
              onChange={(e) => {
                const fases = [...plan.estructura_base];
                fases[i] = { ...fases[i], aereo: e.target.value };
                onChange({ ...plan, estructura_base: fases });
              }}
            />
          </label>
          <label className="mt-3 flex flex-col gap-1">
            <span className={labelClase}>Fuente (Wyscout / SICS / video)</span>
            <textarea
              className={`${inputClase} min-h-[70px] resize-y`}
              placeholder={FUENTE_HELP}
              value={f.fuente}
              onChange={(e) => {
                const fases = [...plan.estructura_base];
                fases[i] = { ...fases[i], fuente: e.target.value };
                onChange({ ...plan, estructura_base: fases });
              }}
            />
          </label>
        </div>
      ))}
      <button
        className={`${btnFantasma} self-start`}
        onClick={() => onChange({ ...plan, estructura_base: [...plan.estructura_base, faseVacia()] })}
      >
        + Agregar fase
      </button>
    </div>
  );
}

function SeccionSimpleForm({
  plan,
  onChange,
  id,
}: {
  plan: AnalisisRivalData;
  onChange: (p: AnalisisRivalData) => void;
  id: SeccionSimpleId;
}) {
  const def = SECCIONES_SIMPLES.find((s) => s.id === id)!;
  const d = plan[id];

  return (
    <div className="flex flex-col gap-3">
      <h2 className="text-lg font-semibold text-primary">{def.titulo}</h2>
      <div className="rounded-md border-l-2 border-primary bg-background px-3 py-2 text-xs text-foreground/60">
        <p className="mb-1 font-medium">Preguntas guía:</p>
        <ul className="list-disc pl-4">
          {def.preguntas.map((p) => (
            <li key={p}>{p}</li>
          ))}
        </ul>
      </div>
      <label className="flex flex-col gap-1">
        <span className={labelClase}>Fuentes de datos (Wyscout / SICS / video)</span>
        <textarea
          className={`${inputClase} min-h-[90px] resize-y`}
          placeholder={FUENTE_HELP}
          value={d.fuente}
          onChange={(e) => onChange({ ...plan, [id]: { ...d, fuente: e.target.value } })}
        />
      </label>
      <label className="flex flex-col gap-1">
        <span className={labelClase}>Conclusión / patrón identificado</span>
        <textarea
          className={`${inputClase} min-h-[110px] resize-y`}
          placeholder="Redactar acá la interpretación final, con implicancia para el plan."
          value={d.conclusion}
          onChange={(e) => onChange({ ...plan, [id]: { ...d, conclusion: e.target.value } })}
        />
      </label>
    </div>
  );
}

function SeccionPatrones({ plan, onChange }: { plan: AnalisisRivalData; onChange: (p: AnalisisRivalData) => void }) {
  return (
    <div className="flex flex-col gap-4">
      <div>
        <h2 className="text-lg font-semibold text-primary">Patrones puntuales recurrentes</h2>
        <p className="text-sm text-foreground/50">
          Nombrar cada patrón distintivo con una etiqueta corta en mayúscula (igual que en SICS: DIRECTO, TERCER HOMBRE,
          AYUDAS POR BANDA, etc.). Reportar solo los que se repiten en más de un partido.
        </p>
      </div>
      {plan.patrones.map((p, i) => (
        <div key={i} className="rounded-lg border border-border p-4">
          {plan.patrones.length > 1 && (
            <div className="mb-2 flex justify-end">
              <button
                className={btnQuitar}
                onClick={() => onChange({ ...plan, patrones: plan.patrones.filter((_, j) => j !== i) })}
              >
                Quitar
              </button>
            </div>
          )}
          <label className="flex flex-col gap-1">
            <span className={labelClase}>Etiqueta</span>
            <input
              type="text"
              placeholder="TERCER HOMBRE"
              className={inputClase}
              value={p.etiqueta}
              onChange={(e) => {
                const patrones = [...plan.patrones];
                patrones[i] = { ...patrones[i], etiqueta: e.target.value.toUpperCase() };
                onChange({ ...plan, patrones });
              }}
            />
          </label>
          <label className="mt-2 flex flex-col gap-1">
            <span className={labelClase}>Descripción</span>
            <textarea
              className={`${inputClase} min-h-[70px] resize-y`}
              value={p.descripcion}
              onChange={(e) => {
                const patrones = [...plan.patrones];
                patrones[i] = { ...patrones[i], descripcion: e.target.value };
                onChange({ ...plan, patrones });
              }}
            />
          </label>
          <label className="mt-2 flex flex-col gap-1">
            <span className={labelClase}>Referencia (clip / minuto / partido)</span>
            <input
              type="text"
              className={inputClase}
              value={p.referencia}
              onChange={(e) => {
                const patrones = [...plan.patrones];
                patrones[i] = { ...patrones[i], referencia: e.target.value };
                onChange({ ...plan, patrones });
              }}
            />
          </label>
          <label className="mt-2 flex flex-col gap-1">
            <span className={labelClase}>Implicancia para el plan</span>
            <textarea
              className={`${inputClase} min-h-[70px] resize-y`}
              value={p.implicancia}
              onChange={(e) => {
                const patrones = [...plan.patrones];
                patrones[i] = { ...patrones[i], implicancia: e.target.value };
                onChange({ ...plan, patrones });
              }}
            />
          </label>
        </div>
      ))}
      <button
        className={`${btnFantasma} self-start`}
        onClick={() => onChange({ ...plan, patrones: [...plan.patrones, patronVacio()] })}
      >
        + Agregar patrón
      </button>
    </div>
  );
}

function SeccionClaves({ plan, onChange }: { plan: AnalisisRivalData; onChange: (p: AnalisisRivalData) => void }) {
  return (
    <div className="flex flex-col gap-3">
      <div>
        <h2 className="text-lg font-semibold text-primary">Claves del partido</h2>
        <p className="text-sm text-foreground/50">
          3 a 5 ideas fuerza accionables: qué hacemos nosotros frente a cada patrón identificado.
        </p>
      </div>
      <div className="flex flex-col gap-2">
        {plan.claves.map((c, i) => (
          <div key={i} className="flex items-center gap-2">
            <span className="w-5 shrink-0 text-sm font-semibold text-foreground/40">{i + 1}.</span>
            <input
              type="text"
              className={`${inputClase} flex-1`}
              value={c}
              onChange={(e) => {
                const claves = [...plan.claves];
                claves[i] = e.target.value;
                onChange({ ...plan, claves });
              }}
            />
            {plan.claves.length > 1 && (
              <button
                className={`${btnQuitar} shrink-0`}
                onClick={() => onChange({ ...plan, claves: plan.claves.filter((_, j) => j !== i) })}
              >
                Quitar
              </button>
            )}
          </div>
        ))}
        <button className={`${btnFantasma} self-start`} onClick={() => onChange({ ...plan, claves: [...plan.claves, ""] })}>
          + Agregar idea
        </button>
      </div>
    </div>
  );
}

function SeccionPreview({ plan, id }: { plan: AnalisisRivalData; id: string }) {
  const texto = generarTextoPlan(plan);

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h2 className="text-lg font-semibold text-primary">Vista previa y exportar</h2>
        <p className="text-sm text-foreground/50">Este es el documento final del Plan de Partido.</p>
      </div>
      <div className="flex flex-wrap gap-2">
        <button
          className={btnFantasma}
          onClick={() => navigator.clipboard.writeText(texto).then(() => alert("Copiado al portapapeles."))}
        >
          Copiar como texto
        </button>
        <AnalisisRivalPdfButton plan={plan} />
      </div>
      <pre className="whitespace-pre-wrap rounded-lg border border-border bg-background p-4 font-sans text-sm leading-relaxed">
        {texto || "Todavía no cargaste contenido."}
      </pre>
      <p className="text-[11px] text-foreground/40">ID interno: {id}</p>
    </div>
  );
}

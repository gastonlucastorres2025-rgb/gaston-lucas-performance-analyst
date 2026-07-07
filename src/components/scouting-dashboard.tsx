"use client";

import dynamic from "next/dynamic";
import { useMemo, useState } from "react";
import { calcularEdad } from "@/lib/scouting-utils";

const ScoutingMap = dynamic(
  () => import("@/components/scouting-map").then((mod) => mod.ScoutingMap),
  { ssr: false, loading: () => <div className="h-full w-full animate-pulse bg-primary/5" /> },
);

type ScoutingTarget = {
  id: string;
  nombre: string;
  apellido: string;
  equipo_actual: string | null;
  liga: string | null;
  pais_liga: string | null;
  fecha_nacimiento: string | null;
  nacionalidad: string | null;
  posicion: string | null;
  club_formativo: string | null;
  proceso_seleccion: boolean | null;
  experiencia_altura: boolean | null;
  categoria: string | null;
  etiqueta: string | null;
};

const TODOS = "Todos";
const SIN_DATO = "Sin dato";

function uniqueSorted(values: (string | null)[]) {
  return Array.from(new Set(values.filter((v): v is string => !!v))).sort();
}

function triFilterMatch(value: boolean | null, filter: string) {
  if (filter === TODOS) return true;
  if (filter === "Sí") return value === true;
  if (filter === "No") return value === false;
  return value === null;
}

export function ScoutingDashboard({ targets }: { targets: ScoutingTarget[] }) {
  const [busqueda, setBusqueda] = useState("");
  const [posicion, setPosicion] = useState(TODOS);
  const [categoria, setCategoria] = useState(TODOS);
  const [pais, setPais] = useState(TODOS);
  const [nacionalidad, setNacionalidad] = useState(TODOS);
  const [procesoSeleccion, setProcesoSeleccion] = useState(TODOS);
  const [experienciaAltura, setExperienciaAltura] = useState(TODOS);
  const [edadMin, setEdadMin] = useState("");
  const [edadMax, setEdadMax] = useState("");

  const posiciones = useMemo(() => uniqueSorted(targets.map((t) => t.posicion)), [targets]);
  const categorias = useMemo(() => uniqueSorted(targets.map((t) => t.categoria)), [targets]);
  const paises = useMemo(() => uniqueSorted(targets.map((t) => t.pais_liga)), [targets]);
  const nacionalidades = useMemo(
    () => uniqueSorted(targets.map((t) => t.nacionalidad)),
    [targets],
  );

  const withAge = useMemo(
    () => targets.map((t) => ({ ...t, edad: calcularEdad(t.fecha_nacimiento) })),
    [targets],
  );

  const filtered = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    const min = edadMin ? Number(edadMin) : null;
    const max = edadMax ? Number(edadMax) : null;

    return withAge.filter((t) => {
      if (q) {
        const haystack = `${t.nombre} ${t.apellido} ${t.equipo_actual ?? ""}`.toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      if (posicion !== TODOS && (t.posicion ?? SIN_DATO) !== posicion) return false;
      if (categoria !== TODOS && (t.categoria ?? SIN_DATO) !== categoria) return false;
      if (pais !== TODOS && (t.pais_liga ?? SIN_DATO) !== pais) return false;
      if (nacionalidad !== TODOS && (t.nacionalidad ?? SIN_DATO) !== nacionalidad) return false;
      if (!triFilterMatch(t.proceso_seleccion, procesoSeleccion)) return false;
      if (!triFilterMatch(t.experiencia_altura, experienciaAltura)) return false;
      if (min !== null && (t.edad === null || t.edad < min)) return false;
      if (max !== null && (t.edad === null || t.edad > max)) return false;
      return true;
    });
  }, [
    withAge,
    busqueda,
    posicion,
    categoria,
    pais,
    nacionalidad,
    procesoSeleccion,
    experienciaAltura,
    edadMin,
    edadMax,
  ]);

  const countryCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const t of filtered) {
      if (!t.pais_liga) continue;
      counts[t.pais_liga] = (counts[t.pais_liga] ?? 0) + 1;
    }
    return counts;
  }, [filtered]);

  const sinUbicacion = filtered.length - Object.values(countryCounts).reduce((a, b) => a + b, 0);

  return (
    <div>
      <div className="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-8">
        <input
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          placeholder="Buscar nombre o club..."
          className="col-span-2 rounded border border-border px-2 py-1.5 text-sm focus:border-primary focus:outline-none lg:col-span-2"
        />
        <select
          value={posicion}
          onChange={(e) => setPosicion(e.target.value)}
          className="rounded border border-border px-2 py-1.5 text-sm"
        >
          <option value={TODOS}>Posición: todas</option>
          {posiciones.map((p) => (
            <option key={p} value={p}>
              {p}
            </option>
          ))}
        </select>
        <select
          value={categoria}
          onChange={(e) => setCategoria(e.target.value)}
          className="rounded border border-border px-2 py-1.5 text-sm"
        >
          <option value={TODOS}>Categoría: todas</option>
          {categorias.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
        <select
          value={pais}
          onChange={(e) => setPais(e.target.value)}
          className="rounded border border-border px-2 py-1.5 text-sm"
        >
          <option value={TODOS}>País: todos</option>
          {paises.map((p) => (
            <option key={p} value={p}>
              {p}
            </option>
          ))}
        </select>
        <select
          value={nacionalidad}
          onChange={(e) => setNacionalidad(e.target.value)}
          className="rounded border border-border px-2 py-1.5 text-sm"
        >
          <option value={TODOS}>Nacionalidad: todas</option>
          {nacionalidades.map((n) => (
            <option key={n} value={n}>
              {n}
            </option>
          ))}
        </select>
        <select
          value={procesoSeleccion}
          onChange={(e) => setProcesoSeleccion(e.target.value)}
          className="rounded border border-border px-2 py-1.5 text-sm"
        >
          <option value={TODOS}>Selección: todas</option>
          <option value="Sí">Con proceso de selección</option>
          <option value="No">Sin proceso de selección</option>
        </select>
        <select
          value={experienciaAltura}
          onChange={(e) => setExperienciaAltura(e.target.value)}
          className="rounded border border-border px-2 py-1.5 text-sm"
        >
          <option value={TODOS}>Altura: todas</option>
          <option value="Sí">Con experiencia en altura</option>
          <option value="No">Sin experiencia en altura</option>
        </select>
        <div className="col-span-2 flex items-center gap-1 sm:col-span-1">
          <input
            value={edadMin}
            onChange={(e) => setEdadMin(e.target.value)}
            placeholder="Edad min"
            type="number"
            className="w-full rounded border border-border px-2 py-1.5 text-sm"
          />
          <span className="text-foreground/40">–</span>
          <input
            value={edadMax}
            onChange={(e) => setEdadMax(e.target.value)}
            placeholder="Edad max"
            type="number"
            className="w-full rounded border border-border px-2 py-1.5 text-sm"
          />
        </div>
      </div>

      <p className="mb-3 text-sm text-foreground/60">
        {filtered.length} jugadores encontrados
        {sinUbicacion > 0 ? ` · ${sinUbicacion} sin país de club registrado` : ""}
      </p>

      <div className="mb-6 h-80 overflow-hidden rounded-lg border border-border">
        <ScoutingMap countryCounts={countryCounts} />
      </div>

      <div className="overflow-hidden rounded-lg border border-border bg-surface">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-primary/5 text-left text-xs font-medium uppercase tracking-wide text-foreground/60">
              <th className="px-4 py-3">Jugador</th>
              <th className="px-4 py-3">Edad</th>
              <th className="px-4 py-3">Posición</th>
              <th className="px-4 py-3">Club actual</th>
              <th className="px-4 py-3">País</th>
              <th className="px-4 py-3">Categoría</th>
              <th className="px-4 py-3">Selección</th>
              <th className="px-4 py-3">Altura</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((t) => (
              <tr key={t.id} className="border-b border-border last:border-0 hover:bg-primary/5">
                <td className="px-4 py-3 font-medium">
                  {t.nombre} {t.apellido}
                </td>
                <td className="px-4 py-3 text-foreground/70">{t.edad ?? "-"}</td>
                <td className="px-4 py-3 text-foreground/70">{t.posicion ?? "-"}</td>
                <td className="px-4 py-3 text-foreground/70">{t.equipo_actual ?? "-"}</td>
                <td className="px-4 py-3 text-foreground/70">{t.pais_liga ?? "-"}</td>
                <td className="px-4 py-3">
                  {t.categoria ? (
                    <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                      {t.categoria}
                    </span>
                  ) : (
                    "-"
                  )}
                </td>
                <td className="px-4 py-3 text-foreground/70">
                  {t.proceso_seleccion === null ? "-" : t.proceso_seleccion ? "Sí" : "No"}
                </td>
                <td className="px-4 py-3 text-foreground/70">
                  {t.experiencia_altura === null ? "-" : t.experiencia_altura ? "Sí" : "No"}
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-center text-foreground/50">
                  Ningún jugador coincide con estos filtros.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

"use client";

import { useMemo, useState } from "react";
import Link from "next/link";

export type FilaJugadorTabla = {
  id: string;
  fullName: string;
  currentClub: string | null;
  primaryPosition: string | null;
  preferredFoot: string | null;
  height: number | null;
  trackingStatus: string;
  profileState: string;
  photoUrl: string | null;
  cantidadObservaciones: number;
};

const ESTADO_LABEL: Record<string, string> = {
  detectado: "Detectado",
  primera_observacion: "Primera observación",
  en_seguimiento: "En seguimiento",
  seguimiento_prioritario: "Seguimiento prioritario",
  requiere_nueva_observacion: "Requiere nueva observación",
  perfil_consolidado: "Perfil consolidado",
  pausado: "Pausado",
  descartado: "Descartado",
  archivado: "Archivado",
};

function normalizar(s: string): string {
  return s
    .normalize("NFD")
    .replace(/\p{Mn}/gu, "")
    .toLowerCase();
}

export function JugadoresTabla({ jugadores }: { jugadores: FilaJugadorTabla[] }) {
  const [busqueda, setBusqueda] = useState("");
  const [club, setClub] = useState("");
  const [posicion, setPosicion] = useState("");
  const [pie, setPie] = useState("");
  const [soloIncompletos, setSoloIncompletos] = useState(false);

  const clubes = useMemo(() => [...new Set(jugadores.map((j) => j.currentClub).filter(Boolean))].sort(), [jugadores]);
  const posiciones = useMemo(
    () => [...new Set(jugadores.map((j) => j.primaryPosition).filter(Boolean))].sort(),
    [jugadores],
  );

  const filtrados = useMemo(() => {
    const busquedaNorm = normalizar(busqueda);
    return jugadores.filter((j) => {
      if (busquedaNorm && !normalizar(j.fullName).includes(busquedaNorm)) return false;
      if (club && j.currentClub !== club) return false;
      if (posicion && j.primaryPosition !== posicion) return false;
      if (pie && j.preferredFoot !== pie) return false;
      if (soloIncompletos && j.profileState !== "incompleto" && j.profileState !== "pendiente_revision") return false;
      return true;
    });
  }, [jugadores, busqueda, club, posicion, pie, soloIncompletos]);

  return (
    <div>
      <div className="mb-4 flex flex-wrap gap-2">
        <input
          type="text"
          placeholder="Buscar por nombre..."
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          className="w-56 rounded-lg border border-border bg-surface px-3 py-2 text-sm"
        />
        <select value={club} onChange={(e) => setClub(e.target.value)} className="rounded-lg border border-border bg-surface px-3 py-2 text-sm">
          <option value="">Todos los clubes</option>
          {clubes.map((c) => (
            <option key={c} value={c ?? ""}>
              {c}
            </option>
          ))}
        </select>
        <select
          value={posicion}
          onChange={(e) => setPosicion(e.target.value)}
          className="rounded-lg border border-border bg-surface px-3 py-2 text-sm"
        >
          <option value="">Todas las posiciones</option>
          {posiciones.map((p) => (
            <option key={p} value={p ?? ""}>
              {p}
            </option>
          ))}
        </select>
        <select value={pie} onChange={(e) => setPie(e.target.value)} className="rounded-lg border border-border bg-surface px-3 py-2 text-sm">
          <option value="">Pie hábil (todos)</option>
          <option value="derecho">Derecho</option>
          <option value="izquierdo">Izquierdo</option>
          <option value="ambidiestro">Ambidiestro</option>
        </select>
        <label className="flex items-center gap-2 rounded-lg border border-border bg-surface px-3 py-2 text-sm">
          <input type="checkbox" checked={soloIncompletos} onChange={(e) => setSoloIncompletos(e.target.checked)} />
          Solo incompletos/a revisar
        </label>
      </div>

      <p className="mb-3 text-xs text-foreground/50">
        {filtrados.length} de {jugadores.length} jugadores
      </p>

      <div className="overflow-hidden rounded-lg border border-border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs text-foreground/50">
              <th className="py-2 pl-3 font-medium">Nombre</th>
              <th className="py-2 font-medium">Club</th>
              <th className="py-2 font-medium">Posición</th>
              <th className="py-2 font-medium">Pie</th>
              <th className="w-16 py-2 text-center font-medium">Altura</th>
              <th className="w-14 py-2 text-center font-medium">Análisis</th>
              <th className="py-2 pr-3 font-medium">Estado</th>
            </tr>
          </thead>
          <tbody>
            {filtrados.map((j) => (
              <tr key={j.id} className="border-b border-border last:border-b-0 hover:bg-primary/5">
                <td className="py-2 pl-3">
                  <Link
                    href={`/seguimiento-internacional/jugadores/${j.id}`}
                    className="flex items-center gap-2 font-medium text-foreground hover:text-primary"
                  >
                    {j.photoUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={j.photoUrl} alt="" width={24} height={24} className="h-6 w-6 shrink-0 rounded-full object-cover" />
                    ) : (
                      <span className="h-6 w-6 shrink-0 rounded-full bg-surface" />
                    )}
                    {j.fullName}
                  </Link>
                </td>
                <td className="py-2 text-foreground/70">{j.currentClub ?? "—"}</td>
                <td className="py-2 text-foreground/70">{j.primaryPosition ?? "—"}</td>
                <td className="py-2 text-foreground/70">{j.preferredFoot ?? "—"}</td>
                <td className="py-2 text-center text-foreground/70">{j.height ?? "—"}</td>
                <td className="py-2 text-center text-foreground/70">{j.cantidadObservaciones}</td>
                <td className="py-2 pr-3 text-xs text-foreground/60">{ESTADO_LABEL[j.trackingStatus] ?? j.trackingStatus}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtrados.length === 0 && <p className="p-6 text-center text-sm text-foreground/50">No hay jugadores que coincidan con los filtros.</p>}
      </div>
    </div>
  );
}

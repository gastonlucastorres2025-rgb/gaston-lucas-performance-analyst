"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { crearCarpeta } from "@/lib/seguimiento-internacional-carpetas-actions";

export function CrearCarpetaBoton() {
  const router = useRouter();
  const [abierto, setAbierto] = useState(false);
  const [nombre, setNombre] = useState("");
  const [creando, setCreando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleCrear() {
    if (!nombre.trim()) return;
    setCreando(true);
    setError(null);
    const result = await crearCarpeta(nombre);
    setCreando(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    router.push(`/seguimiento-internacional/carpetas/${result.id}`);
  }

  if (!abierto) {
    return (
      <button
        onClick={() => setAbierto(true)}
        className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90"
      >
        + Nueva carpeta
      </button>
    );
  }

  return (
    <div className="flex max-w-md items-start gap-2">
      <div className="flex-1">
        <input
          autoFocus
          value={nombre}
          onChange={(e) => setNombre(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleCrear()}
          placeholder="Nombre de la carpeta (ej: Rival fecha 5)"
          className="w-full rounded border border-border px-3 py-2 text-sm focus:border-primary focus:outline-none"
        />
        {error && <p className="mt-1 text-xs text-accent">{error}</p>}
      </div>
      <button
        onClick={handleCrear}
        disabled={creando || !nombre.trim()}
        className="shrink-0 rounded-md bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90 disabled:opacity-50"
      >
        {creando ? "Creando..." : "Crear"}
      </button>
      <button
        onClick={() => {
          setAbierto(false);
          setNombre("");
          setError(null);
        }}
        className="shrink-0 rounded-md border border-border px-3 py-2 text-sm text-foreground/60 hover:bg-primary/5"
      >
        Cancelar
      </button>
    </div>
  );
}

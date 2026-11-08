"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { eliminarVideoBiblioteca, renombrarVideoBiblioteca } from "@/lib/biblioteca/acciones";

const CAMPO = "w-full rounded-md border border-border bg-surface px-3 py-2 text-sm";

/** Renombrar / eliminar el archivo real del video (solo para quien puede editar). */
export function AccionesArchivo({ carpeta, archivo }: { carpeta: string; archivo: string }) {
  const router = useRouter();
  const extension = archivo.match(/\.[^.]+$/)?.[0] ?? "";
  const [nombre, setNombre] = useState(archivo.slice(0, archivo.length - extension.length));
  const [error, setError] = useState<string | null>(null);
  const [pendiente, empezar] = useTransition();

  return (
    <div className="mt-5 border-t border-border pt-4">
      <h3 className="mb-2 text-sm font-semibold text-foreground">Archivo</h3>
      <form
        className="space-y-2"
        onSubmit={(e) => {
          e.preventDefault();
          setError(null);
          empezar(async () => {
            const r = await renombrarVideoBiblioteca(carpeta, archivo, nombre);
            if (!r.ok) setError(r.error);
            else if (r.archivo !== archivo) router.replace(`/biblioteca/ver?c=${encodeURIComponent(carpeta)}&n=${encodeURIComponent(r.archivo)}`);
          });
        }}
      >
        <label className="block text-xs text-foreground/60">
          Nombre del archivo (en la carpeta de la computadora)
          <input value={nombre} onChange={(e) => setNombre(e.target.value)} className={`${CAMPO} mt-1`} />
        </label>
        <div className="flex flex-wrap items-center gap-2">
          <button type="submit" disabled={pendiente} className="rounded-md border border-border px-3 py-1.5 text-sm hover:bg-background disabled:opacity-50">
            Renombrar
          </button>
          <button
            type="button"
            disabled={pendiente}
            onClick={() => {
              if (!confirm(`¿Eliminar este video?\n\n${archivo}\n\nSe mueve a la Papelera de la Mac, desde ahí se puede recuperar.`)) return;
              setError(null);
              empezar(async () => {
                const r = await eliminarVideoBiblioteca(carpeta, archivo);
                if (!r.ok) setError(r.error);
                else router.replace(`/biblioteca/carpeta?c=${encodeURIComponent(carpeta)}`);
              });
            }}
            className="rounded-md border border-red-300 px-3 py-1.5 text-sm text-red-700 hover:bg-red-50 disabled:opacity-50"
          >
            Eliminar
          </button>
        </div>
        {error && <p className="text-sm text-red-700">{error}</p>}
      </form>
    </div>
  );
}

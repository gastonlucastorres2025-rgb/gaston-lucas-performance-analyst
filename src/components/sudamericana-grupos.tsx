import { StandingsTable } from "@/components/standings-table";

type Fila = { rank: number; nombre: string; escudo: string; jugados: number; puntos: number; diferencia?: number };

export function SudamericanaGrupos({ grupos }: { grupos: { grupo: string; filas: Fila[] }[] }) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {grupos.map((g) => (
        <StandingsTable key={g.grupo} titulo={g.grupo.replace(/^Group /, "Grupo ")} filas={g.filas} />
      ))}
    </div>
  );
}

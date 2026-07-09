type Fila = {
  rank: number;
  nombre: string;
  escudo: string;
  jugados: number;
  puntos: number;
  diferencia?: number;
};

export function StandingsTable({ titulo, filas }: { titulo?: string; filas: Fila[] }) {
  return (
    <div className="overflow-hidden rounded-lg border border-border">
      {titulo && (
        <div className="border-b border-border bg-primary/5 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-primary">
          {titulo}
        </div>
      )}
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border text-left text-xs text-foreground/50">
            <th className="w-8 py-2 pl-3 font-medium">#</th>
            <th className="py-2 font-medium">Equipo</th>
            <th className="w-10 py-2 text-center font-medium">PJ</th>
            <th className="w-12 py-2 text-center font-medium">DIF</th>
            <th className="w-12 py-2 pr-3 text-center font-medium">Pts</th>
          </tr>
        </thead>
        <tbody>
          {filas.map((f) => {
            const esNacional = f.nombre.toLowerCase().includes("nacional");
            return (
              <tr
                key={f.rank}
                className={`border-b border-border last:border-b-0 ${esNacional ? "bg-primary/5" : ""}`}
              >
                <td className="py-1.5 pl-3 text-foreground/50">{f.rank}</td>
                <td className="py-1.5">
                  <div className="flex items-center gap-2">
                    {f.escudo ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={f.escudo} alt="" width={18} height={18} className="h-[18px] w-[18px] object-contain" />
                    ) : (
                      <span className="h-[18px] w-[18px]" />
                    )}
                    <span className={esNacional ? "font-semibold text-primary" : ""}>{f.nombre}</span>
                  </div>
                </td>
                <td className="py-1.5 text-center text-foreground/60">{f.jugados}</td>
                <td className="py-1.5 text-center text-foreground/60">
                  {f.diferencia != null ? (f.diferencia > 0 ? `+${f.diferencia}` : f.diferencia) : "—"}
                </td>
                <td className={`py-1.5 pr-3 text-center font-semibold ${esNacional ? "text-primary" : ""}`}>
                  {f.puntos}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

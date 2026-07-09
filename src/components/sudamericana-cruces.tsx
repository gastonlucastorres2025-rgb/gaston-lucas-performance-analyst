type Cruce = {
  local: { nombre: string; escudo: string };
  visitante: { nombre: string; escudo: string };
  ida: { fecha: string; golesLocal: number | null; golesVisitante: number | null } | null;
  vuelta: { fecha: string; golesLocal: number | null; golesVisitante: number | null } | null;
};

function fechaCorta(fecha: string) {
  return new Date(fecha).toLocaleDateString("es-UY", { day: "numeric", month: "short" });
}

function Equipo({ nombre, escudo, align }: { nombre: string; escudo: string; align: "left" | "right" }) {
  const esNacional = nombre.toLowerCase().includes("nacional");
  return (
    <div className={`flex min-w-0 flex-1 items-center gap-2 ${align === "right" ? "flex-row-reverse text-right" : ""}`}>
      {escudo ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={escudo} alt="" width={22} height={22} className="h-[22px] w-[22px] shrink-0 object-contain" />
      ) : (
        <span className="h-[22px] w-[22px] shrink-0" />
      )}
      <span className={`truncate text-sm ${esNacional ? "font-bold text-primary" : "font-medium"}`}>{nombre}</span>
    </div>
  );
}

export function SudamericanaCruces({ cruces }: { cruces: Cruce[] }) {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
      {cruces.map((c) => (
        <div key={`${c.local.nombre}-${c.visitante.nombre}`} className="rounded-lg border border-border p-3">
          <div className="mb-2 flex items-center justify-between gap-2">
            <Equipo nombre={c.local.nombre} escudo={c.local.escudo} align="left" />
            <span className="shrink-0 text-xs text-foreground/40">vs</span>
            <Equipo nombre={c.visitante.nombre} escudo={c.visitante.escudo} align="right" />
          </div>
          <div className="flex flex-col gap-1 border-t border-border pt-2 text-xs text-foreground/60">
            {c.ida && (
              <div className="flex items-center justify-between">
                <span>Ida · {fechaCorta(c.ida.fecha)}</span>
                <span className="font-semibold text-foreground">
                  {c.ida.golesLocal ?? "-"} - {c.ida.golesVisitante ?? "-"}
                </span>
              </div>
            )}
            {c.vuelta && (
              <div className="flex items-center justify-between">
                <span>Vuelta · {fechaCorta(c.vuelta.fecha)}</span>
                <span className="font-semibold text-foreground">
                  {c.vuelta.golesLocal ?? "-"} - {c.vuelta.golesVisitante ?? "-"}
                </span>
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

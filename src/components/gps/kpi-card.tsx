export function KpiCard({
  label,
  valor,
  cambioPct,
  contexto,
}: {
  label: string;
  valor: string;
  /** % real vs. el período anterior — undefined si no hay período anterior para comparar (no se inventa). */
  cambioPct?: number | null;
  contexto?: string;
}) {
  const tieneComparacion = cambioPct !== undefined && cambioPct !== null;
  const esPositivo = tieneComparacion && (cambioPct as number) > 0;
  const esNegativo = tieneComparacion && (cambioPct as number) < 0;

  return (
    <div className="rounded-xl border border-border border-l-2 border-l-primary/25 bg-surface px-4 py-3.5">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-foreground/45">{label}</p>
      <div className="mt-1 mb-1.5 h-px w-7 bg-primary/25" />
      <p className="text-2xl font-semibold tracking-tight text-foreground tabular-nums">{valor}</p>
      <div className="mt-1 flex items-center gap-1.5 text-xs">
        {tieneComparacion ? (
          <span className={`font-medium tabular-nums ${esPositivo ? "text-emerald-600" : esNegativo ? "text-accent" : "text-foreground/50"}`}>
            {esPositivo ? "↑" : esNegativo ? "↓" : "→"} {Math.abs(cambioPct as number).toLocaleString("es-UY", { maximumFractionDigits: 1 })}%
          </span>
        ) : (
          contexto && <span className="text-foreground/40">{contexto}</span>
        )}
        {tieneComparacion && contexto && <span className="text-foreground/40">{contexto}</span>}
      </div>
    </div>
  );
}

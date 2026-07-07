export function StatCompareRow({
  label,
  nacional,
  rival,
  suffix = "",
}: {
  label: string;
  nacional: number | null | undefined;
  rival: number | null | undefined;
  suffix?: string;
}) {
  const n = nacional ?? 0;
  const r = rival ?? 0;
  const total = n + r || 1;
  const nPct = (n / total) * 100;

  return (
    <div className="py-2">
      <div className="mb-1 flex items-center justify-between text-sm">
        <span className="font-semibold text-primary">
          {n}
          {suffix}
        </span>
        <span className="text-xs text-foreground/50">{label}</span>
        <span className="font-semibold text-accent">
          {r}
          {suffix}
        </span>
      </div>
      <div className="flex h-1.5 overflow-hidden rounded-full bg-border">
        <div className="bg-primary" style={{ width: `${nPct}%` }} />
        <div className="bg-accent" style={{ width: `${100 - nPct}%` }} />
      </div>
    </div>
  );
}

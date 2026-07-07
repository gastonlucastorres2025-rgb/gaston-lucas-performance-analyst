type Verdict = "mejor" | "peor" | "similar";

function getVerdict(n: number, r: number, invert: boolean): Verdict {
  const scale = Math.max(Math.abs(n), Math.abs(r), 1);
  const relDiff = Math.abs(n - r) / scale;
  if (relDiff < 0.1) return "similar";
  const nacionalAhead = invert ? n < r : n > r;
  return nacionalAhead ? "mejor" : "peor";
}

const VERDICT_STYLES: Record<Verdict, { text: string; bar: string }> = {
  mejor: { text: "text-emerald-600", bar: "bg-emerald-500" },
  peor: { text: "text-accent", bar: "bg-accent" },
  similar: { text: "text-amber-600", bar: "bg-amber-400" },
};

export function StatCompareRow({
  label,
  nacional,
  rival,
  suffix = "",
  invert = false,
}: {
  label: string;
  nacional: number | null | undefined;
  rival: number | null | undefined;
  suffix?: string;
  invert?: boolean;
}) {
  const n = nacional ?? 0;
  const r = rival ?? 0;
  const total = n + r || 1;
  const nPct = (n / total) * 100;
  const verdict = getVerdict(n, r, invert);
  const style = VERDICT_STYLES[verdict];

  return (
    <div className="py-2">
      <div className="mb-1 flex items-center justify-between text-sm">
        <span className={`font-semibold ${style.text}`}>
          {n}
          {suffix}
        </span>
        <span className="text-xs text-foreground/50">{label}</span>
        <span className="font-medium text-foreground/40">
          {r}
          {suffix}
        </span>
      </div>
      <div className="flex h-1.5 overflow-hidden rounded-full bg-border">
        <div className={style.bar} style={{ width: `${nPct}%` }} />
        <div className="bg-foreground/15" style={{ width: `${100 - nPct}%` }} />
      </div>
    </div>
  );
}

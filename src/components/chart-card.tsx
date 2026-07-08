export function ChartCard({
  title,
  children,
  width,
  actions,
}: {
  title: string;
  children: React.ReactNode;
  width: number;
  actions?: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-border bg-surface p-5 shadow-sm transition-shadow hover:shadow-md">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h3 className="text-sm font-semibold tracking-tight text-foreground">{title}</h3>
        {actions}
      </div>
      <div className="overflow-x-auto pb-2">
        <div style={{ width: Math.max(width, 600) }}>{children}</div>
      </div>
    </div>
  );
}

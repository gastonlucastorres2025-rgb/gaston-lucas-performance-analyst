export function ChartCard({
  title,
  children,
  width,
}: {
  title: string;
  children: React.ReactNode;
  width: number;
}) {
  return (
    <div className="rounded-xl border border-border bg-surface p-5 shadow-sm transition-shadow hover:shadow-md">
      <h3 className="mb-4 text-sm font-semibold tracking-tight text-foreground">{title}</h3>
      <div className="overflow-x-auto pb-2">
        <div style={{ width: Math.max(width, 600) }}>{children}</div>
      </div>
    </div>
  );
}

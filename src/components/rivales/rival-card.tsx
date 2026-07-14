import Link from "next/link";

export function RivalCard({
  id,
  nombre,
  escudoUrl,
  planes,
  videos,
  fases,
}: {
  id: string;
  nombre: string;
  escudoUrl: string | null;
  planes: number;
  videos: number;
  fases: number;
}) {
  return (
    <Link
      href={`/rivales/${id}`}
      className="flex flex-col gap-3 rounded-xl border border-border bg-surface p-4 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md"
    >
      <div className="flex items-center gap-2.5">
        {escudoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={escudoUrl} alt="" width={28} height={28} className="shrink-0 rounded-full border border-border bg-white object-contain" />
        ) : (
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-background text-xs font-semibold text-foreground/40">
            {nombre.charAt(0).toUpperCase()}
          </span>
        )}
        <span className="truncate font-semibold">{nombre}</span>
      </div>
      <div className="flex flex-wrap gap-1.5">
        <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary">
          {planes} {planes === 1 ? "plan" : "planes"}
        </span>
        <span className="rounded-full bg-[#e1f5ee] px-2 py-0.5 text-[10px] font-medium text-[#085041]">
          {videos} {videos === 1 ? "video" : "videos"}
        </span>
        <span className="rounded-full bg-[#faeeda] px-2 py-0.5 text-[10px] font-medium text-[#633806]">
          {fases} {fases === 1 ? "fase" : "fases"}
        </span>
      </div>
    </Link>
  );
}

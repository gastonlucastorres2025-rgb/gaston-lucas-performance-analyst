export function extraerYoutubeId(input: string): string | null {
  const trimmed = input.trim();
  if (/^[\w-]{11}$/.test(trimmed)) return trimmed;
  try {
    const url = new URL(trimmed);
    if (url.hostname.includes("youtu.be")) return url.pathname.slice(1);
    const v = url.searchParams.get("v");
    if (v) return v;
    const shorts = url.pathname.match(/\/shorts\/([\w-]{11})/);
    if (shorts) return shorts[1];
  } catch {
    return null;
  }
  return null;
}

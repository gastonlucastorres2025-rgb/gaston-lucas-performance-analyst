/** Escudo de un rival real. Si la fuente de datos no tiene el escudo cargado (club extranjero sin
 * escudo en `rivales` ni en el catálogo uruguayo), mostramos un placeholder neutro con la
 * inicial del club — nunca un escudo inventado o de otro equipo. */
export function EscudoRival({ nombre, url, size = 32 }: { nombre: string; url: string | null; size?: number }) {
  if (url) {
    // eslint-disable-next-line @next/next/no-img-element -- escudos vienen de a.espncdn.com, un host externo no configurado en next/image
    return <img src={url} alt={nombre} width={size} height={size} className="shrink-0 rounded-full bg-white object-contain ring-1 ring-border" style={{ width: size, height: size }} />;
  }
  return (
    <div
      className="flex shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary/60 ring-1 ring-border"
      style={{ width: size, height: size }}
      title={`${nombre} — sin escudo cargado`}
    >
      {nombre.slice(0, 1).toUpperCase()}
    </div>
  );
}

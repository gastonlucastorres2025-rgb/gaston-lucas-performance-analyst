import { bandaAcwr, severidadVmax, type BandaAcwr } from "@/lib/gps/calculos";
import type { EstadoVmax } from "@/lib/gps/calculos";
import type { Lesion } from "@/lib/gps/datos";

export type Severidad = "ok" | "atencion" | "alerta";

const COLOR_INSIGNIA = {
  azul: "bg-blue-100 text-blue-800",
  verde: "bg-emerald-100 text-emerald-800",
  amarillo: "bg-amber-100 text-amber-800",
  rojo: "bg-red-100 text-red-800",
  gris: "bg-gray-100 text-gray-500",
} as const;

export function Insignia({ color, children, titulo }: { color: keyof typeof COLOR_INSIGNIA; children: React.ReactNode; titulo?: string }) {
  return (
    <span title={titulo} className={`inline-block min-w-[3rem] rounded-full px-2.5 py-0.5 text-center text-xs font-semibold tabular-nums ${COLOR_INSIGNIA[color]}`}>
      {children}
    </span>
  );
}

const COLOR_BANDA: Record<BandaAcwr, keyof typeof COLOR_INSIGNIA> = {
  baja: "azul",
  objetivo: "verde",
  precaucion: "amarillo",
  riesgo: "rojo",
  "sin-datos": "gris",
};

export function InsigniaAcwr({ valor }: { valor: number | null }) {
  return <Insignia color={COLOR_BANDA[bandaAcwr(valor)]}>{valor == null ? "—" : valor.toFixed(2)}</Insignia>;
}

export function InsigniaVmax({ estado }: { estado: EstadoVmax | null }) {
  if (!estado) return <Insignia color="gris">—</Insignia>;
  const sev = severidadVmax(estado.dias);
  const color = sev === "ok" ? "verde" : sev === "atencion" ? "amarillo" : "rojo";
  const titulo = `Último día que llegó al 90% de su VMAX (${estado.umbral.toFixed(1)} km/h): ${estado.ultimoDia}. VMAX de referencia: ${estado.vmaxReferencia} km/h, pico del ${estado.fechaReferencia}.`;
  return (
    <Insignia color={color} titulo={titulo}>
      {estado.dias}
    </Insignia>
  );
}

export function InsigniaLesion({ lesion }: { lesion: Lesion | null }) {
  if (!lesion || lesion.estado === "Alta") return null;
  return (
    <Insignia color={lesion.estado === "Activa" ? "rojo" : "amarillo"} titulo={`${lesion.zona} · desde ${formatearFecha(lesion.fecha)}`}>
      {lesion.estado}
    </Insignia>
  );
}

export function formatearFecha(iso: string | null): string {
  if (!iso) return "—";
  const [y, m, d] = iso.split("-");
  return y && m && d ? `${d}/${m}/${y}` : iso;
}

const BORDE_SEVERIDAD: Record<Severidad, string> = {
  ok: "border-l-emerald-500",
  atencion: "border-l-amber-400",
  alerta: "border-l-red-500",
};

export function TarjetaAlerta({ titulo, detalle, severidad }: { titulo: string; detalle: string; severidad: Severidad }) {
  return (
    <div className={`rounded-md border border-border border-l-4 bg-surface px-3 py-2 ${BORDE_SEVERIDAD[severidad]}`}>
      <div className="text-sm font-semibold text-foreground">{titulo}</div>
      <div className="text-xs text-foreground/60">{detalle}</div>
    </div>
  );
}

const FONDO_TILE: Record<Severidad, string> = {
  ok: "text-emerald-700",
  atencion: "text-amber-600",
  alerta: "text-red-600",
};

export function Tile({ numero, etiqueta, severidad }: { numero: number; etiqueta: string; severidad: Severidad }) {
  return (
    <div className="flex-1 rounded-lg border border-border bg-surface px-4 py-3">
      <div className={`text-3xl font-semibold tabular-nums ${FONDO_TILE[severidad]}`}>{numero}</div>
      <div className="mt-0.5 text-xs text-foreground/60">{etiqueta}</div>
    </div>
  );
}

export function Tarjeta({ titulo, nota, children }: { titulo: string; nota?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="mb-4 rounded-lg border border-border bg-surface p-5">
      <h2 className="text-base font-semibold text-foreground">{titulo}</h2>
      {nota && <p className="mt-1 text-xs text-foreground/60">{nota}</p>}
      <div className="mt-3">{children}</div>
    </section>
  );
}

export function SinDatos() {
  return (
    <div className="rounded-lg border border-dashed border-border bg-surface px-5 py-10 text-center text-sm text-foreground/60">
      Todavía no hay datos GPS cargados. Cuando lleguen los archivos del proveedor, el panel se arma solo.
    </div>
  );
}

import { abreviarNombre, type FilaBarra } from "@/lib/gps/calculos";

// Gráfica "una columna por jugador": valor crudo de un día, de mayor a menor, con la línea del
// promedio del plantel. Diseño tomado de la plantilla del preparador físico (dashboard.html,
// renderDailySnapshotBars): mismas medidas, 4 divisiones, columnas redondeadas solo arriba, valor
// en negrita sobre cada columna y nombres abreviados a -45°. Es SVG puro de servidor (sin JS).

const COLOR_BARRA = "#2563eb";
const COLOR_PROMEDIO = "#dc2626";
const COLOR_SIN_DATOS = "#6b7280";

const PAD_IZQ = 52;
const PAD_DER = 10;
const PAD_SUP = 24;
const PAD_INF = 70;
const ALTO = 400;
const ANCHO_GRUPO = 44;
const ANCHO_BARRA = 26;
const DIVISIONES = 4;

/** 1856.4 -> "1.856" (separador de miles con punto, determinista: no depende del locale del servidor). */
function compacto(v: number): string {
  return Math.round(v)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}

/** Columna que "crece desde la base": esquinas cuadradas abajo, redondeadas arriba. */
function trazoColumna(x: number, y: number, w: number, h: number, r: number): string {
  if (h <= 0.4) return "";
  const rr = Math.max(0, Math.min(r, w / 2, h / 2));
  if (rr < 0.4) return `M${x},${y + h} V${y} H${x + w} V${y + h} Z`;
  return `M${x},${y + h} V${y + rr} A${rr},${rr} 0 0 1 ${x + rr},${y} H${x + w - rr} A${rr},${rr} 0 0 1 ${x + w},${y + rr} V${y + h} Z`;
}

export function GraficoBarrasJugadores({ filas, unidad }: { filas: FilaBarra[]; unidad: string }) {
  const sufijo = unidad ? ` ${unidad}` : "";

  const ordenadas = [...filas].sort((a, b) => {
    if (a.valor == null && b.valor == null) return a.nombre.localeCompare(b.nombre);
    if (a.valor == null) return 1;
    if (b.valor == null) return -1;
    return b.valor - a.valor;
  });

  const conDato = ordenadas.filter((f): f is FilaBarra & { valor: number } => f.valor != null);
  // Promedio del plantel: solo jugadores "comparables" ese día (sesión completa) cuando hay dato.
  const comparables = conDato.filter((f) => f.comparable);
  const base = comparables.length ? comparables : conDato;
  const promedio = base.length ? base.reduce((s, f) => s + f.valor, 0) / base.length : null;

  const ancho = PAD_IZQ + PAD_DER + ordenadas.length * ANCHO_GRUPO;
  const maxVal = Math.max(1, promedio ?? 0, ...ordenadas.map((f) => f.valor ?? 0)) * 1.15;
  const y = (v: number) => ALTO - PAD_INF - (Math.max(0, v) / maxVal) * (ALTO - PAD_SUP - PAD_INF);

  return (
    <div>
      <svg viewBox={`0 0 ${ancho} ${ALTO}`} width="100%" preserveAspectRatio="xMidYMid meet" role="img" style={{ fontFamily: "inherit" }}>
        {Array.from({ length: DIVISIONES + 1 }, (_, g) => {
          const valor = (maxVal * g) / DIVISIONES;
          const gy = y(valor);
          return (
            <g key={g}>
              <line x1={PAD_IZQ} y1={gy} x2={ancho - PAD_DER} y2={gy} stroke="var(--border)" strokeWidth={1} />
              <text x={PAD_IZQ - 6} y={gy + 3} textAnchor="end" fontSize={11} fill="var(--foreground)" fillOpacity={0.6}>
                {compacto(valor)}
                {sufijo}
              </text>
            </g>
          );
        })}

        {ordenadas.map((f, i) => {
          const cx = PAD_IZQ + ANCHO_GRUPO * (i + 0.5);
          const arriba = y(f.valor ?? 0);
          const altoColumna = ALTO - PAD_INF - arriba;
          const ejeX = ALTO - PAD_INF + 12;
          return (
            <g key={f.nombre}>
              {f.valor != null && altoColumna > 0.4 && (
                <path d={trazoColumna(cx - ANCHO_BARRA / 2, arriba, ANCHO_BARRA, altoColumna, 3)} fill={COLOR_BARRA}>
                  <title>{`${f.nombre}: ${compacto(f.valor)}${sufijo}`}</title>
                </path>
              )}
              {f.valor != null && (
                <text x={cx} y={arriba - 4} fontSize={10.5} fontWeight={600} textAnchor="middle" fill="var(--foreground)">
                  {compacto(f.valor)}
                </text>
              )}
              <text
                x={cx}
                y={ejeX}
                fontSize={11}
                textAnchor="end"
                transform={`rotate(-45 ${cx} ${ejeX})`}
                fill="var(--foreground)"
                fillOpacity={f.valor == null ? 0.5 : 1}
              >
                <title>{f.valor == null ? `${f.nombre}: sin datos ese día` : f.nombre}</title>
                {abreviarNombre(f.nombre)}
              </text>
            </g>
          );
        })}

        <line x1={PAD_IZQ} y1={ALTO - PAD_INF} x2={ancho - PAD_DER} y2={ALTO - PAD_INF} stroke="var(--foreground)" strokeOpacity={0.5} strokeWidth={1} />

        {promedio != null && (
          <g>
            <line x1={PAD_IZQ} y1={y(promedio)} x2={ancho - PAD_DER} y2={y(promedio)} stroke={COLOR_PROMEDIO} strokeWidth={1.5}>
              <title>{`Promedio: ${compacto(promedio)}${sufijo}`}</title>
            </line>
            <text x={ancho - PAD_DER} y={y(promedio) - 4} textAnchor="end" fontSize={11} fontWeight={600} fill={COLOR_PROMEDIO}>
              promedio {compacto(promedio)}
              {sufijo}
            </text>
          </g>
        )}
      </svg>

      <div className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-sm text-foreground/70">
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: COLOR_BARRA }} />
          Valor del día
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: COLOR_SIN_DATOS }} />
          Sin datos
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: COLOR_PROMEDIO }} />
          Promedio del plantel
        </span>
      </div>
    </div>
  );
}

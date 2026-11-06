// Cálculos de carga externa GPS, portados 1 a 1 de dashboard.html de la plantilla del preparador
// físico (playerDailySeries / ewma / acwrSeries / acwrColor / diasSinVmax90). Son funciones puras
// (sin base de datos ni fechas implícitas: "hoy" siempre entra por parámetro) para poder comprobar
// que dan exactamente lo mismo que el original sobre los mismos datos.

export const VARIABLES_ACWR = ["DIST", "HSR", "D_SPR"] as const;
export type VariableAcwr = (typeof VARIABLES_ACWR)[number];

/** Carga de un jugador en un día calendario (suma de todas las sesiones de ese día). */
export type DiaCarga = {
  DIST: number;
  HSR: number;
  D_SPR: number;
  ACE: number;
  DES: number;
  /** Pico de velocidad del día (km/h). No se suma entre sesiones: queda el mayor. */
  maxSpeed: number | null;
};

/** nombre del jugador (como lo manda el proveedor GPS) -> fecha ISO -> carga de ese día. */
export type CargaDiaria = Map<string, Map<string, DiaCarga>>;

export const ETIQUETAS_VARIABLE: Record<VariableAcwr, string> = {
  DIST: "Distancia",
  HSR: "HSR",
  D_SPR: "D. Sprint",
};

// EWMA agudo (7 días) y crónico (28 días): λ = 2 / (N + 1).
export const LAMBDA_AGUDO = 2 / (7 + 1);
export const LAMBDA_CRONICO = 2 / (28 + 1);

// ---------- posiciones (códigos propios del preparador) ----------
export const POSICIONES = ["2.CEN", "3.LAT", "4.MC", "5.INT", "6.EXT", "8.PUNT"] as const;
export type Posicion = (typeof POSICIONES)[number] | "N/D";

export const ETIQUETA_POSICION: Record<Posicion, string> = {
  "2.CEN": "DFC",
  "3.LAT": "LAT",
  "4.MC": "MC",
  "5.INT": "MCO",
  "6.EXT": "EXT",
  "8.PUNT": "DC",
  "N/D": "Sin posición",
};

export const COLOR_POSICION: Record<Posicion, string> = {
  "2.CEN": "#3b82f6",
  "3.LAT": "#10b981",
  "4.MC": "#f59e0b",
  "5.INT": "#8b5cf6",
  "6.EXT": "#ec4899",
  "8.PUNT": "#ef4444",
  "N/D": "#6b7280",
};

// ---------- fechas (aritmética en UTC, sin depender de la zona horaria de la máquina) ----------
function aMs(iso: string): number {
  const [y, m, d] = iso.split("-").map(Number);
  return Date.UTC(y, m - 1, d);
}

function deMs(ms: number): string {
  return new Date(ms).toISOString().slice(0, 10);
}

export function sumarDias(iso: string, n: number): string {
  return deMs(aMs(iso) + n * 86_400_000);
}

export function diasEntre(desde: string, hasta: string): number {
  return Math.round((aMs(hasta) - aMs(desde)) / 86_400_000);
}

/** Todas las fechas ISO entre `desde` y `hasta`, ambas incluidas. */
export function rangoFechas(desde: string, hasta: string): string[] {
  const out: string[] = [];
  for (let ms = aMs(desde); ms <= aMs(hasta); ms += 86_400_000) out.push(deMs(ms));
  return out;
}

/** Fecha de hoy según el calendario local de la máquina (no UTC: de noche UTC ya es "mañana"). */
export function hoyIso(ahora: Date = new Date()): string {
  return `${ahora.getFullYear()}-${String(ahora.getMonth() + 1).padStart(2, "0")}-${String(ahora.getDate()).padStart(2, "0")}`;
}

// ---------- ACWR ----------
export type PuntoDiario = { fecha: string; valor: number };

/** Serie diaria continua desde el primer día con datos hasta `hasta`; los días sin dato valen 0
 * (igual que el original: un día sin sesión es carga cero para el EWMA). */
export function serieDiaria(dias: Map<string, DiaCarga>, variable: VariableAcwr, hasta: string): PuntoDiario[] {
  const fechas = Array.from(dias.keys()).sort();
  if (fechas.length === 0) return [];
  return rangoFechas(fechas[0], hasta).map((fecha) => ({ fecha, valor: dias.get(fecha)?.[variable] ?? 0 }));
}

export function ewma(valores: number[], lambda: number): number[] {
  const out: number[] = [];
  let actual = valores.length ? valores[0] : 0;
  valores.forEach((v, i) => {
    actual = i === 0 ? v : v * lambda + actual * (1 - lambda);
    out.push(actual);
  });
  return out;
}

export type PuntoAcwr = { fecha: string; agudo: number; cronico: number; acwr: number | null };

export function acwrSerie(dias: Map<string, DiaCarga>, variable: VariableAcwr, hasta: string): PuntoAcwr[] {
  const serie = serieDiaria(dias, variable, hasta);
  const valores = serie.map((p) => p.valor);
  const agudo = ewma(valores, LAMBDA_AGUDO);
  const cronico = ewma(valores, LAMBDA_CRONICO);
  return serie.map((p, i) => ({
    fecha: p.fecha,
    agudo: agudo[i],
    cronico: cronico[i],
    acwr: cronico[i] > 0 ? agudo[i] / cronico[i] : null,
  }));
}

/** ACWR más reciente (a la fecha `hasta`) o null si no hay datos / crónico en cero. */
export function acwrActual(dias: Map<string, DiaCarga>, variable: VariableAcwr, hasta: string): number | null {
  const serie = acwrSerie(dias, variable, hasta);
  return serie.length ? serie[serie.length - 1].acwr : null;
}

export type BandaAcwr = "baja" | "objetivo" | "precaucion" | "riesgo" | "sin-datos";

/** Bandas de la plantilla (Gabbett 2016, Hulin et al. 2016): <0.8 baja · 0.8–1.3 objetivo ·
 * 1.3–1.5 precaución · >1.5 riesgo alto. */
export function bandaAcwr(v: number | null): BandaAcwr {
  if (v == null) return "sin-datos";
  if (v < 0.8) return "baja";
  if (v <= 1.3) return "objetivo";
  if (v <= 1.5) return "precaucion";
  return "riesgo";
}

// ---------- velocidad máxima ----------
export type EstadoVmax = {
  /** Días desde el último día en que llegó al 90% de su VMAX de referencia. */
  dias: number;
  ultimoDia: string;
  vmaxReferencia: number;
  fechaReferencia: string;
  umbral: number;
};

/** Referencia = el pico de velocidad más alto del historial cargado (no el techo real de toda la
 * carrera). Devuelve null si el jugador no tiene ningún dato de velocidad. */
export function diasSinVmax90(dias: Map<string, DiaCarga>, hoy: string): EstadoVmax | null {
  const conVelocidad = Array.from(dias.entries())
    .filter(([, d]) => d.maxSpeed != null)
    .sort(([a], [b]) => a.localeCompare(b)) as [string, DiaCarga & { maxSpeed: number }][];
  if (conVelocidad.length === 0) return null;

  let referencia = conVelocidad[0][1].maxSpeed;
  let fechaReferencia = conVelocidad[0][0];
  for (const [fecha, d] of conVelocidad) {
    if (d.maxSpeed > referencia) {
      referencia = d.maxSpeed;
      fechaReferencia = fecha;
    }
  }

  const umbral = referencia * 0.9;
  const aciertos = conVelocidad.filter(([, d]) => d.maxSpeed >= umbral);
  // El propio día de referencia siempre alcanza el umbral, así que `aciertos` nunca queda vacío.
  const ultimoDia = aciertos[aciertos.length - 1][0];
  return { dias: diasEntre(ultimoDia, hoy), ultimoDia, vmaxReferencia: referencia, fechaReferencia, umbral };
}

export type SeveridadVmax = "ok" | "atencion" | "alerta";

export function severidadVmax(dias: number): SeveridadVmax {
  if (dias < 7) return "ok";
  if (dias < 14) return "atencion";
  return "alerta";
}

// ---------- instantánea del último día (gráficas de barras por jugador) ----------
/** Variables que se grafican por jugador, con la etiqueta y unidad de la plantilla. */
export const VARIABLES_BARRAS = ["DIST", "HSR", "D_SPR", "ACE", "DES"] as const;
export type VariableBarras = (typeof VARIABLES_BARRAS)[number];

export const ETIQUETA_BARRAS: Record<VariableBarras, { titulo: string; unidad: string }> = {
  DIST: { titulo: "Distancia total (m)", unidad: "m" },
  HSR: { titulo: "HSR >20km/h (m)", unidad: "m" },
  D_SPR: { titulo: "Dist. Sprint >25km/h (m)", unidad: "m" },
  ACE: { titulo: "Aceleraciones (n)", unidad: "" },
  DES: { titulo: "Desaceleraciones (n)", unidad: "" },
};

/** "SEBASTIAN COATES" -> "S.COATES" (inicial del primer nombre + último apellido). */
export function abreviarNombre(nombre: string): string {
  const partes = nombre.trim().split(/\s+/);
  if (partes.length < 2) return nombre;
  return `${partes[0][0]}.${partes[partes.length - 1]}`;
}

// Un jugador es "comparable" ese día si su distancia llega al 70% de la mediana del plantel: así las
// sesiones diferenciadas o reducidas (lesionados, trabajo aparte) no distorsionan el promedio.
export const UMBRAL_COMPARABLE = 0.7;

export type FilaBarra = { nombre: string; valor: number | null; comparable: boolean };

/** Una fila por jugador con el valor crudo de `fecha` (null si ese día no tiene dato). */
export function instantaneaDia(carga: CargaDiaria, nombres: string[], fecha: string, variable: VariableBarras): FilaBarra[] {
  const distancias = nombres
    .map((n) => carga.get(n)?.get(fecha)?.DIST)
    .filter((d): d is number => d != null)
    .sort((a, b) => a - b);
  let umbral = 0;
  if (distancias.length) {
    const n = distancias.length;
    const mediana = n % 2 ? distancias[(n - 1) / 2] : (distancias[n / 2 - 1] + distancias[n / 2]) / 2;
    umbral = mediana * UMBRAL_COMPARABLE;
  }
  return nombres.map((nombre) => {
    const dia = carga.get(nombre)?.get(fecha);
    return { nombre, valor: dia ? dia[variable] : null, comparable: dia ? dia.DIST >= umbral : true };
  });
}

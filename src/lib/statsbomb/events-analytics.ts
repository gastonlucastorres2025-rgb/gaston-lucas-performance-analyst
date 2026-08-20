import type { StatsBombEvent, StatsBombLineup } from "@/lib/statsbomb/types";

/**
 * Analítica derivada de Events v10, evento por evento. Coordenadas StatsBomb:
 * pitch 120 (x, hacia el arco rival) x 80 (y), origen esquina superior
 * izquierda del equipo atacante. Todo lo de acá se calcula sobre eventos
 * reales — no hay valores inventados.
 */

export type ShotMapEntry = {
  location: [number, number];
  xg: number;
  outcome: string;
  bodyPart: string;
  playPattern: string;
  isGoal: boolean;
  playerId: number | null;
  playerName: string | null;
};

export function extractShotMap(events: StatsBombEvent[], teamId: number): ShotMapEntry[] {
  return events
    .filter((e) => e.type.name === "Shot" && e.team.id === teamId && e.shot && e.location)
    .map((e) => ({
      location: e.location as [number, number],
      xg: e.shot!.statsbomb_xg,
      outcome: e.shot!.outcome.name,
      bodyPart: e.shot!.body_part.name,
      playPattern: e.play_pattern.name,
      isGoal: e.shot!.outcome.name === "Goal",
      playerId: e.player?.id ?? null,
      playerName: e.player?.name ?? null,
    }));
}

export type Rematador = {
  playerId: number;
  nombre: string;
  /** Remates y xG SÍ son de la muestra (StatsBomb no publica remates por temporada completa). */
  remates: number;
  xgTotal: number;
  /** Goles de la muestra (6 partidos) — se mantiene para no perder el dato, pero la tabla muestra `golesTemporada`. */
  goles: number;
  /** Goles reales de TODA la temporada (Player Season Stats: goals_90 × minutos reales), no solo de la muestra —
   * se completa después en report-data.ts, que sí tiene el mapa de temporada por jugador. null hasta entonces. */
  golesTemporada: number | null;
};

/** Top rematadores reales de la muestra analizada (StatsBomb Events) — no hay conteo de remates por temporada en Player Season Stats. */
export function topRematadores(shots: ShotMapEntry[], top = 6): Rematador[] {
  const porJugador = new Map<number, Rematador>();
  for (const s of shots) {
    if (s.playerId === null || s.playerName === null) continue;
    const actual = porJugador.get(s.playerId) ?? { playerId: s.playerId, nombre: s.playerName, remates: 0, goles: 0, xgTotal: 0, golesTemporada: null };
    actual.remates++;
    actual.xgTotal += s.xg;
    if (s.isGoal) actual.goles++;
    porJugador.set(s.playerId, actual);
  }
  return [...porJugador.values()].sort((a, b) => b.remates - a.remates).slice(0, top);
}

export type PassNetworkNode = {
  playerId: number;
  playerName: string;
  avgLocation: [number, number];
  passesCompleted: number;
  /** Se completa después, en report-data.ts (necesita los Lineups, que extractPassNetwork no recibe). null hasta entonces. */
  dorsal: number | null;
};

export type PassNetworkEdge = { fromPlayerId: number; toPlayerId: number; count: number };

export type PassNetwork = { nodes: PassNetworkNode[]; edges: PassNetworkEdge[] };

/** Solo pases completados (sin outcome = exitoso, convención StatsBomb) con receptor identificado. */
export function extractPassNetwork(events: StatsBombEvent[], teamId: number): PassNetwork {
  const posSum = new Map<number, { x: number; y: number; n: number; name: string }>();
  const edgeCount = new Map<string, number>();

  for (const e of events) {
    if (e.type.name !== "Pass" || e.team.id !== teamId || !e.pass || !e.player || !e.location) continue;
    if (e.pass.outcome) continue; // incompleto/fuera/offside
    const recipient = e.pass.recipient;
    if (!recipient) continue;

    const cur = posSum.get(e.player.id) ?? { x: 0, y: 0, n: 0, name: e.player.name };
    cur.x += e.location[0];
    cur.y += e.location[1];
    cur.n += 1;
    posSum.set(e.player.id, cur);

    const key = `${e.player.id}-${recipient.id}`;
    edgeCount.set(key, (edgeCount.get(key) ?? 0) + 1);
  }

  const nodes: PassNetworkNode[] = [...posSum.entries()].map(([playerId, v]) => ({
    playerId,
    playerName: v.name,
    avgLocation: [v.x / v.n, v.y / v.n],
    passesCompleted: v.n,
    dorsal: null,
  }));

  // Solo conexiones con al menos 2 pases, para que la red sea legible (no saturada).
  const edges: PassNetworkEdge[] = [...edgeCount.entries()]
    .filter(([, count]) => count >= 2)
    .map(([key, count]) => {
      const [fromPlayerId, toPlayerId] = key.split("-").map(Number);
      return { fromPlayerId, toPlayerId, count };
    });

  return { nodes, edges };
}

// --- Pases clave de TODA la temporada (no solo la muestra de 6 partidos): asistencias reales (pass.goal_assist) ---
// --- vs. pases previos a un remate que no terminó en gol (pass.shot_assist sin goal_assist) — campos reales de ---
// --- StatsBomb Events v10, verificados contra datos reales antes de usarlos. ---
export type PasesClaveTemporada = {
  totalPartidos: number;
  asistencias: { total: number; campograma: ZonaCampograma[] };
  pasesPreviosSinGol: { total: number; campograma: ZonaCampograma[] };
};

/** Recibe eventos YA descargados de todos los partidos disponibles de la temporada (no solo la muestra) — la
 * descarga en sí (Promise.all sobre cada match_id) la hace report-data.ts, que tiene el conector. */
export function pasesClaveDeTemporada(eventosPorPartido: StatsBombEvent[][], teamId: number): PasesClaveTemporada {
  const asistenciasUbic: [number, number][] = [];
  const previosUbic: [number, number][] = [];
  for (const eventos of eventosPorPartido) {
    for (const e of eventos) {
      if (e.type.name !== "Pass" || e.team.id !== teamId || !e.pass || !e.location) continue;
      if (e.pass.goal_assist) asistenciasUbic.push(e.location);
      else if (e.pass.shot_assist) previosUbic.push(e.location);
    }
  }
  return {
    totalPartidos: eventosPorPartido.length,
    asistencias: { total: asistenciasUbic.length, campograma: campogramaDeUbicaciones(asistenciasUbic, 3, 3) },
    pasesPreviosSinGol: { total: previosUbic.length, campograma: campogramaDeUbicaciones(previosUbic, 3, 3) },
  };
}

export type ZonaEtiqueta = "defensiva" | "media" | "ofensiva";

/** Agrupa ubicaciones en 3 franjas verticales de la cancha (tercios), para lectura simple sin saturar. */
export function zonaDelTercio(x: number): ZonaEtiqueta {
  if (x < 40) return "defensiva";
  if (x < 80) return "media";
  return "ofensiva";
}

export type CanalEtiqueta = "izquierdo" | "central" | "derecho";

/** Canal vertical de la cancha (StatsBomb y 0-80, origen desde la perspectiva del equipo atacante). */
export function canalDeCancha(y: number): CanalEtiqueta {
  if (y < 80 / 3) return "izquierdo";
  if (y < (80 * 2) / 3) return "central";
  return "derecho";
}

// --- Formación: código StatsBomb (ej. 4231) <-> representación legible ---
export function formacionARows(codigo: number | null): number[] | null {
  if (codigo === null) return null;
  const digitos = String(codigo)
    .split("")
    .map((d) => Number(d));
  if (digitos.some((d) => Number.isNaN(d) || d <= 0)) return null;
  if (digitos.reduce((a, b) => a + b, 0) !== 10) return null;
  return digitos;
}

export function formacionATexto(codigo: number | null): string {
  if (codigo === null) return "s/d";
  const filas = formacionARows(codigo);
  return filas ? filas.join("-") : String(codigo);
}

// --- Campograma genérico: grilla de zonas (StatsBomb 120x80) con conteo de ubicaciones ---
export type ZonaCampograma = { fila: number; columna: number; conteo: number; porcentaje: number };

/** Divide la cancha en `filas` (a lo ancho, y) x `columnas` (a lo largo, x) y cuenta ubicaciones reales por celda. */
export function campogramaDeUbicaciones(ubicaciones: [number, number][], filas: number, columnas: number): ZonaCampograma[] {
  const total = ubicaciones.length;
  const celdas: ZonaCampograma[][] = Array.from({ length: filas }, (_, f) =>
    Array.from({ length: columnas }, (_, c) => ({ fila: f, columna: c, conteo: 0, porcentaje: 0 })),
  );
  for (const [x, y] of ubicaciones) {
    const f = Math.min(filas - 1, Math.max(0, Math.floor((y / 80) * filas)));
    const c = Math.min(columnas - 1, Math.max(0, Math.floor((x / 120) * columnas)));
    celdas[f][c].conteo++;
  }
  const planas = celdas.flat();
  if (total > 0) for (const celda of planas) celda.porcentaje = Math.round((celda.conteo / total) * 100);
  return planas;
}

// --- Transiciones: origen real de las jugadas de contraataque (play_pattern "From Counter") ---
/** Ubicación del primer evento de cada posesión marcada como contraataque — el punto real donde nace la jugada. */
export function origenesDeContraataque(events: StatsBombEvent[], teamId: number): [number, number][] {
  const porPosesion = new Map<number, StatsBombEvent[]>();
  for (const e of events) {
    if (e.team.id !== teamId || e.play_pattern.name !== "From Counter" || !e.location) continue;
    if (!porPosesion.has(e.possession)) porPosesion.set(e.possession, []);
    porPosesion.get(e.possession)!.push(e);
  }
  const origenes: [number, number][] = [];
  for (const eventosPosesion of porPosesion.values()) {
    const primero = [...eventosPosesion].sort((a, b) => a.index - b.index)[0];
    if (primero.location) origenes.push(primero.location);
  }
  return origenes;
}

export type JugadorTransicion = { playerId: number; nombre: string; participaciones: number };

/** Jugadores con más participaciones (pase, conducción, regate o remate) en posesiones de contraataque real. */
export function jugadoresEnTransicion(events: StatsBombEvent[], teamId: number): JugadorTransicion[] {
  const TIPOS = new Set(["Carry", "Pass", "Dribble", "Shot"]);
  const conteo = new Map<number, { nombre: string; n: number }>();
  for (const e of events) {
    if (e.team.id !== teamId || e.play_pattern.name !== "From Counter" || !e.player || !TIPOS.has(e.type.name)) continue;
    const cur = conteo.get(e.player.id) ?? { nombre: e.player.name, n: 0 };
    cur.n++;
    conteo.set(e.player.id, cur);
  }
  return [...conteo.entries()]
    .map(([playerId, v]) => ({ playerId, nombre: v.nombre, participaciones: v.n }))
    .sort((a, b) => b.participaciones - a.participaciones)
    .slice(0, 5);
}

function timestampASegundos(ts: string): number {
  const [h, m, s] = ts.split(":").map(Number);
  return h * 3600 + m * 60 + s;
}

// --- Recuperaciones en campo rival: Ball Recovery reales, filtradas a la mitad de cancha del rival (x >= 60, ---
// --- mismo corte que StatsBomb usa para "fhalf" en team_match_fhalf_pressures) — pedido explícito del usuario. ---
export type RecuperacionesCampoRival = {
  totalCampoRival: number;
  campograma: ZonaCampograma[];
  porJugador: { playerId: number; nombre: string; recuperaciones: number }[];
};

export function recuperacionesEnCampoRival(events: StatsBombEvent[], teamId: number): RecuperacionesCampoRival {
  const recuperaciones = events.filter(
    (e) => e.type.name === "Ball Recovery" && e.team.id === teamId && e.location && e.location[0] >= 60 && e.player,
  );
  const porJugadorMap = new Map<number, { nombre: string; n: number }>();
  for (const r of recuperaciones) {
    const actual = porJugadorMap.get(r.player!.id) ?? { nombre: r.player!.name, n: 0 };
    actual.n++;
    porJugadorMap.set(r.player!.id, actual);
  }
  return {
    totalCampoRival: recuperaciones.length,
    campograma: campogramaDeUbicaciones(
      recuperaciones.map((r) => r.location as [number, number]),
      3,
      3,
    ),
    porJugador: [...porJugadorMap.entries()]
      .map(([playerId, v]) => ({ playerId, nombre: v.nombre, recuperaciones: v.n }))
      .sort((a, b) => b.recuperaciones - a.recuperaciones)
      .slice(0, 8),
  };
}

// --- Presión: mapa real de eventos "Pressure" y una aproximación real de eficacia (no StatsBomb no expone un ---
// --- campo "outcome" para Pressure, así que se infiere de si el mismo equipo recupera la pelota poco después) ---
export type MapaPresion = {
  totalPresiones: number;
  campograma: ZonaCampograma[];
  presionesConRecuperacionPct: number;
};

/**
 * StatsBomb no marca un "éxito" en el evento Pressure en sí. Se considera real (no inventada) la presión que fue
 * seguida, dentro de `ventanaSegundos` y el mismo período de juego, por una Ball Recovery del mismo equipo o una
 * Interception ganada (`outcome.name === "Won"`) — ambos son eventos reales, solo se los liga por tiempo real.
 */
export function mapaPresion(events: StatsBombEvent[], teamId: number, ventanaSegundos = 5): MapaPresion | null {
  const presiones = events.filter((e) => e.type.name === "Pressure" && e.team.id === teamId && e.location);
  if (presiones.length === 0) return null;

  const campograma = campogramaDeUbicaciones(
    presiones.map((p) => p.location as [number, number]),
    3,
    3,
  );

  let conRecuperacion = 0;
  for (const p of presiones) {
    const inicio = timestampASegundos(p.timestamp);
    const huboRecuperacion = events.some((e) => {
      if (e.period !== p.period || e.team.id !== teamId) return false;
      const t = timestampASegundos(e.timestamp);
      if (t < inicio || t > inicio + ventanaSegundos) return false;
      return e.type.name === "Ball Recovery" || (e.type.name === "Interception" && e.interception?.outcome.name === "Won");
    });
    if (huboRecuperacion) conRecuperacion++;
  }

  return {
    totalPresiones: presiones.length,
    campograma,
    presionesConRecuperacionPct: Math.round((conRecuperacion / presiones.length) * 100),
  };
}

// --- Estado del marcador: métricas reales del equipo separadas por si iba ganando/empatando/perdiendo en cada tramo ---
export type EstadoMarcador = "ganando" | "empatando" | "perdiendo";
export type MetricasPorEstado = {
  estado: EstadoMarcador;
  minutosTotales: number;
  xgTotal: number;
  remates: number;
  xgConcedido: number;
  rematesConcedidos: number;
  ataquesRapidos: number;
  duracionPromedioPosesionSeg: number | null;
};

/**
 * Reconstruye el marcador real minuto a minuto (goles reales, Shot con outcome "Goal") para separar xG, remates,
 * contraataques reales y duración real de posesión según si el equipo iba ganando/empatando/perdiendo en ese
 * tramo del partido. No incluye posesión (%) ni PPDA: StatsBomb no publica la fórmula exacta que usa para esos
 * agregados y replicarla por tramo de tiempo sería inventar un número, no medirlo — se prefiere omitirlos.
 * No contempla goles en contra (StatsBomb Events no los modela como evento propio en este proyecto), así que en
 * partidos con gol en contra el marcador reconstruido puede quedar levemente desalineado del resultado real.
 */
export function estadoDelMarcador(eventosPorPartido: StatsBombEvent[][], teamId: number): MetricasPorEstado[] | null {
  const acumulado: Record<
    EstadoMarcador,
    { minutos: number; xg: number; remates: number; xgConcedido: number; rematesConcedidos: number; ataquesRapidos: number; duraciones: number[] }
  > = {
    ganando: { minutos: 0, xg: 0, remates: 0, xgConcedido: 0, rematesConcedidos: 0, ataquesRapidos: 0, duraciones: [] },
    empatando: { minutos: 0, xg: 0, remates: 0, xgConcedido: 0, rematesConcedidos: 0, ataquesRapidos: 0, duraciones: [] },
    perdiendo: { minutos: 0, xg: 0, remates: 0, xgConcedido: 0, rematesConcedidos: 0, ataquesRapidos: 0, duraciones: [] },
  };
  let huboPartidoValido = false;

  for (const eventosPartido of eventosPorPartido) {
    if (eventosPartido.length === 0) continue;
    const ordenados = [...eventosPartido].sort((a, b) => a.index - b.index);
    const goles = ordenados.filter((e) => e.type.name === "Shot" && e.shot?.outcome.name === "Goal");

    let golesRival = 0;
    let golesOtro = 0;
    const estadoActual = (): EstadoMarcador => (golesRival > golesOtro ? "ganando" : golesRival < golesOtro ? "perdiendo" : "empatando");

    const segmentos: { desdeIndex: number; hastaIndex: number; estado: EstadoMarcador }[] = [];
    let cursor = ordenados[0].index;
    for (const gol of goles) {
      segmentos.push({ desdeIndex: cursor, hastaIndex: gol.index, estado: estadoActual() });
      if (gol.team.id === teamId) golesRival++;
      else golesOtro++;
      cursor = gol.index;
    }
    segmentos.push({ desdeIndex: cursor, hastaIndex: ordenados[ordenados.length - 1].index + 1, estado: estadoActual() });
    huboPartidoValido = true;

    const posesionesYaContadas = new Set<number>();
    for (const seg of segmentos) {
      const eventosSegmento = ordenados.filter((e) => e.index >= seg.desdeIndex && e.index < seg.hastaIndex);
      if (eventosSegmento.length === 0) continue;
      const eventosRivalSegmento = eventosSegmento.filter((e) => e.team.id === teamId);

      acumulado[seg.estado].minutos += Math.max(
        0,
        eventosSegmento[eventosSegmento.length - 1].minute - eventosSegmento[0].minute,
      );

      for (const e of eventosSegmento) {
        if (e.type.name !== "Shot" || !e.shot) continue;
        if (e.team.id === teamId) {
          acumulado[seg.estado].remates++;
          acumulado[seg.estado].xg += e.shot.statsbomb_xg;
        } else {
          acumulado[seg.estado].rematesConcedidos++;
          acumulado[seg.estado].xgConcedido += e.shot.statsbomb_xg;
        }
      }

      const posesionesContraataque = new Set(
        eventosRivalSegmento.filter((e) => e.play_pattern.name === "From Counter").map((e) => e.possession),
      );
      for (const posId of posesionesContraataque) {
        const primerEvento = ordenados.find((e) => e.possession === posId && e.team.id === teamId && e.play_pattern.name === "From Counter");
        if (primerEvento && primerEvento.index >= seg.desdeIndex && primerEvento.index < seg.hastaIndex) acumulado[seg.estado].ataquesRapidos++;
      }

      for (const e of eventosSegmento) {
        if (posesionesYaContadas.has(e.possession)) continue;
        posesionesYaContadas.add(e.possession);
        const eventosPosesion = ordenados.filter((ev) => ev.possession === e.possession);
        if (eventosPosesion.length < 2) continue;
        const inicio = timestampASegundos(eventosPosesion[0].timestamp);
        const ultimo = eventosPosesion[eventosPosesion.length - 1];
        const fin = timestampASegundos(ultimo.timestamp) + (ultimo.duration ?? 0);
        acumulado[seg.estado].duraciones.push(Math.max(0, fin - inicio));
      }
    }
  }

  if (!huboPartidoValido) return null;
  return (["ganando", "empatando", "perdiendo"] as EstadoMarcador[]).map((estado) => {
    const a = acumulado[estado];
    return {
      estado,
      minutosTotales: Math.round(a.minutos),
      xgTotal: a.xg,
      remates: a.remates,
      xgConcedido: a.xgConcedido,
      rematesConcedidos: a.rematesConcedidos,
      ataquesRapidos: a.ataquesRapidos,
      duracionPromedioPosesionSeg: a.duraciones.length > 0 ? a.duraciones.reduce((x, y) => x + y, 0) / a.duraciones.length : null,
    };
  });
}

// --- Balón parado: quién ejecuta y quién recibe córners reales ---

export type EjecutorAbp = {
  playerId: number;
  nombre: string;
  ejecuciones: number;
  ladoIzquierdoPct: number;
  remates: number;
  efectividadPct: number;
};

/**
 * Ejecutores de córner (evento Pass real, solo tiros de esquina — se pidió sacar los tiros libres de este
 * sector) y de qué lado de la cancha ejecutan más (coordenada y real). Efectividad = % de sus córners que
 * terminaron en un remate real del equipo dentro de la misma posesión (StatsBomb `possession`).
 */
export function ejecutoresAbp(events: StatsBombEvent[], teamId: number): EjecutorAbp[] {
  const porJugador = new Map<number, { nombre: string; total: number; izquierda: number; remates: number }>();
  for (const e of events) {
    if (e.team.id !== teamId || e.type.name !== "Pass" || !e.player || !e.location) continue;
    if (e.play_pattern.name !== "From Corner") continue;
    const cur = porJugador.get(e.player.id) ?? { nombre: e.player.name, total: 0, izquierda: 0, remates: 0 };
    cur.total++;
    if (e.location[1] < 40) cur.izquierda++;
    if (events.some((ev) => ev.possession === e.possession && ev.team.id === teamId && ev.type.name === "Shot")) cur.remates++;
    porJugador.set(e.player.id, cur);
  }
  return [...porJugador.entries()]
    .map(([playerId, v]) => ({
      playerId,
      nombre: v.nombre,
      ejecuciones: v.total,
      ladoIzquierdoPct: Math.round((v.izquierda / v.total) * 100),
      remates: v.remates,
      efectividadPct: Math.round((v.remates / v.total) * 100),
    }))
    .sort((a, b) => b.ejecuciones - a.ejecuciones)
    .slice(0, 5);
}

export type ReceptorAbp = { playerId: number; nombre: string; recepciones: number };

/** Receptores reales (pass.recipient) de córners — solo pases con receptor identificado, sin inferir. */
export function receptoresAbp(events: StatsBombEvent[], teamId: number): ReceptorAbp[] {
  const porJugador = new Map<number, { nombre: string; n: number }>();
  for (const e of events) {
    if (e.team.id !== teamId || e.type.name !== "Pass" || !e.pass?.recipient) continue;
    if (e.play_pattern.name !== "From Corner") continue;
    const r = e.pass.recipient;
    const cur = porJugador.get(r.id) ?? { nombre: r.name, n: 0 };
    cur.n++;
    porJugador.set(r.id, cur);
  }
  return [...porJugador.entries()]
    .map(([playerId, v]) => ({ playerId, nombre: v.nombre, recepciones: v.n }))
    .sort((a, b) => b.recepciones - a.recepciones)
    .slice(0, 5);
}

// --- Inicios del arquero: distribución real de saques (Pass con position.name === "Goalkeeper") ---
export type ZonaSaqueArquero = "corta" | "media" | "larga";

/** Corte de longitud real (yardas StatsBomb, misma escala que location 0-120): <15 corta, 15-32 media, >32 larga. */
function zonaLongitudPase(length: number): ZonaSaqueArquero {
  if (length < 15) return "corta";
  if (length < 32) return "media";
  return "larga";
}

export type IniciosArquero = {
  distribucion: { zona: ZonaSaqueArquero; cantidad: number; porcentaje: number }[];
  receptoresTop: { nombre: string; recepciones: number }[];
  zonasDestino: ZonaCampograma[];
  /** Posición real promedio desde donde saca el arquero (StatsBomb x,y). null si ningún pase tiene location. */
  origenPromedio: [number, number] | null;
  /** Cada pase real (origen → destino real, no una zona agregada) — para dibujar las flechas de saque real por real. */
  pases: { origen: [number, number]; destino: [number, number] }[];
};

/** null si el arquero no tiene pases identificables en la muestra (no inventa datos si no hay). */
export function iniciosArquero(events: StatsBombEvent[], teamId: number): IniciosArquero | null {
  const pases = events.filter((e) => e.type.name === "Pass" && e.team.id === teamId && e.position?.name === "Goalkeeper" && e.pass);
  if (pases.length === 0) return null;

  const conteoZona = new Map<ZonaSaqueArquero, number>([
    ["corta", 0],
    ["media", 0],
    ["larga", 0],
  ]);
  const receptores = new Map<number, { nombre: string; n: number }>();
  const destinos: [number, number][] = [];
  const origenes: [number, number][] = [];
  const pasesReales: { origen: [number, number]; destino: [number, number] }[] = [];

  for (const p of pases) {
    const zona = zonaLongitudPase(p.pass!.length);
    conteoZona.set(zona, (conteoZona.get(zona) ?? 0) + 1);
    if (p.pass!.recipient) {
      const r = p.pass!.recipient;
      const cur = receptores.get(r.id) ?? { nombre: r.name, n: 0 };
      cur.n++;
      receptores.set(r.id, cur);
    }
    if (p.pass!.end_location) destinos.push(p.pass!.end_location);
    if (p.location) origenes.push(p.location);
    if (p.location && p.pass!.end_location) pasesReales.push({ origen: p.location, destino: p.pass!.end_location });
  }

  const total = pases.length;
  const distribucion = (["corta", "media", "larga"] as ZonaSaqueArquero[]).map((zona) => ({
    zona,
    cantidad: conteoZona.get(zona) ?? 0,
    porcentaje: Math.round(((conteoZona.get(zona) ?? 0) / total) * 100),
  }));

  const receptoresTop = [...receptores.values()]
    .sort((a, b) => b.n - a.n)
    .slice(0, 5)
    .map((r) => ({ nombre: r.nombre, recepciones: r.n }));

  const origenPromedio: [number, number] | null =
    origenes.length > 0
      ? [origenes.reduce((a, o) => a + o[0], 0) / origenes.length, origenes.reduce((a, o) => a + o[1], 0) / origenes.length]
      : null;

  return { distribucion, receptoresTop, zonasDestino: campogramaDeUbicaciones(destinos, 3, 3), origenPromedio, pases: pasesReales };
}

// --- Pérdidas en los inicios: Dispossessed/Miscontrol reales del equipo en su propio tercio defensivo (zona de ---
// --- construcción/salida), para ver dónde son más vulnerables arrancando la jugada desde atrás. ---
export type PerdidasEnInicio = { total: number; campograma: ZonaCampograma[] };

export function perdidasEnInicio(events: StatsBombEvent[], teamId: number): PerdidasEnInicio | null {
  const perdidas = events.filter(
    (e) =>
      e.team.id === teamId &&
      (e.type.name === "Dispossessed" || e.type.name === "Miscontrol") &&
      e.location &&
      zonaDelTercio(e.location[0]) === "defensiva",
  );
  if (perdidas.length === 0) return null;
  return {
    total: perdidas.length,
    campograma: campogramaDeUbicaciones(
      perdidas.map((p) => p.location as [number, number]),
      3,
      3,
    ),
  };
}

export type FaltaConTarjeta = {
  playerId: number | null;
  nombre: string;
  /** Dorsal real del jugador (Lineups v5) — se completa después en report-data.ts, que tiene el lineup. null hasta entonces. */
  dorsal: number | null;
  minuto: number;
  zona: string | null;
  /** Ubicación real (StatsBomb x,y) de la falta, cuando la tiene — para el campograma. null si no hay (ej. Bad Behaviour). */
  location: [number, number] | null;
  tarjeta: string;
  ofensiva: boolean | null;
};

/**
 * Tarjetas reales: amarillas/rojas ligadas a una falta real (Foul Committed con `card`, incluye ubicación y si
 * fue ofensiva) más las que no tienen falta asociada (Bad Behaviour, ej. protesta — StatsBomb no le da ubicación).
 */
export function disciplinaContextualizada(events: StatsBombEvent[], teamId: number): FaltaConTarjeta[] {
  const resultado: FaltaConTarjeta[] = [];
  for (const e of events) {
    if (e.team.id !== teamId) continue;
    if (e.type.name === "Foul Committed" && e.foul_committed?.card) {
      resultado.push({
        playerId: e.player?.id ?? null,
        nombre: e.player?.name ?? "Jugador sin identificar",
        dorsal: null,
        minuto: e.minute,
        zona: e.location ? `${zonaDelTercio(e.location[0])} ${canalDeCancha(e.location[1])}` : null,
        location: e.location ?? null,
        tarjeta: e.foul_committed.card.name,
        ofensiva: e.foul_committed.offensive ?? null,
      });
    } else if (e.type.name === "Bad Behaviour" && e.bad_behaviour) {
      resultado.push({
        playerId: e.player?.id ?? null,
        nombre: e.player?.name ?? "Jugador sin identificar",
        dorsal: null,
        minuto: e.minute,
        zona: null,
        location: null,
        tarjeta: e.bad_behaviour.card.name,
        ofensiva: null,
      });
    }
  }
  return resultado.sort((a, b) => a.minuto - b.minuto);
}

export type FaltaSinTarjeta = {
  playerId: number | null;
  nombre: string;
  /** Dorsal real del jugador (Lineups v5) — se completa después en report-data.ts. null hasta entonces. */
  dorsal: number | null;
  minuto: number;
  zona: string | null;
  location: [number, number] | null;
  ofensiva: boolean | null;
};

/**
 * Faltas reales (StatsBomb Foul Committed) que NO terminaron en tarjeta — el complemento de
 * `disciplinaContextualizada()`, que solo captura las que sí tuvieron `card`. Pedido explícito del usuario para el
 * campograma de disciplina: mostrar también dónde comete faltas el rival aunque no lo amonesten.
 */
export function faltasSinTarjeta(events: StatsBombEvent[], teamId: number): FaltaSinTarjeta[] {
  const resultado: FaltaSinTarjeta[] = [];
  for (const e of events) {
    if (e.team.id !== teamId) continue;
    if (e.type.name === "Foul Committed" && !e.foul_committed?.card) {
      resultado.push({
        playerId: e.player?.id ?? null,
        nombre: e.player?.name ?? "Jugador sin identificar",
        dorsal: null,
        minuto: e.minute,
        zona: e.location ? `${zonaDelTercio(e.location[0])} ${canalDeCancha(e.location[1])}` : null,
        location: e.location ?? null,
        ofensiva: e.foul_committed?.offensive ?? null,
      });
    }
  }
  return resultado.sort((a, b) => a.minuto - b.minuto);
}

// --- Sustituciones: pares jugador que sale -> jugador que entra, reales (sin lesiones) ---
export type CambioJugador = { saleNombre: string; entraNombre: string; veces: number };

export function sustitucionesHabituales(eventosPorPartido: StatsBombEvent[][], teamId: number): CambioJugador[] {
  const conteo = new Map<string, CambioJugador>();
  for (const eventosPartido of eventosPorPartido) {
    const subs = eventosPartido.filter(
      (e) =>
        e.type.name === "Substitution" &&
        e.team.id === teamId &&
        e.substitution?.outcome.name !== "Injury" &&
        e.player &&
        e.substitution?.replacement,
    );
    for (const s of subs) {
      const saleNombre = s.player!.name;
      const entraNombre = s.substitution!.replacement.name;
      const key = `${saleNombre}→${entraNombre}`;
      const actual = conteo.get(key) ?? { saleNombre, entraNombre, veces: 0 };
      actual.veces++;
      conteo.set(key, actual);
    }
  }
  return [...conteo.values()].sort((a, b) => b.veces - a.veces).slice(0, 5);
}

export type Titularidad = { playerId: number; nombre: string; posicion: string | null; titularidades: number };

/** Cantidad de partidos de la muestra en los que cada jugador fue titular (Starting XI real, StatsBomb Lineups v5) — no infiere convocatoria ni lesiones, solo cuenta apariciones reales. */
export function titularidadesPorJugador(lineupsPorPartido: StatsBombLineup[][], teamId: number): Titularidad[] {
  const conteo = new Map<number, Titularidad>();
  for (const lineupsPartido of lineupsPorPartido) {
    const lineupEquipo = lineupsPartido.find((l) => l.team_id === teamId);
    if (!lineupEquipo) continue;
    for (const jugador of lineupEquipo.lineup) {
      const posInicial = jugador.positions.find((p) => p.start_reason === "Starting XI");
      if (!posInicial) continue;
      const actual = conteo.get(jugador.player_id) ?? {
        playerId: jugador.player_id,
        nombre: jugador.player_name,
        posicion: posInicial.position,
        titularidades: 0,
      };
      actual.titularidades++;
      conteo.set(jugador.player_id, actual);
    }
  }
  return [...conteo.values()].sort((a, b) => b.titularidades - a.titularidades);
}

/**
 * Minutos reales jugados por cada jugador del equipo en la muestra de partidos analizada (no la temporada
 * completa). Se derivan de eventos reales, sin inventar duración de partido: entra en el 0' si arrancó, o en el
 * minuto de su sustitución si ingresó desde el banco; sale en el minuto de su sustitución si salió, o en el
 * último minuto real registrado del partido (StatsBomb Events, incluye descuento real) si lo terminó jugando.
 */
export function minutosPorPartidoMuestra(
  eventosPorPartido: StatsBombEvent[][],
  lineupsPorPartido: StatsBombLineup[][],
  teamId: number,
): Map<number, number> {
  const minutosPorJugador = new Map<number, number>();
  for (let i = 0; i < eventosPorPartido.length; i++) {
    const eventos = eventosPorPartido[i];
    if (eventos.length === 0) continue;
    const finPartido = Math.max(...eventos.map((e) => e.minute));
    const lineupEquipo = lineupsPorPartido[i]?.find((l) => l.team_id === teamId);
    if (!lineupEquipo) continue;

    const entraron = new Map<number, number>();
    const salieron = new Map<number, number>();
    for (const e of eventos) {
      if (e.type.name === "Substitution" && e.team.id === teamId && e.player && e.substitution) {
        salieron.set(e.player.id, e.minute);
        entraron.set(e.substitution.replacement.id, e.minute);
      }
    }

    for (const jugador of lineupEquipo.lineup) {
      const jugoDesdeElInicio = jugador.positions.some((p) => p.start_reason === "Starting XI");
      if (!jugoDesdeElInicio && !entraron.has(jugador.player_id)) continue;
      const entrada = jugoDesdeElInicio ? 0 : entraron.get(jugador.player_id)!;
      const salida = salieron.get(jugador.player_id) ?? finPartido;
      const minutos = Math.max(0, salida - entrada);
      minutosPorJugador.set(jugador.player_id, (minutosPorJugador.get(jugador.player_id) ?? 0) + minutos);
    }
  }
  return minutosPorJugador;
}

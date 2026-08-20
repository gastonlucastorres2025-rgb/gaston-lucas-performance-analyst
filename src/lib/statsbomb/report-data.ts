import { readFileSync } from "node:fs";
import path from "node:path";
import { escudoClubUruguayo } from "@/lib/uruguay-clubs";
import { readStatsBombEnv, StatsBombConfigError, type StatsBombEnv } from "@/lib/statsbomb/env";
import { getStatsBombConnector, type StatsBombConnector } from "@/lib/statsbomb/connector";
import {
  campogramaDeUbicaciones,
  canalDeCancha,
  disciplinaContextualizada,
  ejecutoresAbp,
  extractPassNetwork,
  extractShotMap,
  faltasSinTarjeta,
  formacionATexto,
  iniciosArquero,
  pasesClaveDeTemporada,
  perdidasEnInicio,
  jugadoresEnTransicion,
  mapaPresion,
  minutosPorPartidoMuestra,
  origenesDeContraataque,
  receptoresAbp,
  recuperacionesEnCampoRival,
  sustitucionesHabituales,
  titularidadesPorJugador,
  topRematadores,
  type CambioJugador,
  type EjecutorAbp,
  type FaltaConTarjeta,
  type FaltaSinTarjeta,
  type IniciosArquero,
  type PasesClaveTemporada,
  type PerdidasEnInicio,
  type JugadorTransicion,
  type MapaPresion,
  type PassNetwork,
  type Rematador,
  type ReceptorAbp,
  type RecuperacionesCampoRival,
  type ShotMapEntry,
  type ZonaCampograma,
} from "@/lib/statsbomb/events-analytics";
import { createClient } from "@/lib/supabase/server";
import type {
  StatsBombEvent,
  StatsBombLineup,
  StatsBombLineupPosition,
  StatsBombMatch,
  StatsBombPlayerSeasonStats,
  StatsBombTeamMatchStats,
} from "@/lib/statsbomb/types";

/**
 * Tamaño de la muestra: últimos 6 partidos disponibles del equipo, por fecha
 * descendente. Decisión explícita del usuario (2026-07-14): no promediar la
 * temporada completa porque el fútbol cambia a corto plazo (DT, lesiones,
 * ajustes tácticos) y una muestra reciente representa mejor al rival actual.
 * Ver statsbomb/config/metric_definitions.json -> "muestra".
 */
export const SAMPLE_SIZE = 6;

type MetricDef = {
  id: string;
  name: string;
  fase: string;
  formula: string;
  unit: string;
  source: string;
  invert?: boolean;
  interpretation?: string;
};

function loadMetricDefinitions(): MetricDef[] {
  const file = path.join(process.cwd(), "statsbomb", "config", "metric_definitions.json");
  const parsed = JSON.parse(readFileSync(file, "utf-8"));
  return parsed.metrics as MetricDef[];
}

export type MuestraPartido = {
  matchId: number;
  fecha: string;
  rival: string;
  escudoRivalUrl: string | null;
  condicion: "local" | "visitante";
  golesFavor: number | null;
  golesContra: number | null;
};

export type MetricaComparada = {
  id: string;
  name: string;
  unit: string;
  fase: string;
  invert: boolean;
  interpretationBase: string | null;
  nuestroValor: number | null;
  rivalValor: number | null;
  diferenciaAbsoluta: number | null;
  /** % en que el rival difiere de nosotros: (rival - nosotros) / |nosotros| * 100 */
  diferenciaPorcentual: number | null;
  promedioLiga: number | null;
  /** 0-100. null si todavía no se calculó el baseline de liga (ver scripts/compute-statsbomb-league-baseline.mjs). */
  percentilRival: number | null;
  percentilNuestro: number | null;
  tendenciaRival: "subiendo" | "bajando" | "estable" | null;
  interpretacion: string;
};

export type PuntoTendenciaPartido = { matchId: number; fecha: string; rival: string; valor: number | null };
/** Serie cronológica (más antiguo → más reciente) de una métrica real por partido — no un promedio, para ver evolución. */
export type TendenciaPartidoAPartido = { id: string; name: string; unit: string; puntos: PuntoTendenciaPartido[] };

export type JugadorClave = {
  playerId: number;
  nombre: string;
  nombreConocido: string | null;
  posicion: string | null;
  edad: number | null;
  altura: number | null;
  pieHabil: "Zurdo" | "Diestro" | "Ambidiestro" | null;
  golesMuestra: number;
  asistenciasMuestra: number;
  /** Goles/asistencias de toda la temporada (derivados de por-90 real × minutos reales), no solo la muestra de 6 partidos. */
  golesTemporada: number | null;
  asistenciasTemporada: number | null;
  minutosTemporada: number | null;
  golesPor90: number | null;
  xgPor90: number | null;
  asistenciasPor90: number | null;
  obvPor90: number | null;
  progresionesPor90: number | null;
  pressuresPor90: number | null;
  pasesHaciaTop: { nombre: string; pases: number }[];
  recibeDeTop: { nombre: string; pases: number }[];
};

export type JugadorPases = {
  playerId: number;
  nombre: string;
  nombreConocido: string | null;
  posicion: string | null;
  minutosTemporada: number | null;
  pasesPor90: number | null;
  precisionPase: number | null;
  pasesProgresivosPor90: number | null;
  keyPassesPor90: number | null;
};

export type ContextoPartido = {
  competicion: string;
  temporada: string;
  partidosUtilizadosRival: number;
  partidosUtilizadosNuestro: number;
  minutosAnalizadosAprox: number;
  calidadDatos: "alta" | "media" | "baja";
  advertencias: string[];
};

export type RadarPunto = {
  metricId: string;
  label: string;
  unit: string;
  nosotros: number | null;
  rival: number | null;
  /** Valores reales (no percentiles) para la tabla comparativa junto al radar. */
  nuestroValorReal: number | null;
  rivalValorReal: number | null;
  promedioLiga: number | null;
  invert: boolean;
};

export type ScatterEquipo = { nombre: string; escudoUrl: string | null; x: number; y: number; esNosotros: boolean; esRival: boolean };
export type ScatterPlot = {
  titulo: string;
  ejeXLabel: string;
  ejeYLabel: string;
  /** true = valor más bajo es mejor en ese eje (para saber qué cuadrante pintar como "mejor"/"peor"). */
  xInvertido: boolean;
  yInvertido: boolean;
  puntos: ScatterEquipo[];
  interpretacion: string;
  /** Agrupa 2 scatter plots por página (0-3) — si uno de los dos no tiene datos, la página muestra el otro solo. */
  grupo: number;
};

/** Formación (código StatsBomb, ej. 4231) más usada como Starting XI en la muestra de partidos con datos disponibles. */
export type EstructuraEquipo = { formacionCodigo: number; partidosConEstaFormacion: number; totalPartidosConDatos: number };

/** Sistema táctico (Starting XI) usado en la muestra, con su frecuencia real — puede haber más de uno si el rival varió. */
export type SistemaUtilizado = { formacionCodigo: number; partidosConEstaFormacion: number; totalPartidosConDatos: number };

/** Jugador con mayor continuidad real en la muestra: titularidades, minutos y posición — sin inferir lesiones ni convocatoria. */
export type JugadorOnceProbable = {
  playerId: number;
  nombre: string;
  posicion: string | null;
  titularidades: number;
  totalPartidosMuestra: number;
  minutosMuestra: number;
};

export type JugadorAlineado = {
  nombre: string;
  dorsal: number | null;
  posicion: string;
  linea: "Portero" | "Defensa" | "Mediocampo" | "Ataque";
};
/** Once real de un partido concreto de la muestra que usó esta formación — no es una predicción, es la alineación real de ese partido. */
export type AlineacionProbable = {
  formacionCodigo: number;
  partidoReferenciaFecha: string;
  partidoReferenciaRival: string;
  jugadores: JugadorAlineado[];
  huboCambioEnEsePartido: boolean;
  partidosConCambioTactico: number;
  totalPartidosConDatos: number;
};

/** Formación real usada por el rival en cada partido de la muestra (Starting XI + eventual Tactical Shift), StatsBomb Lineups v5. */
export type EstructuraPartido = {
  matchId: number;
  fecha: string;
  rival: string;
  formacionInicial: number | null;
  formacionFinal: number | null;
  huboCambio: boolean;
  tiempoCambio: "1er tiempo" | "2do tiempo" | "prórroga" | null;
};

export type JugadorPlantel = {
  playerId: number;
  dorsal: number | null;
  nombre: string;
  nombreConocido: string | null;
  posicion: string | null;
  edad: number | null;
  altura: number | null;
  pieHabil: JugadorClave["pieHabil"];
  /** Minutos reales en los partidos de la muestra analizada (no la temporada completa) — ver minutosPorPartidoMuestra. */
  minutosMuestra: number;
};

export type PatronSustituciones = {
  totalCambios: number;
  segundoTiempo: number;
  ganando: number;
  perdiendo: number;
  empatando: number;
  minutoPromedio: number;
};

export type FranjaGol = { franja: string; golesFavor: number; golesContra: number };

export type OpponentReportData = {
  generadoEn: string;
  rival: { nombre: string; statsbombTeamId: number; escudoUrl: string | null };
  nuestroEquipo: { nombre: string; statsbombTeamId: number; escudoUrl: string | null };
  proximoPartido: { fecha: string; condicion: "local" | "visitante" } | null;
  contexto: ContextoPartido;
  muestraRival: MuestraPartido[];
  muestraNuestra: MuestraPartido[];
  metricas: MetricaComparada[];
  jugadoresClaveRival: JugadorClave[];
  historialReciente: MuestraPartido[];
  shotMapRival: ShotMapEntry[];
  shotMapInterpretacion: string[];
  passNetworkRival: PassNetwork;
  /** Solo los 11 jugadores con más minutos reales en la muestra — para que el diagrama de red no muestre "más de 11 jugadores". */
  passNetworkRivalTop11: PassNetwork;
  passNetworkInterpretacion: string[];
  radar: RadarPunto[];
  scatterPlots: ScatterPlot[];
  plantillaPasesRival: JugadorPases[];
  plantelCompletoRival: JugadorPlantel[];
  estructuraRival: EstructuraEquipo | null;
  estructuraNuestra: EstructuraEquipo | null;
  estructurasRecientesRival: EstructuraPartido[];
  alineacionesProbablesRival: AlineacionProbable[];
  alineacionesProbablesNuestro: AlineacionProbable[];
  estructuraInterpretacion: string[];
  patronSustitucionesRival: PatronSustituciones | null;
  sustitucionesHabitualesRival: CambioJugador[];
  golesPorFranjaRival: FranjaGol[];
  campogramaTransicionesRival: ZonaCampograma[];
  jugadoresTransicionRival: JugadorTransicion[];
  ejecutoresAbpRival: EjecutorAbp[];
  receptoresAbpRival: ReceptorAbp[];
  topRematadoresRival: Rematador[];
  onceProbableRival: JugadorOnceProbable[];
  sistemasUtilizadosRival: SistemaUtilizado[];
  tendenciasPartidoRival: TendenciaPartidoAPartido[];
  iniciosArqueroRival: IniciosArquero | null;
  perdidasEnInicioRival: PerdidasEnInicio | null;
  pasesClaveTemporadaRival: PasesClaveTemporada | null;
  alineacionesPorPartidoRival: AlineacionesPartido[];
  mapaPresionRival: MapaPresion | null;
  recuperacionesCampoRivalRival: RecuperacionesCampoRival;
  disciplinaContextualizadaRival: FaltaConTarjeta[];
  /** Faltas reales que NO terminaron en tarjeta — para mostrar el patrón completo de faltas en el campograma, no solo las amonestadas. */
  faltasSinTarjetaRival: FaltaSinTarjeta[];
};

function ultimosN<T extends { match_date: string; match_status: string }>(matches: T[], n: number): T[] {
  return matches
    .filter((m) => m.match_status === "available")
    .slice()
    .sort((a, b) => b.match_date.localeCompare(a.match_date))
    .slice(0, n);
}

function ladoDeEquipo(m: StatsBombMatch, teamId: number): "local" | "visitante" | null {
  if (m.home_team.home_team_id === teamId) return "local";
  if (m.away_team.away_team_id === teamId) return "visitante";
  return null;
}

function aMuestraPartido(m: StatsBombMatch, teamId: number): MuestraPartido {
  const condicion = ladoDeEquipo(m, teamId) ?? "local";
  const rival = condicion === "local" ? m.away_team.away_team_name : m.home_team.home_team_name;
  return {
    matchId: m.match_id,
    fecha: m.match_date,
    rival,
    escudoRivalUrl: escudoClubUruguayo(rival),
    condicion,
    golesFavor: condicion === "local" ? m.home_score : m.away_score,
    golesContra: condicion === "local" ? m.away_score : m.home_score,
  };
}

function buscarEquipoPorNombre(matches: StatsBombMatch[], nombreBuscado: string): { id: number; name: string } | null {
  const objetivo = nombreBuscado.trim().toLowerCase();
  const nombres = new Map<number, string>();
  for (const m of matches) {
    nombres.set(m.home_team.home_team_id, m.home_team.home_team_name);
    nombres.set(m.away_team.away_team_id, m.away_team.away_team_name);
  }
  for (const [id, name] of nombres) {
    if (name.toLowerCase() === objetivo) return { id, name };
  }
  for (const [id, name] of nombres) {
    if (name.toLowerCase().includes(objetivo) || objetivo.includes(name.toLowerCase())) return { id, name };
  }
  return null;
}

type ResolucionRival = {
  matchesRival: StatsBombMatch[];
  rivalEquipo: { id: number; name: string };
  competitionId: number;
  seasonId: number;
  otraCompeticion: boolean;
};

/**
 * Busca al rival primero en la competencia/temporada configurada por defecto (env). Si no
 * aparece ahí (ej. un rival internacional de una copa continental que esta cuenta de
 * StatsBomb no tiene habilitada), recorre el resto de competencias a las que la cuenta sí
 * tiene acceso y usa la primera donde el rival aparezca — típicamente su liga doméstica.
 * Nunca inventa una competencia: si no aparece en ninguna, tira error explícito.
 */
async function resolverRivalYCompeticion(
  connector: StatsBombConnector,
  env: StatsBombEnv,
  rivalNombreInput: string,
): Promise<ResolucionRival> {
  const matchesDefault = await connector.getMatches(env.competitionId, env.seasonId);
  const enDefault = buscarEquipoPorNombre(matchesDefault, rivalNombreInput);
  if (enDefault) {
    return {
      matchesRival: matchesDefault,
      rivalEquipo: enDefault,
      competitionId: env.competitionId,
      seasonId: env.seasonId,
      otraCompeticion: false,
    };
  }

  const competencias = await connector.getCompetitions();
  for (const c of competencias) {
    if (c.competition_id === env.competitionId && c.season_id === env.seasonId) continue;
    const matchesOtra = await connector.getMatches(c.competition_id, c.season_id);
    const encontrado = buscarEquipoPorNombre(matchesOtra, rivalNombreInput);
    if (encontrado) {
      return {
        matchesRival: matchesOtra,
        rivalEquipo: encontrado,
        competitionId: c.competition_id,
        seasonId: c.season_id,
        otraCompeticion: true,
      };
    }
  }

  throw new Error(
    `No se encontró "${rivalNombreInput}" en ninguna de las competencias a las que tiene acceso esta cuenta de StatsBomb.`,
  );
}

/** Formación de Starting XI de cada partido (o la primera disponible), y la más repetida en la muestra. */
function formacionMasUsada(lineupsPorPartido: StatsBombLineup[][], teamId: number): EstructuraEquipo | null {
  const conteo = new Map<number, number>();
  let total = 0;
  for (const lineupsPartido of lineupsPorPartido) {
    const lineupEquipo = lineupsPartido.find((l) => l.team_id === teamId);
    const inicial = lineupEquipo?.formations.find((f) => f.reason === "Starting XI") ?? lineupEquipo?.formations[0];
    if (!inicial) continue;
    total++;
    conteo.set(inicial.formation, (conteo.get(inicial.formation) ?? 0) + 1);
  }
  if (total === 0) return null;
  const [formacionCodigo, partidosConEstaFormacion] = [...conteo.entries()].sort((a, b) => b[1] - a[1])[0];
  return { formacionCodigo, partidosConEstaFormacion, totalPartidosConDatos: total };
}

/** Códigos de formación de Starting XI usados en la muestra, ordenados de más a menos repetido. */
function todasLasFormacionesOrdenadas(lineupsPorPartido: StatsBombLineup[][], teamId: number): number[] {
  const conteo = new Map<number, number>();
  for (const lp of lineupsPorPartido) {
    const eq = lp.find((l) => l.team_id === teamId);
    const inicial = eq?.formations.find((f) => f.reason === "Starting XI") ?? eq?.formations[0];
    if (!inicial) continue;
    conteo.set(inicial.formation, (conteo.get(inicial.formation) ?? 0) + 1);
  }
  return [...conteo.entries()].sort((a, b) => b[1] - a[1]).map(([codigo]) => codigo);
}

/** Todos los sistemas (Starting XI) que usó el rival en la muestra, con su frecuencia real — no solo el más repetido. */
function sistemasConFrecuencia(lineupsPorPartido: StatsBombLineup[][], teamId: number): SistemaUtilizado[] {
  const conteo = new Map<number, number>();
  let total = 0;
  for (const lp of lineupsPorPartido) {
    const eq = lp.find((l) => l.team_id === teamId);
    const inicial = eq?.formations.find((f) => f.reason === "Starting XI") ?? eq?.formations[0];
    if (!inicial) continue;
    total++;
    conteo.set(inicial.formation, (conteo.get(inicial.formation) ?? 0) + 1);
  }
  return [...conteo.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([formacionCodigo, partidosConEstaFormacion]) => ({ formacionCodigo, partidosConEstaFormacion, totalPartidosConDatos: total }));
}

/**
 * Alineación real (nombre y apellido por posición) del partido más reciente de la muestra que usó cada una de
 * las dos formaciones más repetidas — no es una predicción inventada, es el Starting XI real de esos partidos.
 */
function construirAlineacionesProbables(
  lineupsPorPartido: StatsBombLineup[][],
  partidos: MuestraPartido[],
  teamId: number,
): AlineacionProbable[] {
  const codigos = todasLasFormacionesOrdenadas(lineupsPorPartido, teamId);
  if (codigos.length === 0) return [];

  const totalPartidosConDatos = lineupsPorPartido.filter((lp) => {
    const eq = lp.find((l) => l.team_id === teamId);
    return Boolean(eq?.formations.find((f) => f.reason === "Starting XI") ?? eq?.formations[0]);
  }).length;
  const partidosConCambioTactico = lineupsPorPartido.filter((lp) => (lp.find((l) => l.team_id === teamId)?.formations.length ?? 0) > 1)
    .length;

  const resultado: AlineacionProbable[] = [];
  for (const codigo of codigos.slice(0, 2)) {
    let indice = -1;
    for (let i = 0; i < lineupsPorPartido.length; i++) {
      const lineupEquipo = lineupsPorPartido[i].find((l) => l.team_id === teamId);
      const inicial = lineupEquipo?.formations.find((f) => f.reason === "Starting XI") ?? lineupEquipo?.formations[0];
      if (inicial?.formation === codigo) {
        indice = i;
        break;
      }
    }
    if (indice === -1) continue;
    const lineupEquipo = lineupsPorPartido[indice].find((l) => l.team_id === teamId);
    if (!lineupEquipo) continue;

    const jugadores: JugadorAlineado[] = lineupEquipo.lineup
      .filter((j) => j.positions.some((p) => p.start_reason === "Starting XI"))
      .map((j) => {
        const posInicial = j.positions.find((p) => p.start_reason === "Starting XI")!;
        const posicion = posicionEs(posInicial.position) ?? posInicial.position;
        return { nombre: j.player_name, dorsal: j.jersey_number, posicion, linea: lineaDePosicion(posicion) };
      });

    resultado.push({
      formacionCodigo: codigo,
      partidoReferenciaFecha: partidos[indice].fecha,
      partidoReferenciaRival: partidos[indice].rival,
      jugadores,
      huboCambioEnEsePartido: lineupEquipo.formations.length > 1,
      partidosConCambioTactico,
      totalPartidosConDatos,
    });
  }
  return resultado;
}

/**
 * Ventana real (minuto de entrada/salida) de cada jugador en el partido — se arma a partir de eventos reales
 * de Substitution (Events v10), NO de `positions[].to` de Lineups v5: se verificó contra datos reales que ese
 * campo puede quedar sin completar cuando un jugador sale por cambio, lo que hacía que pareciera que seguía en
 * cancha toda la muestra (bug reportado). Mismo criterio de entrada/salida que minutosPorPartidoMuestra.
 */
function ventanasDeJugadores(
  eventos: StatsBombEvent[],
  lineupEquipo: StatsBombLineup,
  teamId: number,
  minutoFinPartido: number,
): Map<number, { entradaMinuto: number; salidaMinuto: number }> {
  const ventanas = new Map<number, { entradaMinuto: number; salidaMinuto: number }>();
  for (const jugador of lineupEquipo.lineup) {
    if (jugador.positions.some((p) => p.start_reason === "Starting XI")) {
      ventanas.set(jugador.player_id, { entradaMinuto: 0, salidaMinuto: minutoFinPartido });
    }
  }
  for (const e of eventos) {
    if (e.type.name !== "Substitution" || e.team.id !== teamId || !e.player || !e.substitution) continue;
    const sale = ventanas.get(e.player.id);
    if (sale) sale.salidaMinuto = e.minute;
    else ventanas.set(e.player.id, { entradaMinuto: 0, salidaMinuto: e.minute });
    ventanas.set(e.substitution.replacement.id, { entradaMinuto: e.minute, salidaMinuto: minutoFinPartido });
  }
  return ventanas;
}

/**
 * Convierte un timestamp de Lineups v5 (`positions[].from`/`.to`, `formations[].timestamp`) a minuto real de
 * partido. Se verificó contra datos reales que este campo es ACUMULADO de todo el partido (ej. "01:04:31.622"
 * para un cambio real en el minuto 64), a diferencia del timestamp de Events v10 que reinicia en "00:00:00" en
 * cada período. Comparar ambos formatos como strings (bug real encontrado) descartaba la posición del jugador
 * que entraba por cambio en el 2do tiempo, haciendo que desapareciera de la cancha y de las referencias.
 */
function minutoDesdeTimestampAcumulado(timestamp: string): number {
  const [horas, minutos, segundos] = timestamp.split(":");
  return Number(horas) * 60 + Number(minutos) + Number(segundos) / 60;
}

/** Posición real más reciente del jugador hasta ese minuto de partido (no le importa `to`/`to_period`, solo cuál es la última asignación real). */
function posicionMasRecienteHasta(jugador: StatsBombLineup["lineup"][number], minutoReferencia: number): StatsBombLineupPosition | null {
  const candidatas = jugador.positions.filter((p) => minutoDesdeTimestampAcumulado(p.from) <= minutoReferencia);
  if (candidatas.length === 0) return null;
  return [...candidatas].sort((a, b) => minutoDesdeTimestampAcumulado(a.from) - minutoDesdeTimestampAcumulado(b.from)).at(-1) ?? null;
}

function jugadoresEnFase(
  lineupEquipo: StatsBombLineup,
  ventanas: Map<number, { entradaMinuto: number; salidaMinuto: number }>,
  minuto: number,
  minutoReferencia: number,
): JugadorAlineado[] {
  const resultado: JugadorAlineado[] = [];
  for (const jugador of lineupEquipo.lineup) {
    const ventana = ventanas.get(jugador.player_id);
    if (!ventana || minuto < ventana.entradaMinuto || minuto >= ventana.salidaMinuto) continue;
    const pos = posicionMasRecienteHasta(jugador, minutoReferencia);
    if (!pos) continue;
    const posicion = posicionEs(pos.position) ?? pos.position;
    resultado.push({ nombre: jugador.player_name, dorsal: jugador.jersey_number, posicion, linea: lineaDePosicion(posicion) });
  }
  return resultado;
}

export type SustitucionPartido = {
  minuto: number;
  saleNombre: string;
  saleDorsal: number | null;
  entraNombre: string;
  entraDorsal: number | null;
};

/** Sustituciones reales de ESTE partido puntual (no agregadas de la muestra) — jugador que sale, jugador que entra y minuto real. */
function sustitucionesDelPartido(eventos: StatsBombEvent[], lineupEquipo: StatsBombLineup, teamId: number): SustitucionPartido[] {
  const dorsalPorId = new Map(lineupEquipo.lineup.map((j) => [j.player_id, j.jersey_number]));
  const resultado: SustitucionPartido[] = [];
  for (const e of eventos) {
    if (e.type.name !== "Substitution" || e.team.id !== teamId || !e.player || !e.substitution) continue;
    if (e.substitution.outcome.name === "Injury") continue;
    resultado.push({
      minuto: e.minute,
      saleNombre: e.player.name,
      saleDorsal: dorsalPorId.get(e.player.id) ?? null,
      entraNombre: e.substitution.replacement.name,
      entraDorsal: dorsalPorId.get(e.substitution.replacement.id) ?? null,
    });
  }
  return resultado.sort((a, b) => a.minuto - b.minuto);
}

export type FaseFormacionPartido = {
  formacionCodigo: number;
  desdeMinuto: number;
  hastaMinuto: number | null;
  jugadores: JugadorAlineado[];
};

export type AlineacionesPartido = { matchId: number; fases: FaseFormacionPartido[]; sustituciones: SustitucionPartido[] };

/** Franjas fijas de 15 minutos pedidas explícitamente por el usuario — se muestra el equipo en todas, haya
 * habido cambio real o no (antes solo se mostraban los momentos de cambio táctico real). */
const FRANJAS_FIJAS: { desdeMinuto: number; hastaMinuto: number | null }[] = [
  { desdeMinuto: 0, hastaMinuto: 15 },
  { desdeMinuto: 16, hastaMinuto: 30 },
  { desdeMinuto: 31, hastaMinuto: 45 },
  { desdeMinuto: 46, hastaMinuto: 60 },
  { desdeMinuto: 61, hastaMinuto: 75 },
  { desdeMinuto: 76, hastaMinuto: 90 },
];

/** Formación real vigente en un momento dado (la última fijada en Lineups v5 antes o en ese minuto real de partido). */
function formacionActivaEnMomento(lineupEquipo: StatsBombLineup, minutoReferencia: number): number | null {
  const formacionesOrdenadas = [...lineupEquipo.formations].sort(
    (a, b) => minutoDesdeTimestampAcumulado(a.timestamp) - minutoDesdeTimestampAcumulado(b.timestamp),
  );
  let activa: number | null = null;
  for (const f of formacionesOrdenadas) {
    if (minutoDesdeTimestampAcumulado(f.timestamp) <= minutoReferencia) activa = f.formation;
    else break;
  }
  return activa;
}

/**
 * Equipo real (formación + quién ocupaba cada posición) en cada una de las 6 franjas fijas de 15 minutos del
 * partido — no solo en los momentos de cambio táctico real. El "momento" de cada franja se ancla al primer
 * evento real (Events v10) cuyo minuto absoluto llega a ese arranque de franja.
 */
function fasesFormacionPorPartido(
  lineupsPorPartido: StatsBombLineup[][],
  eventosPorPartido: StatsBombEvent[][],
  partidos: MuestraPartido[],
  teamId: number,
): AlineacionesPartido[] {
  const resultado: AlineacionesPartido[] = [];
  for (let i = 0; i < lineupsPorPartido.length; i++) {
    const lineupEquipo = lineupsPorPartido[i].find((l) => l.team_id === teamId);
    const eventos = [...(eventosPorPartido[i] ?? [])].sort((a, b) => a.index - b.index);
    if (!lineupEquipo || lineupEquipo.formations.length === 0 || eventos.length === 0) continue;

    const minutoFinPartido = eventos[eventos.length - 1].minute;
    const ventanas = ventanasDeJugadores(eventos, lineupEquipo, teamId, minutoFinPartido);

    const fases: FaseFormacionPartido[] = [];
    for (const franja of FRANJAS_FIJAS) {
      if (franja.desdeMinuto > minutoFinPartido) break;
      const eventoDeReferencia = eventos.find((e) => e.minute >= franja.desdeMinuto) ?? eventos[eventos.length - 1];
      const formacionCodigo = formacionActivaEnMomento(lineupEquipo, eventoDeReferencia.minute);
      if (formacionCodigo === null) continue;
      fases.push({
        formacionCodigo,
        desdeMinuto: franja.desdeMinuto,
        hastaMinuto: franja.hastaMinuto,
        jugadores: jugadoresEnFase(lineupEquipo, ventanas, franja.desdeMinuto, eventoDeReferencia.minute),
      });
    }
    resultado.push({ matchId: partidos[i].matchId, fases, sustituciones: sustitucionesDelPartido(eventos, lineupEquipo, teamId) });
  }
  return resultado;
}

/** Formación real usada por el rival en cada partido de la muestra, con su eventual cambio táctico (Lineups v5). */
function estructurasPorPartido(lineupsPorPartido: StatsBombLineup[][], partidos: MuestraPartido[], teamId: number): EstructuraPartido[] {
  return lineupsPorPartido.map((lineupsPartido, i) => {
    const partido = partidos[i];
    const lineupEquipo = lineupsPartido.find((l) => l.team_id === teamId);
    if (!lineupEquipo || lineupEquipo.formations.length === 0) {
      return {
        matchId: partido.matchId,
        fecha: partido.fecha,
        rival: partido.rival,
        formacionInicial: null,
        formacionFinal: null,
        huboCambio: false,
        tiempoCambio: null,
      };
    }
    const ordenadas = [...lineupEquipo.formations].sort((a, b) => a.timestamp.localeCompare(b.timestamp));
    const inicial = ordenadas.find((f) => f.reason === "Starting XI") ?? ordenadas[0];
    const final = ordenadas[ordenadas.length - 1];
    const huboCambio = ordenadas.length > 1;
    const cambio = ordenadas.find((f) => f.reason === "Tactical Shift");
    const tiempoCambio: EstructuraPartido["tiempoCambio"] = !cambio ? null : cambio.period === 1 ? "1er tiempo" : cambio.period === 2 ? "2do tiempo" : "prórroga";
    return {
      matchId: partido.matchId,
      fecha: partido.fecha,
      rival: partido.rival,
      formacionInicial: inicial.formation,
      formacionFinal: final.formation,
      huboCambio,
      tiempoCambio,
    };
  });
}

/** Síntesis en texto de qué cambios de estructura y de jugadores hizo el rival en la muestra — todo derivado de datos reales. */
function interpretarEstructura(estructuras: EstructuraPartido[], cambiosJugadores: CambioJugador[], rivalNombre: string): string[] {
  const lineas: string[] = [];
  const conCambio = estructuras.filter((e) => e.huboCambio);
  if (conCambio.length > 0) {
    lineas.push(`${rivalNombre} cambió de formación durante el partido en ${conCambio.length} de ${estructuras.length} partidos de la muestra.`);

    // Patrón de transición más repetido (ej. "4-4-2 → 4-3-3"), agrupando los cambios por el par formación inicial/final.
    const conteoTransiciones = new Map<string, { texto: string; veces: number }>();
    for (const e of conCambio) {
      const texto = `${formacionATexto(e.formacionInicial)} → ${formacionATexto(e.formacionFinal)}`;
      const actual = conteoTransiciones.get(texto) ?? { texto, veces: 0 };
      actual.veces++;
      conteoTransiciones.set(texto, actual);
    }
    const transicionesOrdenadas = [...conteoTransiciones.values()].sort((a, b) => b.veces - a.veces);
    if (transicionesOrdenadas[0]?.veces >= 2) {
      lineas.push(
        `Patrón de cambio más repetido: ${transicionesOrdenadas[0].texto} (ocurrió en ${transicionesOrdenadas[0].veces} de ${conCambio.length} partidos con cambio de formación).`,
      );
    }

    // Distribución por momento del partido (1er tiempo / 2do tiempo / prórroga) de los cambios de formación.
    const porTiempo = new Map<string, number>();
    for (const e of conCambio) {
      if (!e.tiempoCambio) continue;
      porTiempo.set(e.tiempoCambio, (porTiempo.get(e.tiempoCambio) ?? 0) + 1);
    }
    if (porTiempo.size > 0) {
      const resumenTiempo = [...porTiempo.entries()].map(([tiempo, veces]) => `${veces} en ${tiempo}`).join(", ");
      lineas.push(`Momento del cambio: ${resumenTiempo}.`);
    }

    for (const e of conCambio) {
      lineas.push(
        `${e.fecha} vs. ${e.rival}: pasó de ${formacionATexto(e.formacionInicial)} a ${formacionATexto(e.formacionFinal)}${e.tiempoCambio ? ` en el ${e.tiempoCambio}` : ""}.`,
      );
    }
  } else {
    lineas.push(`${rivalNombre} no registró cambios de formación durante el partido en ninguno de los ${estructuras.length} partidos de la muestra.`);
  }
  if (cambiosJugadores.length > 0) {
    lineas.push("Cambios de jugadores más habituales:");
    for (const c of cambiosJugadores.slice(0, 3)) {
      lineas.push(`${c.saleNombre} sale por ${c.entraNombre} (${c.veces} ${c.veces === 1 ? "vez" : "veces"} en la muestra).`);
    }
  }
  return lineas;
}

/**
 * Patrones de sustitución según el resultado (goles reales hasta ese minuto, vía Shot events) y el momento del
 * partido. Excluye cambios por lesión (substitution.outcome.name === "Injury", verificado contra datos reales)
 * porque no reflejan una decisión táctica.
 */
function analizarSustituciones(eventosPorPartido: StatsBombEvent[][], teamId: number): PatronSustituciones | null {
  const registros: { minute: number; estado: "ganando" | "perdiendo" | "empatando" }[] = [];
  for (const eventosPartido of eventosPorPartido) {
    const otroEquipoId = eventosPartido.find((e) => e.team.id !== teamId)?.team.id;
    const golesHasta = (minuto: number, team: number) =>
      eventosPartido.filter((e) => e.type.name === "Shot" && e.shot?.outcome.name === "Goal" && e.team.id === team && e.minute <= minuto)
        .length;
    const subs = eventosPartido.filter(
      (e) => e.type.name === "Substitution" && e.team.id === teamId && e.substitution?.outcome.name !== "Injury",
    );
    for (const s of subs) {
      const golesRival = golesHasta(s.minute, teamId);
      const golesOponente = otroEquipoId !== undefined ? golesHasta(s.minute, otroEquipoId) : 0;
      const estado = golesRival > golesOponente ? "ganando" : golesRival < golesOponente ? "perdiendo" : "empatando";
      registros.push({ minute: s.minute, estado });
    }
  }
  if (registros.length === 0) return null;
  return {
    totalCambios: registros.length,
    segundoTiempo: registros.filter((r) => r.minute >= 45).length,
    ganando: registros.filter((r) => r.estado === "ganando").length,
    perdiendo: registros.filter((r) => r.estado === "perdiendo").length,
    empatando: registros.filter((r) => r.estado === "empatando").length,
    minutoPromedio: Math.round(registros.reduce((a, r) => a + r.minute, 0) / registros.length),
  };
}

/** Goles reales (a favor y en contra) agrupados en franjas de 15 minutos, vía Shot events con outcome "Goal". */
function golesPorFranja(eventosPorPartido: StatsBombEvent[][], teamId: number): FranjaGol[] {
  const bandas: [number, number][] = [
    [0, 15],
    [15, 30],
    [30, 45],
    [45, 60],
    [60, 75],
    [75, 999],
  ];
  const etiquetas = ["0-15'", "15-30'", "30-45'", "45-60'", "60-75'", "75'+"];
  const conteo = bandas.map(() => ({ favor: 0, contra: 0 }));
  for (const eventosPartido of eventosPorPartido) {
    const goles = eventosPartido.filter((e) => e.type.name === "Shot" && e.shot?.outcome.name === "Goal");
    for (const g of goles) {
      const idx = bandas.findIndex(([ini, fin]) => g.minute >= ini && g.minute < fin);
      if (idx === -1) continue;
      if (g.team.id === teamId) conteo[idx].favor++;
      else conteo[idx].contra++;
    }
  }
  return etiquetas.map((franja, i) => ({ franja, golesFavor: conteo[i].favor, golesContra: conteo[i].contra }));
}

/** Total de temporada derivado de una tasa por-90 real y los minutos reales jugados (no un dato inventado, solo aritmética). */
function totalTemporada(por90: number | null, minutos: number | null): number | null {
  if (por90 === null || minutos === null) return null;
  return Math.round((por90 * minutos) / 90);
}

function promedio(valores: (number | null | undefined)[]): number | null {
  const validos = valores.filter((v): v is number => typeof v === "number");
  if (validos.length === 0) return null;
  return validos.reduce((a, b) => a + b, 0) / validos.length;
}

function promedioEscalado(valores: (number | null | undefined)[], escala: number): number | null {
  const v = promedio(valores);
  return v === null ? null : v * escala;
}

async function statsDeMuestra(
  getTeamMatchStats: (matchId: number) => Promise<StatsBombTeamMatchStats[]>,
  matchIds: number[],
  teamId: number,
): Promise<StatsBombTeamMatchStats[]> {
  const filas: StatsBombTeamMatchStats[] = [];
  for (const matchId of matchIds) {
    const stats = await getTeamMatchStats(matchId);
    const fila = stats.find((s) => s.team_id === teamId);
    if (fila) filas.push(fila);
  }
  return filas;
}

/** Aproximación normal estándar (Abramowitz-Stegun) para pasar de z-score a percentil sin depender de una librería estadística. */
function percentilDesdeZ(z: number): number {
  const t = 1 / (1 + 0.2316419 * Math.abs(z));
  const d = 0.3989423 * Math.exp((-z * z) / 2);
  let p = d * t * (0.3193815 + t * (-0.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274))));
  if (z > 0) p = 1 - p;
  return Math.round(p * 100);
}

function calcularEdad(birthDate: string | null): number | null {
  if (!birthDate) return null;
  const nacimiento = new Date(birthDate);
  if (Number.isNaN(nacimiento.getTime())) return null;
  const hoy = new Date();
  let edad = hoy.getFullYear() - nacimiento.getFullYear();
  const cumplioEsteAnio =
    hoy.getMonth() > nacimiento.getMonth() || (hoy.getMonth() === nacimiento.getMonth() && hoy.getDate() >= nacimiento.getDate());
  if (!cumplioEsteAnio) edad--;
  return edad;
}

function pieHabilDesdeRatio(ratio: number | null): JugadorClave["pieHabil"] {
  if (ratio === null) return null;
  if (ratio > 0.6) return "Zurdo";
  if (ratio < 0.4) return "Diestro";
  return "Ambidiestro";
}

/**
 * `primary_position` de Player Season Stats v6 llega en inglés británico (verificado
 * contra datos reales, ej. "Goalkeeper", "Right Centre Midfielder"). El campo `position`
 * de Lineups v5, en cambio, llega en inglés americano (verificado contra datos reales,
 * ej. "Center Back", "Left Defensive Midfield", "Center Attacking Midfield" — sin "-re"
 * y sin el sufijo "-er" en "Midfield"). Se traduce solo para presentación — no altera el
 * dato original. Se listan ambas variantes explícitamente para no depender de heurísticas.
 */
const POSICIONES_ES: Record<string, string> = {
  Goalkeeper: "Arquero",
  "Right Back": "Lateral derecho",
  "Right Centre Back": "Central derecho",
  "Right Center Back": "Central derecho",
  "Centre Back": "Central",
  "Center Back": "Central",
  "Left Centre Back": "Central izquierdo",
  "Left Center Back": "Central izquierdo",
  "Left Back": "Lateral izquierdo",
  "Right Wing Back": "Carrilero derecho",
  "Left Wing Back": "Carrilero izquierdo",
  "Right Defensive Midfielder": "Volante mixto derecho",
  "Right Defensive Midfield": "Volante mixto derecho",
  "Centre Defensive Midfielder": "Volante central",
  "Center Defensive Midfield": "Volante central",
  "Left Defensive Midfielder": "Volante mixto izquierdo",
  "Left Defensive Midfield": "Volante mixto izquierdo",
  "Right Midfielder": "Volante derecho",
  "Right Midfield": "Volante derecho",
  "Right Centre Midfielder": "Interior derecho",
  "Right Center Midfield": "Interior derecho",
  "Centre Midfielder": "Volante central",
  "Center Midfield": "Volante central",
  "Left Centre Midfielder": "Interior izquierdo",
  "Left Center Midfield": "Interior izquierdo",
  "Left Midfielder": "Volante izquierdo",
  "Left Midfield": "Volante izquierdo",
  "Right Wing": "Extremo derecho",
  "Right Attacking Midfielder": "Mediapunta derecho",
  "Right Attacking Midfield": "Mediapunta derecho",
  "Centre Attacking Midfielder": "Mediapunta",
  "Center Attacking Midfield": "Mediapunta",
  "Left Attacking Midfielder": "Mediapunta izquierdo",
  "Left Attacking Midfield": "Mediapunta izquierdo",
  "Left Wing": "Extremo izquierdo",
  "Right Centre Forward": "Delantero derecho",
  "Right Center Forward": "Delantero derecho",
  Striker: "Delantero centro",
  "Left Centre Forward": "Delantero izquierdo",
  "Left Center Forward": "Delantero izquierdo",
  "Secondary Striker": "Segundo delantero",
  "Centre Forward": "Delantero centro",
  "Center Forward": "Delantero centro",
};

function posicionEs(posicion: string | null): string | null {
  if (!posicion) return null;
  return POSICIONES_ES[posicion] ?? posicion;
}

function lineaDePosicion(posicionEsTexto: string): JugadorAlineado["linea"] {
  const t = posicionEsTexto.toLowerCase();
  if (t.includes("arquero")) return "Portero";
  if (t.includes("central") || t.includes("lateral") || t.includes("carrilero")) return "Defensa";
  if (t.includes("volante") || t.includes("interior")) return "Mediocampo";
  return "Ataque"; // mediapunta, extremo, delantero
}

function tendencia(valores: number[], invert: boolean): MetricaComparada["tendenciaRival"] {
  if (valores.length < 4) return null;
  // valores vienen ordenados de más reciente a más antiguo (igual que la muestra); se compara mitad reciente vs. mitad anterior.
  const mitad = Math.floor(valores.length / 2);
  const reciente = promedio(valores.slice(0, mitad));
  const anterior = promedio(valores.slice(mitad));
  if (reciente === null || anterior === null || anterior === 0) return null;
  const cambio = (reciente - anterior) / Math.abs(anterior);
  if (Math.abs(cambio) < 0.08) return "estable";
  const mejorando = invert ? cambio < 0 : cambio > 0;
  return mejorando ? "subiendo" : "bajando";
}

// Métricas pedidas para "tendencia partido a partido" — mismos ids que metric_definitions.json, sin duplicar
// fórmulas. "deepProgressionsPerMatch" y "obvPerMatch" se sacaron y se reemplazaron por los córners (a favor y en
// contra) a pedido explícito del usuario. "Recuperaciones en campo rival" se agrega aparte (ver
// recuperacionesEnCampoRivalPorPartido) porque no es un campo de Team Match Stats — se deriva de eventos reales.
const IDS_TENDENCIA_PARTIDO = [
  "npxgPerMatch",
  "npxgConcededPerMatch",
  "shotsPerMatch",
  "shotsConcededPerMatch",
  "ppda",
  "possessionPercentage",
  "cornersPerMatch",
  "cornersConcededPerMatch",
];

/**
 * Evolución real de cada métrica, partido a partido de la muestra (no un promedio). `rivalStats` puede tener
 * menos filas que `partidos` si algún partido no tiene Team Match Stats — por eso se empareja por match_id,
 * nunca por posición. Se ordena cronológicamente (más antiguo primero) para que un gráfico de línea sea legible.
 */
function tendenciasPartidoAPartido(
  definiciones: MetricDef[],
  rivalStats: StatsBombTeamMatchStats[],
  partidos: MuestraPartido[],
): TendenciaPartidoAPartido[] {
  const datosPorMatchId = new Map(partidos.map((p) => [p.matchId, { fecha: p.fecha, rival: p.rival }]));
  const statsOrdenados = [...rivalStats].sort((a, b) =>
    (datosPorMatchId.get(a.match_id)?.fecha ?? "").localeCompare(datosPorMatchId.get(b.match_id)?.fecha ?? ""),
  );

  return IDS_TENDENCIA_PARTIDO.map((id) => {
    const def = definiciones.find((d) => d.id === id);
    if (!def) return null;
    const campo = def.source as keyof StatsBombTeamMatchStats;
    const escala = def.unit === "%" ? 100 : 1;
    const puntos: PuntoTendenciaPartido[] = statsOrdenados.map((s) => {
      const valorCrudo = s[campo] as number | null | undefined;
      const datos = datosPorMatchId.get(s.match_id);
      return {
        matchId: s.match_id,
        fecha: datos?.fecha ?? "",
        rival: datos?.rival ?? "?",
        valor: valorCrudo !== null && valorCrudo !== undefined ? valorCrudo * escala : null,
      };
    });
    return { id: def.id, name: def.name, unit: def.unit, puntos };
  }).filter((t): t is TendenciaPartidoAPartido => t !== null);
}

/**
 * "Recuperaciones en campo rival por partido" no es un campo de Team Match Stats (no lo publica StatsBomb como
 * agregado) — se cuenta partido a partido a partir de eventos reales de Ball Recovery, mismo criterio que
 * `recuperacionesEnCampoRival` (x >= 60). Se arma aparte de `tendenciasPartidoAPartido` porque esa función solo
 * sabe leer campos directos de StatsBombTeamMatchStats.
 */
function tendenciaRecuperacionesCampoRival(
  eventosPorPartido: StatsBombEvent[][],
  teamId: number,
  partidos: MuestraPartido[],
): TendenciaPartidoAPartido {
  const puntos: PuntoTendenciaPartido[] = partidos
    .map((p, i) => ({
      matchId: p.matchId,
      fecha: p.fecha,
      rival: p.rival,
      valor: recuperacionesEnCampoRival(eventosPorPartido[i] ?? [], teamId).totalCampoRival,
    }))
    .sort((a, b) => a.fecha.localeCompare(b.fecha));
  return { id: "recoveriesFhalfPerMatch", name: "Recuperaciones en campo rival por partido", unit: "recuperaciones/partido", puntos };
}

function interpretar(m: Omit<MetricaComparada, "interpretacion">): string {
  if (m.nuestroValor === null || m.rivalValor === null) return "Datos no disponibles para esta métrica en la muestra.";
  const rivalMejor = m.invert ? m.rivalValor < m.nuestroValor : m.rivalValor > m.nuestroValor;
  const magnitud = m.diferenciaPorcentual !== null ? Math.abs(m.diferenciaPorcentual) : 0;
  const calificador = magnitud > 25 ? "notablemente" : magnitud > 10 ? "moderadamente" : "levemente";
  const base = rivalMejor
    ? `El rival es ${calificador} superior a nosotros en ${m.name.toLowerCase()} (${m.rivalValor.toFixed(2)} vs. ${m.nuestroValor.toFixed(2)}).`
    : `Somos ${calificador} superiores al rival en ${m.name.toLowerCase()} (${m.nuestroValor.toFixed(2)} vs. ${m.rivalValor.toFixed(2)}).`;
  const liga =
    m.promedioLiga !== null
      ? ` El promedio de liga es ${m.promedioLiga.toFixed(2)}, y el rival está en el percentil ${m.percentilRival ?? "s/d"}.`
      : "";
  return base + liga;
}

function interpretarShotMap(shots: ShotMapEntry[], rivalNombre: string): string[] {
  if (shots.length === 0) return ["No hay remates registrados en la muestra analizada."];
  const lineas: string[] = [];
  const totalXg = shots.reduce((acc, s) => acc + s.xg, 0);
  lineas.push(
    `${rivalNombre} generó ${shots.length} remates (${totalXg.toFixed(2)} xG total) en los ${shots.length > 0 ? "partidos" : ""} de la muestra — ${(totalXg / shots.length).toFixed(2)} xG por remate en promedio.`,
  );
  const contraataque = shots.filter((s) => s.playPattern === "From Counter").length;
  if (contraataque > 0) {
    lineas.push(
      `El ${Math.round((contraataque / shots.length) * 100)}% de sus remates llegan de contraataque directo — atención a las transiciones rápidas.`,
    );
  }
  const canales = shots.reduce(
    (acc, s) => {
      const canal = canalDeCancha(s.location[1]);
      acc[canal].remates++;
      acc[canal].xg += s.xg;
      return acc;
    },
    {
      izquierdo: { remates: 0, xg: 0 },
      central: { remates: 0, xg: 0 },
      derecho: { remates: 0, xg: 0 },
    } as Record<"izquierdo" | "central" | "derecho", { remates: number; xg: number }>,
  );
  const canalTopRemates = (Object.entries(canales) as [string, { remates: number; xg: number }][]).sort((a, b) => b[1].remates - a[1].remates)[0];
  const canalTopXg = (Object.entries(canales) as [string, { remates: number; xg: number }][]).sort((a, b) => b[1].xg - a[1].xg)[0];
  if (canalTopRemates) {
    lineas.push(
      `${canalTopRemates[1].remates} de sus ${shots.length} remates (${Math.round((canalTopRemates[1].remates / shots.length) * 100)}%) parten del carril ${canalTopRemates[0]}.`,
    );
  }
  if (canalTopXg && canalTopXg[0] !== canalTopRemates?.[0]) {
    lineas.push(
      `El mayor peligro real está en el carril ${canalTopXg[0]}: concentra ${canalTopXg[1].xg.toFixed(2)} xG acumulado, aunque no sea el carril con más remates.`,
    );
  }
  const cabeza = shots.filter((s) => s.bodyPart === "Head").length;
  if (cabeza > 0) {
    lineas.push(`${Math.round((cabeza / shots.length) * 100)}% de sus remates son de cabeza — relevante para defensa de centros y ABP.`);
  }
  return lineas;
}

function interpretarPassNetwork(red: PassNetwork, rivalNombre: string): string[] {
  if (red.nodes.length === 0) return ["No hay datos de pases suficientes en la muestra analizada."];
  const lineas: string[] = [];
  const masInvolucrado = [...red.nodes].sort((a, b) => b.passesCompleted - a.passesCompleted)[0];
  lineas.push(
    `${masInvolucrado.playerName} es el jugador con más pases completados de ${rivalNombre} en la muestra (${masInvolucrado.passesCompleted}) — probable eje de la circulación.`,
  );
  const nombrePorId = new Map(red.nodes.map((n) => [n.playerId, n.playerName]));
  const topConexiones = [...red.edges].sort((a, b) => b.count - a.count).slice(0, 5);
  topConexiones.forEach((c, i) => {
    const de = nombrePorId.get(c.fromPlayerId) ?? "?";
    const a = nombrePorId.get(c.toPlayerId) ?? "?";
    lineas.push(
      i === 0
        ? `La conexión más frecuente es ${de} → ${a} (${c.count} pases) — vía de circulación a vigilar.`
        : `Otra asociación clave: ${de} → ${a} (${c.count} pases).`,
    );
  });
  const alturaMediaY = promedio(red.nodes.map((n) => n.avgLocation[0]));
  if (alturaMediaY !== null) {
    lineas.push(
      alturaMediaY > 60
        ? "La posición media de circulación está adelantada en el campo — el equipo juega con líneas altas."
        : alturaMediaY < 45
          ? "La posición media de circulación está retrasada — el equipo construye desde atrás con más cautela."
          : "La posición media de circulación es intermedia, sin un sesgo claro hacia un tercio del campo.",
    );
  }
  return lineas;
}

async function construirScatter(
  supabase: Awaited<ReturnType<typeof createClient>>,
  params: {
    staffTeamId: string | null;
    competitionId: number;
    seasonId: number;
    rivalStatsbombId: number;
    ourTeamStatsbombId: number;
    titulo: string;
    xId: string;
    xLabel: string;
    yId: string;
    yLabel: string;
    xInvertido: boolean;
    yInvertido: boolean;
    grupo: number;
    interpretar: (puntos: ScatterEquipo[]) => string;
    /** Transformación real sobre el valor ya obtenido (ej. 100 - posesión = posesión concedida) — no trae datos nuevos, solo reexpresa los mismos. */
    transformX?: (v: number) => number;
    transformY?: (v: number) => number;
  },
): Promise<ScatterPlot | null> {
  if (!params.staffTeamId) return null;
  const { data: rows } = await supabase
    .from("statsbomb_league_team_values")
    .select("metric_id, statsbomb_team_id, statsbomb_team_name, valor")
    .eq("team_id", params.staffTeamId)
    .eq("competition_id", params.competitionId)
    .eq("season_id", params.seasonId)
    .in("metric_id", [params.xId, params.yId]);
  if (!rows || rows.length === 0) return null;

  const porEquipo = new Map<number, { nombre: string; x: number | null; y: number | null }>();
  for (const r of rows) {
    const actual = porEquipo.get(r.statsbomb_team_id) ?? { nombre: r.statsbomb_team_name, x: null, y: null };
    if (r.metric_id === params.xId) actual.x = Number(r.valor);
    if (r.metric_id === params.yId) actual.y = Number(r.valor);
    porEquipo.set(r.statsbomb_team_id, actual);
  }

  const puntos: ScatterEquipo[] = [...porEquipo.entries()]
    .filter((entry): entry is [number, { nombre: string; x: number; y: number }] => entry[1].x !== null && entry[1].y !== null)
    .map(([teamId, v]) => ({
      nombre: v.nombre,
      escudoUrl: escudoClubUruguayo(v.nombre),
      x: params.transformX ? params.transformX(v.x) : v.x,
      y: params.transformY ? params.transformY(v.y) : v.y,
      esNosotros: teamId === params.ourTeamStatsbombId,
      esRival: teamId === params.rivalStatsbombId,
    }));

  if (puntos.length === 0) return null;
  return {
    titulo: params.titulo,
    ejeXLabel: params.xLabel,
    ejeYLabel: params.yLabel,
    xInvertido: params.xInvertido,
    yInvertido: params.yInvertido,
    puntos,
    interpretacion: params.interpretar(puntos),
    grupo: params.grupo,
  };
}

export async function buildOpponentReportData(rivalNombreInput: string): Promise<OpponentReportData> {
  const env = readStatsBombEnv();
  if (!env) {
    throw new StatsBombConfigError(
      "StatsBomb no está configurado (faltan variables de entorno). Ver statsbomb/STATSBOMB_SETUP.md.",
    );
  }

  const connector = getStatsBombConnector();
  const { matchesRival, rivalEquipo, competitionId: rivalCompetitionId, seasonId: rivalSeasonId, otraCompeticion } =
    await resolverRivalYCompeticion(connector, env, rivalNombreInput);

  const matchesNuestro = otraCompeticion ? await connector.getMatches(env.competitionId, env.seasonId) : matchesRival;

  const rivalDisponibles = matchesRival.filter(
    (m) => m.home_team.home_team_id === rivalEquipo.id || m.away_team.away_team_id === rivalEquipo.id,
  );
  const nuestrosDisponibles = matchesNuestro.filter(
    (m) => m.home_team.home_team_id === env.ourTeamId || m.away_team.away_team_id === env.ourTeamId,
  );

  const muestraRivalMatches = ultimosN(rivalDisponibles, SAMPLE_SIZE);
  const muestraNuestraMatches = ultimosN(nuestrosDisponibles, SAMPLE_SIZE);

  // Si el rival aparece en otra competencia que la nuestra (ej. copa continental que esta
  // cuenta de StatsBomb no tiene habilitada, pero sí su liga doméstica), no hay forma de
  // saber el próximo cruce ni el historial directo — se avisa en advertencias más abajo.
  const cruces = otraCompeticion
    ? []
    : matchesNuestro.filter(
        (m) =>
          (m.home_team.home_team_id === env.ourTeamId && m.away_team.away_team_id === rivalEquipo.id) ||
          (m.away_team.away_team_id === env.ourTeamId && m.home_team.home_team_id === rivalEquipo.id),
      );
  const proximo = cruces.find((m) => m.match_status === "scheduled");
  const cruceJugados = cruces.filter((m) => m.match_status === "available");

  const [rivalStats, nuestrasStats] = await Promise.all([
    statsDeMuestra(connector.getTeamMatchStats.bind(connector), muestraRivalMatches.map((m) => m.match_id), rivalEquipo.id),
    statsDeMuestra(connector.getTeamMatchStats.bind(connector), muestraNuestraMatches.map((m) => m.match_id), env.ourTeamId),
  ]);

  // Baseline de liga (promedio + desvío), calculado periódicamente por scripts/compute-statsbomb-league-baseline.mjs.
  // Si todavía no se corrió, el informe sigue funcionando sin promedio de liga / percentil (se muestra "s/d").
  // Se calcula por separado para la competencia del rival y la nuestra: si son la misma
  // (el caso normal), es el mismo resultado; si no, cada uno se compara contra SU propia liga.
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: staff } = user
    ? await supabase.from("staff_users").select("team_id").eq("id", user.id).single()
    : { data: null };

  async function cargarBaseline(competitionId: number, seasonId: number) {
    if (!staff) return { mapa: new Map<string, { promedio: number; desvio_estandar: number }>(), computedAt: null as string | null };
    const { data } = await supabase
      .from("statsbomb_league_baseline")
      .select("metric_id, promedio, desvio_estandar, computed_at")
      .eq("team_id", staff.team_id)
      .eq("competition_id", competitionId)
      .eq("season_id", seasonId);
    const mapa = new Map((data ?? []).map((b) => [b.metric_id, b]));
    const computedAt = data && data.length > 0 ? data[0].computed_at : null;
    return { mapa, computedAt };
  }

  const baselineNuestroCargado = await cargarBaseline(env.competitionId, env.seasonId);
  const baselineRivalCargado = otraCompeticion ? await cargarBaseline(rivalCompetitionId, rivalSeasonId) : baselineNuestroCargado;
  const baselineNuestro = baselineNuestroCargado.mapa;
  const baselineRival = baselineRivalCargado.mapa;

  const definiciones = loadMetricDefinitions();
  const metricas: MetricaComparada[] = definiciones.map((def) => {
    const campo = def.source as keyof StatsBombTeamMatchStats;
    // Los campos "_ratio"/"possession" de Team Match Stats v3 vienen como fracción
    // 0-1 (verificado contra datos reales), no como 0-100 pese a documentarse como "%".
    const escala = def.unit === "%" ? 100 : 1;
    const nuestroValor = promedioEscalado(nuestrasStats.map((s) => s[campo] as number | null), escala);
    const rivalValor = promedioEscalado(rivalStats.map((s) => s[campo] as number | null), escala);
    const rivalValoresOrdenados = rivalStats.map((s) => ((s[campo] as number | null) ?? 0) * escala);

    const baseNuestro = baselineNuestro.get(def.id);
    const baseRival = baselineRival.get(def.id);
    const percentilDe = (valor: number | null, base: typeof baseNuestro) => {
      if (valor === null || !base || base.desvio_estandar === 0) return null;
      const z = (valor - base.promedio) / base.desvio_estandar;
      return percentilDesdeZ(z);
    };

    const diferenciaAbsoluta = nuestroValor !== null && rivalValor !== null ? rivalValor - nuestroValor : null;
    const diferenciaPorcentual =
      nuestroValor !== null && rivalValor !== null && nuestroValor !== 0
        ? ((rivalValor - nuestroValor) / Math.abs(nuestroValor)) * 100
        : null;

    const parcial: Omit<MetricaComparada, "interpretacion"> = {
      id: def.id,
      name: def.name,
      unit: def.unit,
      fase: def.fase,
      invert: def.invert ?? false,
      interpretationBase: def.interpretation ?? null,
      nuestroValor,
      rivalValor,
      diferenciaAbsoluta,
      diferenciaPorcentual,
      promedioLiga: baseRival?.promedio ?? null,
      percentilRival: percentilDe(rivalValor, baseRival),
      percentilNuestro: percentilDe(nuestroValor, baseNuestro),
      tendenciaRival: tendencia(rivalValoresOrdenados, def.invert ?? false),
    };
    return { ...parcial, interpretacion: interpretar(parcial) };
  });

  // Métrica derivada (no viene de metric_definitions.json): eficiencia de finalización = goles reales / xG generado.
  // Se arma a partir de dos métricas ya calculadas arriba — ningún dato nuevo, solo una razón entre dos valores reales.
  // Sin baseline de liga propio: percentil/promedio de liga quedan "s/d", igual que cualquier métrica sin baseline calculado.
  const metricaGoles = metricas.find((m) => m.id === "goalsPerMatch");
  const metricaNpxg = metricas.find((m) => m.id === "npxgPerMatch");
  if (metricaGoles && metricaNpxg) {
    const ratio = (goles: number | null, xg: number | null) => (goles !== null && xg !== null && xg !== 0 ? goles / xg : null);
    const nuestroValorFinalizacion = ratio(metricaGoles.nuestroValor, metricaNpxg.nuestroValor);
    const rivalValorFinalizacion = ratio(metricaGoles.rivalValor, metricaNpxg.rivalValor);
    const diferenciaAbsolutaFinalizacion =
      nuestroValorFinalizacion !== null && rivalValorFinalizacion !== null ? rivalValorFinalizacion - nuestroValorFinalizacion : null;
    const diferenciaPorcentualFinalizacion =
      nuestroValorFinalizacion !== null && rivalValorFinalizacion !== null && nuestroValorFinalizacion !== 0
        ? ((rivalValorFinalizacion - nuestroValorFinalizacion) / Math.abs(nuestroValorFinalizacion)) * 100
        : null;
    const parcialFinalizacion: Omit<MetricaComparada, "interpretacion"> = {
      id: "finishingEfficiency",
      name: "Eficiencia de finalización",
      unit: "goles por xG",
      fase: "identidad",
      invert: false,
      interpretationBase:
        "Relación entre goles convertidos y xG generado — valores por encima de 1 indican una definición más eficiente de lo esperado; por debajo, chances desperdiciadas.",
      nuestroValor: nuestroValorFinalizacion,
      rivalValor: rivalValorFinalizacion,
      diferenciaAbsoluta: diferenciaAbsolutaFinalizacion,
      diferenciaPorcentual: diferenciaPorcentualFinalizacion,
      promedioLiga: null,
      percentilRival: null,
      percentilNuestro: null,
      tendenciaRival: null,
    };
    metricas.push({ ...parcialFinalizacion, interpretacion: interpretar(parcialFinalizacion) });
  }

  // Mapa de tiros y red de pases del rival: eventos reales de la muestra.
  const eventosPorPartidoRival = await Promise.all(muestraRivalMatches.map((m) => connector.getEvents(m.match_id)));
  const eventosRival = eventosPorPartidoRival.flat();

  // Recuperaciones en campo rival de NUESTRO equipo (no solo del rival) — para poder comparar el par completo en
  // "Identidad general", igual que el resto de las métricas de esa página. No es un campo de Team Match Stats, así
  // que hace falta bajar también nuestros propios eventos (algo que el resto del informe no necesita).
  const eventosNuestro = (await Promise.all(muestraNuestraMatches.map((m) => connector.getEvents(m.match_id)))).flat();
  const recuperacionesCampoRivalNuestroTemp = recuperacionesEnCampoRival(eventosNuestro, env.ourTeamId);
  {
    const nuestroValorRec = recuperacionesCampoRivalNuestroTemp.totalCampoRival / Math.max(1, muestraNuestraMatches.length);
    const rivalValorRec =
      recuperacionesEnCampoRival(eventosRival, rivalEquipo.id).totalCampoRival / Math.max(1, muestraRivalMatches.length);
    const parcialRec: Omit<MetricaComparada, "interpretacion"> = {
      id: "recoveriesFhalfPerMatch",
      name: "Recuperaciones en campo rival",
      unit: "recuperaciones/partido",
      fase: "identidad",
      invert: false,
      interpretationBase:
        "Recuperaciones reales (Ball Recovery) en la mitad de cancha del rival por partido — no es un campo de Team Match Stats, se cuenta a partir de eventos reales.",
      nuestroValor: nuestroValorRec,
      rivalValor: rivalValorRec,
      diferenciaAbsoluta: rivalValorRec - nuestroValorRec,
      diferenciaPorcentual: nuestroValorRec !== 0 ? ((rivalValorRec - nuestroValorRec) / Math.abs(nuestroValorRec)) * 100 : null,
      promedioLiga: null,
      percentilRival: null,
      percentilNuestro: null,
      tendenciaRival: null,
    };
    metricas.push({ ...parcialRec, interpretacion: interpretar(parcialRec) });
  }

  // Pases clave de TODA la temporada (no solo la muestra de 6 partidos) — a diferencia del resto del informe,
  // esto pide eventos de todos los partidos disponibles del rival en la temporada. Si StatsBomb falla a mitad de
  // camino (le pasó varias veces en esta sesión) no se rompe el informe entero: esta sección puntual queda null
  // y el resto se genera igual, sin inventar nada en su lugar.
  const partidosTemporadaCompletaRival = rivalDisponibles.filter((m) => m.match_status === "available");
  let pasesClaveTemporadaRival: PasesClaveTemporada | null = null;
  try {
    const eventosTemporadaCompleta = await Promise.all(partidosTemporadaCompletaRival.map((m) => connector.getEvents(m.match_id)));
    pasesClaveTemporadaRival = pasesClaveDeTemporada(eventosTemporadaCompleta, rivalEquipo.id);
  } catch {
    pasesClaveTemporadaRival = null;
  }
  const shotMapRival = extractShotMap(eventosRival, rivalEquipo.id);
  const passNetworkRival = extractPassNetwork(eventosRival, rivalEquipo.id);
  const shotMapInterpretacion = interpretarShotMap(shotMapRival, rivalEquipo.name);
  const passNetworkInterpretacion = interpretarPassNetwork(passNetworkRival, rivalEquipo.name);

  // Top 3 asociaciones de pase (hacia / desde) por jugador, para las fichas de jugadores clave.
  const nombrePorPlayerId = new Map(passNetworkRival.nodes.map((nd) => [nd.playerId, nd.playerName]));
  function topAsociaciones(playerId: number, direccion: "desde" | "hacia"): { nombre: string; pases: number }[] {
    return passNetworkRival.edges
      .filter((e) => (direccion === "desde" ? e.fromPlayerId === playerId : e.toPlayerId === playerId))
      .map((e) => ({
        nombre: nombrePorPlayerId.get(direccion === "desde" ? e.toPlayerId : e.fromPlayerId) ?? "Desconocido",
        pases: e.count,
      }))
      .sort((a, b) => b.pases - a.pases)
      .slice(0, 3);
  }

  // Jugadores clave: goles/asistencias de la muestra (Lineups) + bio y métricas de temporada (Player Season Stats).
  // También se usan las mismas Lineups para detectar la formación más usada por cada equipo (Starting XI).
  const [temporadaJugadores, ...lineupsTodos] = await Promise.all([
    connector.getPlayerSeasonStats(rivalCompetitionId, rivalSeasonId),
    ...muestraRivalMatches.map((m) => connector.getLineups(m.match_id)),
    ...muestraNuestraMatches.map((m) => connector.getLineups(m.match_id)),
  ]);
  const lineupsRival = lineupsTodos.slice(0, muestraRivalMatches.length);
  const lineupsNuestra = lineupsTodos.slice(muestraRivalMatches.length);
  const temporadaPorId = new Map<number, StatsBombPlayerSeasonStats>(temporadaJugadores.map((p) => [p.player_id, p]));

  // Dorsal real (StatsBomb Lineups v5, jersey_number) — no está en Player Season Stats, hay que sacarlo de los lineups.
  const dorsalPorJugador = new Map<number, number>();
  for (const lineupsPartido of lineupsRival) {
    const lineupEquipo = lineupsPartido.find((l) => l.team_id === rivalEquipo.id);
    for (const jugador of lineupEquipo?.lineup ?? []) {
      if (!dorsalPorJugador.has(jugador.player_id)) dorsalPorJugador.set(jugador.player_id, jugador.jersey_number);
    }
  }
  passNetworkRival.nodes.forEach((nd) => {
    nd.dorsal = dorsalPorJugador.get(nd.playerId) ?? null;
  });
  const estructuraRival = formacionMasUsada(lineupsRival, rivalEquipo.id);
  const estructuraNuestra = formacionMasUsada(lineupsNuestra, env.ourTeamId);
  const muestraRivalPartidos = muestraRivalMatches.map((m) => aMuestraPartido(m, rivalEquipo.id));
  const muestraNuestraPartidos = muestraNuestraMatches.map((m) => aMuestraPartido(m, env.ourTeamId));
  // Misma lógica ya usada para el rival (Starting XI real de un partido concreto de la muestra, no una predicción)
  // aplicada a nuestro propio equipo, para la nueva página de alineaciones probables de ambos equipos.
  const alineacionesProbablesNuestro = construirAlineacionesProbables(lineupsNuestra, muestraNuestraPartidos, env.ourTeamId);
  const tendenciasPartidoRival = [
    ...tendenciasPartidoAPartido(definiciones, rivalStats, muestraRivalPartidos),
    tendenciaRecuperacionesCampoRival(eventosPorPartidoRival, rivalEquipo.id, muestraRivalPartidos),
  ];
  const alineacionesProbablesRival = construirAlineacionesProbables(lineupsRival, muestraRivalPartidos, rivalEquipo.id);
  const estructurasRecientesRival = estructurasPorPartido(lineupsRival, muestraRivalPartidos, rivalEquipo.id);
  const alineacionesPorPartidoRival = fasesFormacionPorPartido(lineupsRival, eventosPorPartidoRival, muestraRivalPartidos, rivalEquipo.id);
  const sustitucionesHabitualesRival = sustitucionesHabituales(eventosPorPartidoRival, rivalEquipo.id);
  const estructuraInterpretacion = interpretarEstructura(estructurasRecientesRival, sustitucionesHabitualesRival, rivalEquipo.name);
  const patronSustitucionesRival = analizarSustituciones(eventosPorPartidoRival, rivalEquipo.id);
  const golesPorFranjaRival = golesPorFranja(eventosPorPartidoRival, rivalEquipo.id);

  // Transiciones (contraataque real, play_pattern "From Counter") y balón parado (córners/libres reales).
  const campogramaTransicionesRival = campogramaDeUbicaciones(origenesDeContraataque(eventosRival, rivalEquipo.id), 3, 3);
  const jugadoresTransicionRival = jugadoresEnTransicion(eventosRival, rivalEquipo.id);
  const ejecutoresAbpRival = ejecutoresAbp(eventosRival, rivalEquipo.id);
  const receptoresAbpRival = receptoresAbp(eventosRival, rivalEquipo.id);
  const iniciosArqueroRival = iniciosArquero(eventosRival, rivalEquipo.id);
  const perdidasEnInicioRival = perdidasEnInicio(eventosRival, rivalEquipo.id);
  const mapaPresionRival = mapaPresion(eventosRival, rivalEquipo.id);
  const recuperacionesCampoRivalRival = recuperacionesEnCampoRival(eventosRival, rivalEquipo.id);
  // Dorsal real por jugador (Lineups v5 de todos los partidos de la muestra) para poder mostrar el número de
  // camiseta en el campograma de tarjetas — no viene en el evento de la tarjeta en sí.
  const dorsalPorIdRival = new Map<number, number | null>();
  for (const lineupsPartido of lineupsRival) {
    const lineupEquipo = lineupsPartido.find((l) => l.team_id === rivalEquipo.id);
    if (!lineupEquipo) continue;
    for (const j of lineupEquipo.lineup) dorsalPorIdRival.set(j.player_id, j.jersey_number);
  }
  const disciplinaContextualizadaRival = disciplinaContextualizada(eventosRival, rivalEquipo.id).map((f) => ({
    ...f,
    dorsal: f.playerId !== null ? (dorsalPorIdRival.get(f.playerId) ?? null) : null,
  }));
  const faltasSinTarjetaRival = faltasSinTarjeta(eventosRival, rivalEquipo.id).map((f) => ({
    ...f,
    dorsal: f.playerId !== null ? (dorsalPorIdRival.get(f.playerId) ?? null) : null,
  }));
  // Goles reales de TODA la temporada por jugador (no solo la muestra de 6 partidos) — mismo cálculo ya verificado
  // que usa jugadoresClaveRival: por90 real × minutos reales de temporada.
  const topRematadoresRival = topRematadores(shotMapRival).map((r) => {
    const temporada = temporadaPorId.get(r.playerId) ?? null;
    return { ...r, golesTemporada: totalTemporada(temporada?.player_season_goals_90 ?? null, temporada?.player_season_minutes ?? null) };
  });

  const acumulado = new Map<number, { nombre: string; goles: number; asistencias: number }>();
  const todosLosJugadoresRival = new Map<number, string>();
  for (const lineups of lineupsRival) {
    const lineupRival = lineups.find((l) => l.team_id === rivalEquipo.id);
    if (!lineupRival) continue;
    for (const jugador of lineupRival.lineup) {
      const actual = acumulado.get(jugador.player_id) ?? { nombre: jugador.player_name, goles: 0, asistencias: 0 };
      actual.goles += jugador.stats.goals ?? 0;
      actual.asistencias += jugador.stats.assists ?? 0;
      acumulado.set(jugador.player_id, actual);
      todosLosJugadoresRival.set(jugador.player_id, jugador.player_name);
    }
  }

  const jugadoresClaveRival: JugadorClave[] = [...acumulado.entries()]
    .filter(([, v]) => v.goles > 0 || v.asistencias > 0)
    .sort((a, b) => b[1].goles + b[1].asistencias - (a[1].goles + a[1].asistencias))
    .slice(0, 6)
    .map(([playerId, v]) => {
      const temporada = temporadaPorId.get(playerId) ?? null;
      return {
        playerId,
        nombre: v.nombre,
        nombreConocido: temporada?.player_known_name ?? null,
        posicion: posicionEs(temporada?.primary_position ?? null),
        edad: calcularEdad(temporada?.birth_date ?? null),
        altura: temporada?.player_height ?? null,
        pieHabil: pieHabilDesdeRatio(temporada?.player_season_left_foot_ratio ?? null),
        golesMuestra: v.goles,
        asistenciasMuestra: v.asistencias,
        golesTemporada: totalTemporada(temporada?.player_season_goals_90 ?? null, temporada?.player_season_minutes ?? null),
        asistenciasTemporada: totalTemporada(temporada?.player_season_assists_90 ?? null, temporada?.player_season_minutes ?? null),
        minutosTemporada: temporada?.player_season_minutes ?? null,
        golesPor90: temporada?.player_season_goals_90 ?? null,
        xgPor90: temporada?.player_season_np_xg_90 ?? null,
        asistenciasPor90: temporada?.player_season_assists_90 ?? null,
        obvPor90: temporada?.player_season_obv_90 ?? null,
        progresionesPor90: temporada?.player_season_deep_progressions_90 ?? null,
        pressuresPor90: temporada?.player_season_pressures_90 ?? null,
        pasesHaciaTop: topAsociaciones(playerId, "desde"),
        recibeDeTop: topAsociaciones(playerId, "hacia"),
      };
    });

  // Cuadro de pases de toda la plantilla que apareció en la muestra (no solo los goleadores/asistidores).
  const plantillaPasesRival: JugadorPases[] = [...todosLosJugadoresRival.entries()]
    .map(([playerId, nombre]) => {
      const temporada = temporadaPorId.get(playerId) ?? null;
      return {
        playerId,
        nombre,
        nombreConocido: temporada?.player_known_name ?? null,
        posicion: posicionEs(temporada?.primary_position ?? null),
        minutosTemporada: temporada?.player_season_minutes ?? null,
        pasesPor90: temporada?.player_season_op_passes_90 ?? null,
        precisionPase: temporada?.player_season_passing_ratio != null ? temporada.player_season_passing_ratio * 100 : null,
        // player_season_lbp_completed_90 viene siempre vacío para esta liga (verificado contra datos reales,
        // 480/480 jugadores sin valor) — se usa deep_progressions_90, que sí tiene datos reales para todos.
        pasesProgresivosPor90: temporada?.player_season_deep_progressions_90 ?? null,
        keyPassesPor90: temporada?.player_season_key_passes_90 ?? null,
      };
    })
    .filter((j) => j.pasesPor90 !== null)
    .sort((a, b) => (b.pasesPor90 ?? 0) - (a.pasesPor90 ?? 0));

  // Plantel completo del rival (Player Season Stats v6, temporada completa) — no se limita a la muestra de 6 partidos.
  // Minutos reales en la muestra de 6 partidos analizada (no la temporada completa) — pedido explícito del usuario:
  // el plantel debe reflejar la carga de minutos de los partidos que efectivamente se están analizando acá.
  const minutosMuestraPorJugador = minutosPorPartidoMuestra(eventosPorPartidoRival, lineupsRival, rivalEquipo.id);

  // Red de pases limitada a los 11 de más minutos reales — mostrar a todos los que pasaron la pelota daba la
  // impresión de que jugaban más de 11 jugadores a la vez (pedido explícito del usuario).
  const idsTop11 = new Set(
    [...minutosMuestraPorJugador.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 11)
      .map(([playerId]) => playerId),
  );
  const passNetworkRivalTop11: PassNetwork = {
    nodes: passNetworkRival.nodes.filter((nd) => idsTop11.has(nd.playerId)),
    edges: passNetworkRival.edges.filter((e) => idsTop11.has(e.fromPlayerId) && idsTop11.has(e.toPlayerId)),
  };

  // Once probable: continuidad real (titularidades + minutos) en la muestra analizada — no infiere lesiones ni convocatoria.
  const onceProbableRival: JugadorOnceProbable[] = titularidadesPorJugador(lineupsRival, rivalEquipo.id).map((t) => ({
    playerId: t.playerId,
    nombre: t.nombre,
    posicion: posicionEs(t.posicion),
    titularidades: t.titularidades,
    totalPartidosMuestra: muestraRivalMatches.length,
    minutosMuestra: minutosMuestraPorJugador.get(t.playerId) ?? 0,
  }));
  const sistemasUtilizadosRival = sistemasConFrecuencia(lineupsRival, rivalEquipo.id);

  const plantelCompletoRival: JugadorPlantel[] = temporadaJugadores
    .filter((p) => p.team_id === rivalEquipo.id)
    .map((p) => ({
      playerId: p.player_id,
      dorsal: dorsalPorJugador.get(p.player_id) ?? null,
      nombre: p.player_name,
      nombreConocido: p.player_known_name,
      posicion: posicionEs(p.primary_position),
      edad: calcularEdad(p.birth_date),
      altura: p.player_height,
      pieHabil: pieHabilDesdeRatio(p.player_season_left_foot_ratio),
      minutosMuestra: minutosMuestraPorJugador.get(p.player_id) ?? 0,
    }))
    .sort((a, b) => b.minutosMuestra - a.minutosMuestra);

  // Radar: percentiles de métricas clave, ajustados para que "más alto" siempre sea "mejor".
  // Nota: no incluye "faltas" porque StatsBomb Team Match Stats v3 (verificado) no trae ese campo.
  const RADAR_METRIC_IDS = [
    "npxgPerMatch",
    "npxgConcededPerMatch",
    "shotsPerMatch",
    "shotsConcededPerMatch",
    "possessionPercentage",
    "passingRatio",
    "ppda",
    "cornerXgPerMatch",
    "obvPerMatch",
  ];
  const radar: RadarPunto[] = RADAR_METRIC_IDS.map((id) => {
    const m = metricas.find((mm) => mm.id === id);
    if (!m) return null;
    const ajustar = (p: number | null) => (p === null ? null : m.invert ? 100 - p : p);
    return {
      metricId: id,
      label: m.name,
      unit: m.unit,
      nosotros: ajustar(m.percentilNuestro),
      rival: ajustar(m.percentilRival),
      nuestroValorReal: m.nuestroValor,
      rivalValorReal: m.rivalValor,
      promedioLiga: m.promedioLiga,
      invert: m.invert,
    };
  }).filter((r): r is RadarPunto => r !== null);

  // Scatter plots reales contra toda la liga (requiere statsbomb_league_team_values calculado).
  const scatterParamsBase = {
    staffTeamId: staff?.team_id ?? null,
    competitionId: rivalCompetitionId,
    seasonId: rivalSeasonId,
    rivalStatsbombId: rivalEquipo.id,
    ourTeamStatsbombId: env.ourTeamId,
  };
  const invertDe = (id: string) => metricas.find((m) => m.id === id)?.invert ?? false;
  const scatterPlotsRaw = await Promise.all([
    construirScatter(supabase, {
      ...scatterParamsBase,
      grupo: 0,
      titulo: "Intensidad de presión: PPDA vs. presión en campo rival",
      xId: "ppda",
      xLabel: "PPDA (menor = más intenso)",
      yId: "fhalfPressuresRatio",
      yLabel: "Presión en campo rival (%)",
      xInvertido: invertDe("ppda"),
      yInvertido: invertDe("fhalfPressuresRatio"),
      interpretar: (puntos) => {
        const r = puntos.find((p) => p.esRival);
        const n = puntos.find((p) => p.esNosotros);
        if (!r || !n) return "Datos insuficientes para comparar contra la liga.";
        return `${rivalEquipo.name} presiona ${r.y > n.y ? "más" : "menos"} en campo rival que nosotros (${r.y.toFixed(1)}% vs. ${n.y.toFixed(1)}%), con un PPDA ${r.x < n.x ? "más intenso" : "menos intenso"} (${r.x.toFixed(1)} vs. ${n.x.toFixed(1)}).`;
      },
    }),
    construirScatter(supabase, {
      ...scatterParamsBase,
      grupo: 1,
      titulo: "Balance ofensivo-defensivo: xG generado vs. xG concedido",
      xId: "npxgPerMatch",
      xLabel: "xG generado por partido",
      yId: "npxgConcededPerMatch",
      yLabel: "xG concedido por partido",
      xInvertido: invertDe("npxgPerMatch"),
      yInvertido: invertDe("npxgConcededPerMatch"),
      interpretar: (puntos) => {
        const r = puntos.find((p) => p.esRival);
        const n = puntos.find((p) => p.esNosotros);
        if (!r || !n) return "Datos insuficientes para comparar contra la liga.";
        const cuadrante = r.x >= n.x ? (r.y <= n.y ? "más ofensivo y más sólido" : "más ofensivo pero más vulnerable") : r.y <= n.y ? "menos ofensivo pero más sólido" : "menos ofensivo y más vulnerable";
        return `${rivalEquipo.name} es un equipo ${cuadrante} que nosotros en esta muestra (xG ${r.x.toFixed(2)} vs. ${n.x.toFixed(2)}; xG concedido ${r.y.toFixed(2)} vs. ${n.y.toFixed(2)}).`;
      },
    }),
    construirScatter(supabase, {
      ...scatterParamsBase,
      grupo: 2,
      titulo: "Generación de peligro: posesión vs. remates por partido",
      xId: "possessionPercentage",
      xLabel: "Posesión (%)",
      yId: "shotsPerMatch",
      yLabel: "Remates por partido",
      xInvertido: invertDe("possessionPercentage"),
      yInvertido: invertDe("shotsPerMatch"),
      interpretar: (puntos) => {
        const r = puntos.find((p) => p.esRival);
        const n = puntos.find((p) => p.esNosotros);
        if (!r || !n) return "Datos insuficientes para comparar contra la liga.";
        return `${rivalEquipo.name} tiene ${r.x > n.x ? "más" : "menos"} posesión que nosotros (${r.x.toFixed(1)}% vs. ${n.x.toFixed(1)}%) y genera ${r.y > n.y ? "más" : "menos"} remates por partido (${r.y.toFixed(1)} vs. ${n.y.toFixed(1)}).`;
      },
    }),
    construirScatter(supabase, {
      ...scatterParamsBase,
      grupo: 3,
      titulo: "Solidez defensiva: remates concedidos vs. PPDA",
      xId: "shotsConcededPerMatch",
      xLabel: "Remates concedidos por partido (menor = mejor)",
      yId: "ppda",
      yLabel: "PPDA (menor = más intenso)",
      xInvertido: invertDe("shotsConcededPerMatch"),
      yInvertido: invertDe("ppda"),
      interpretar: (puntos) => {
        const r = puntos.find((p) => p.esRival);
        const n = puntos.find((p) => p.esNosotros);
        if (!r || !n) return "Datos insuficientes para comparar contra la liga.";
        return `${rivalEquipo.name} concede ${r.x > n.x ? "más" : "menos"} remates por partido que nosotros (${r.x.toFixed(1)} vs. ${n.x.toFixed(1)}) con un PPDA ${r.y < n.y ? "más intenso" : "menos intenso"} (${r.y.toFixed(1)} vs. ${n.y.toFixed(1)}).`;
      },
    }),
    construirScatter(supabase, {
      ...scatterParamsBase,
      grupo: 0,
      titulo: "Progresión con valor: progresiones profundas vs. OBV total",
      xId: "deepProgressionsPerMatch",
      xLabel: "Progresiones profundas por partido",
      yId: "obvPerMatch",
      yLabel: "OBV total por partido",
      xInvertido: invertDe("deepProgressionsPerMatch"),
      yInvertido: invertDe("obvPerMatch"),
      interpretar: (puntos) => {
        const r = puntos.find((p) => p.esRival);
        const n = puntos.find((p) => p.esNosotros);
        if (!r || !n) return "Datos insuficientes para comparar contra la liga.";
        return `${rivalEquipo.name} progresa ${r.x > n.x ? "más" : "menos"} veces hacia el área rival que nosotros (${r.x.toFixed(1)} vs. ${n.x.toFixed(1)}) y genera ${r.y > n.y ? "más" : "menos"} valor total por partido (OBV ${r.y.toFixed(2)} vs. ${n.y.toFixed(2)}).`;
      },
    }),
    construirScatter(supabase, {
      ...scatterParamsBase,
      grupo: 1,
      titulo: "Juego por afuera: efectividad de regate vs. efectividad de centros",
      xId: "dribbleRatio",
      xLabel: "Efectividad de regate (%)",
      yId: "crossBoxRatio",
      yLabel: "Efectividad de centros al área (%)",
      xInvertido: invertDe("dribbleRatio"),
      yInvertido: invertDe("crossBoxRatio"),
      interpretar: (puntos) => {
        const r = puntos.find((p) => p.esRival);
        const n = puntos.find((p) => p.esNosotros);
        if (!r || !n) return "Datos insuficientes para comparar contra la liga.";
        return `${rivalEquipo.name} tiene ${r.x > n.x ? "mayor" : "menor"} efectividad de regate que nosotros (${r.x.toFixed(1)}% vs. ${n.x.toFixed(1)}%) y ${r.y > n.y ? "mayor" : "menor"} efectividad de centros al área (${r.y.toFixed(1)}% vs. ${n.y.toFixed(1)}%).`;
      },
    }),
    construirScatter(supabase, {
      ...scatterParamsBase,
      grupo: 2,
      titulo: "Dominio aéreo y balón parado: rating aéreo vs. xG de córner",
      xId: "aerialTeamRating",
      xLabel: "Rating aéreo del equipo",
      yId: "cornerXgPerMatch",
      yLabel: "xG de córner por partido",
      xInvertido: invertDe("aerialTeamRating"),
      yInvertido: invertDe("cornerXgPerMatch"),
      interpretar: (puntos) => {
        const r = puntos.find((p) => p.esRival);
        const n = puntos.find((p) => p.esNosotros);
        if (!r || !n) return "Datos insuficientes para comparar contra la liga.";
        return `${rivalEquipo.name} tiene un rating aéreo ${r.x > n.x ? "superior" : "inferior"} al nuestro (${r.x.toFixed(2)} vs. ${n.x.toFixed(2)}) y genera ${r.y > n.y ? "más" : "menos"} xG de córner por partido (${r.y.toFixed(2)} vs. ${n.y.toFixed(2)}).`;
      },
    }),
    construirScatter(supabase, {
      ...scatterParamsBase,
      grupo: 3,
      titulo: "Transiciones: remates de contraataque generados vs. concedidos",
      xId: "counterAttackingShotsPerMatch",
      xLabel: "Remates de contraataque generados por partido",
      yId: "counterAttackingShotsConcededPerMatch",
      yLabel: "Remates de contraataque concedidos por partido (menor = mejor)",
      xInvertido: invertDe("counterAttackingShotsPerMatch"),
      yInvertido: invertDe("counterAttackingShotsConcededPerMatch"),
      interpretar: (puntos) => {
        const r = puntos.find((p) => p.esRival);
        const n = puntos.find((p) => p.esNosotros);
        if (!r || !n) return "Datos insuficientes para comparar contra la liga.";
        return `${rivalEquipo.name} genera ${r.x > n.x ? "más" : "menos"} remates de contraataque que nosotros (${r.x.toFixed(1)} vs. ${n.x.toFixed(1)}) y concede ${r.y > n.y ? "más" : "menos"} (${r.y.toFixed(1)} vs. ${n.y.toFixed(1)}).`;
      },
    }),
    construirScatter(supabase, {
      ...scatterParamsBase,
      grupo: 4,
      titulo: "Remates concedidos vs. remates a favor",
      xId: "shotsConcededPerMatch",
      xLabel: "Remates concedidos por partido (menor = mejor)",
      yId: "shotsPerMatch",
      yLabel: "Remates a favor por partido",
      xInvertido: invertDe("shotsConcededPerMatch"),
      yInvertido: invertDe("shotsPerMatch"),
      interpretar: (puntos) => {
        const r = puntos.find((p) => p.esRival);
        const n = puntos.find((p) => p.esNosotros);
        if (!r || !n) return "Datos insuficientes para comparar contra la liga.";
        return `${rivalEquipo.name} concede ${r.x > n.x ? "más" : "menos"} remates por partido que nosotros (${r.x.toFixed(1)} vs. ${n.x.toFixed(1)}) y genera ${r.y > n.y ? "más" : "menos"} (${r.y.toFixed(1)} vs. ${n.y.toFixed(1)}).`;
      },
    }),
    construirScatter(supabase, {
      ...scatterParamsBase,
      grupo: 4,
      titulo: "Posesión concedida vs. remates en contra",
      xId: "possessionPercentage",
      xLabel: "Posesión concedida (%, menor = mejor)",
      yId: "shotsConcededPerMatch",
      yLabel: "Remates en contra por partido (menor = mejor)",
      transformX: (v) => 100 - v,
      xInvertido: !invertDe("possessionPercentage"),
      yInvertido: invertDe("shotsConcededPerMatch"),
      interpretar: (puntos) => {
        const r = puntos.find((p) => p.esRival);
        const n = puntos.find((p) => p.esNosotros);
        if (!r || !n) return "Datos insuficientes para comparar contra la liga.";
        return `${rivalEquipo.name} concede ${r.x > n.x ? "más" : "menos"} posesión que nosotros (${r.x.toFixed(1)}% vs. ${n.x.toFixed(1)}%) y recibe ${r.y > n.y ? "más" : "menos"} remates por partido (${r.y.toFixed(1)} vs. ${n.y.toFixed(1)}).`;
      },
    }),
  ]);
  const scatterPlots = scatterPlotsRaw.filter((s): s is ScatterPlot => s !== null);

  const advertencias: string[] = [];
  if (muestraRivalMatches.length < SAMPLE_SIZE) {
    advertencias.push(
      `Solo se encontraron ${muestraRivalMatches.length} partido(s) disponibles de ${rivalEquipo.name} (se buscaban ${SAMPLE_SIZE}).`,
    );
  }
  if (baselineRival.size === 0) {
    advertencias.push(
      "Todavía no se calculó el baseline de liga (promedio/percentil) para la competencia del rival: correr scripts/compute-statsbomb-league-baseline.mjs.",
    );
  } else if (baselineRivalCargado.computedAt) {
    const diasDesdeCalculo = Math.floor((Date.now() - new Date(baselineRivalCargado.computedAt).getTime()) / 86_400_000);
    if (diasDesdeCalculo > 10) {
      advertencias.push(
        `El promedio y percentil de liga se calculó hace ${diasDesdeCalculo} días — la muestra de cada equipo de la competencia pudo haber cambiado desde entonces. Conviene recalcularlo (scripts/compute-statsbomb-league-baseline.mjs) antes de confiar en los percentiles del radar y la fase de indicadores.`,
      );
    }
  }
  if (otraCompeticion) {
    advertencias.push(
      `${rivalEquipo.name} no juega en la misma competencia que ${env.ourTeamName} en esta cuenta de StatsBomb — la muestra usa ${muestraRivalMatches[0]?.competition.competition_name ?? "su competencia disponible"} en vez de la competencia real del cruce. No hay historial directo (próximo partido / cruces jugados) ni comparación contra toda la liga disponible para este caso.`,
    );
  }

  // El escudo del rival: primero se busca en su ficha de Rivales (cargado a mano ahí,
  // ej. para clubes no uruguayos que escudoClubUruguayo no puede resolver); si no hay
  // ficha o no tiene escudo cargado, cae al catálogo de clubes uruguayos.
  const { data: rivalRow } = staff
    ? await supabase.from("rivales").select("escudo_url").eq("team_id", staff.team_id).ilike("nombre", rivalEquipo.name).maybeSingle()
    : { data: null };
  const escudoRival = rivalRow?.escudo_url ?? escudoClubUruguayo(rivalEquipo.name);

  const base: OpponentReportData = {
    generadoEn: new Date().toISOString(),
    rival: {
      nombre: rivalEquipo.name,
      statsbombTeamId: rivalEquipo.id,
      escudoUrl: escudoRival,
    },
    nuestroEquipo: {
      nombre: env.ourTeamName,
      statsbombTeamId: env.ourTeamId,
      escudoUrl: escudoClubUruguayo(env.ourTeamName),
    },
    proximoPartido: proximo
      ? { fecha: proximo.match_date, condicion: ladoDeEquipo(proximo, env.ourTeamId) ?? "local" }
      : null,
    contexto: {
      competicion: muestraRivalMatches[0]?.competition.competition_name ?? "s/d",
      temporada: matchesRival[0]?.season.season_name ?? "s/d",
      partidosUtilizadosRival: muestraRivalMatches.length,
      partidosUtilizadosNuestro: muestraNuestraMatches.length,
      minutosAnalizadosAprox: muestraRivalMatches.length * 90,
      calidadDatos: muestraRivalMatches.length >= SAMPLE_SIZE ? "alta" : muestraRivalMatches.length >= 3 ? "media" : "baja",
      advertencias,
    },
    muestraRival: muestraRivalPartidos,
    muestraNuestra: muestraNuestraPartidos,
    metricas,
    jugadoresClaveRival,
    historialReciente: cruceJugados.map((m) => aMuestraPartido(m, env.ourTeamId)),
    shotMapRival,
    shotMapInterpretacion,
    passNetworkRival,
    passNetworkRivalTop11,
    passNetworkInterpretacion,
    radar,
    scatterPlots,
    plantillaPasesRival,
    plantelCompletoRival,
    estructuraRival,
    estructuraNuestra,
    estructurasRecientesRival,
    alineacionesProbablesRival,
    alineacionesProbablesNuestro,
    estructuraInterpretacion,
    patronSustitucionesRival,
    sustitucionesHabitualesRival,
    golesPorFranjaRival,
    campogramaTransicionesRival,
    jugadoresTransicionRival,
    ejecutoresAbpRival,
    receptoresAbpRival,
    topRematadoresRival,
    onceProbableRival,
    sistemasUtilizadosRival,
    tendenciasPartidoRival,
    iniciosArqueroRival,
    perdidasEnInicioRival,
    pasesClaveTemporadaRival,
    alineacionesPorPartidoRival,
    mapaPresionRival,
    recuperacionesCampoRivalRival,
    disciplinaContextualizadaRival,
    faltasSinTarjetaRival,
  };

  return base;
}

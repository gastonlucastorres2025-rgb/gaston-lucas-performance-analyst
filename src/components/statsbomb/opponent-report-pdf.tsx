import { Fragment } from "react";
import { Circle, Document, Image, Line, Link, Page, Polygon, Rect, StyleSheet, Svg, Text, View } from "@react-pdf/renderer";
import { COLORS, registerPdfFonts } from "@/lib/pdf-theme";
import { formacionATexto, type IniciosArquero } from "@/lib/statsbomb/events-analytics";
import {
  notasParaFase,
  type NotaTacticaDef,
  type NotasTacticas,
  type NotasTacticasImagenes,
  type NotasTacticasLinks,
} from "@/lib/statsbomb/notas-tacticas";
import type {
  AlineacionesPartido,
  AlineacionProbable,
  EstructuraPartido,
  FaseFormacionPartido,
  JugadorAlineado,
  MetricaComparada,
  MuestraPartido,
  OpponentReportData,
  ScatterPlot,
  TendenciaPartidoAPartido,
} from "@/lib/statsbomb/report-data";

// Paleta de portadas/divisorias restringida a blanco, azul y rojo (identidad del club) — sin verde/ámbar/gris.
const FASES: { id: string; titulo: string; subtitulo: string; color: string }[] = [
  { id: "identidad", titulo: "Identidad general", subtitulo: "Cómo es el equipo en números generales", color: COLORS.blueDark },
  { id: "ofensiva", titulo: "Fase ofensiva", subtitulo: "Cómo ataca y genera peligro", color: COLORS.red },
  { id: "defensiva", titulo: "Fase defensiva", subtitulo: "Cómo defiende y qué concede", color: COLORS.blue },
  { id: "transiciones", titulo: "Transiciones", subtitulo: "Qué hace apenas gana o pierde la pelota", color: COLORS.red },
  { id: "balon_parado", titulo: "Balón parado", subtitulo: "Córners, tiros libres y juego aéreo", color: COLORS.blueDark },
  { id: "disciplina", titulo: "Disciplina", subtitulo: "Tarjetas y control de la agresividad", color: COLORS.red },
];

// Métricas de cada fase que se destacan como tarjeta KPI grande en vez de fila de barras — rompe la
// monotonía visual de listas de barras repetidas en fases consecutivas (pedido explícito del usuario).
const DESTACADAS_POR_FASE: Record<string, string[]> = {
  ofensiva: ["npxgPerMatch", "shotsPerMatch", "passingRatio"],
  defensiva: ["npxgConcededPerMatch", "shotsConcededPerMatch", "ppda"],
};

// "Agresividad defensiva", "Completions profundas concedidas" y "Presiones por partido" no aportan para la toma
// de decisiones (pedido del usuario) — se ocultan solo de esta página; siguen calculándose para vulnerabilidades.
// "Remates sin marca concedidos" (antes en la fase huérfana "vulnerabilidades", nunca mostrada) pasa a mostrarse
// acá en su lugar — es una métrica defensiva más específica y accionable que "presiones por partido".
// "Completions/progresiones profundas" y "OBV de pase/acciones defensivas" salen de ofensiva y defensiva a pedido
// explícito del usuario (no aportan para la toma de decisiones en esa página puntual).
// Cada scatter "vs. liga" pasa a mostrarse dentro de la fase a la que corresponde temáticamente, en vez de todos
// juntos en un bloque aparte al final — pedido explícito del usuario, para que el informe tenga más orden.
const FASE_POR_SCATTER: Record<string, string> = {
  "Intensidad de presión: PPDA vs. presión en campo rival": "defensiva",
  "Progresión con valor: progresiones profundas vs. OBV total": "ofensiva",
  "Balance ofensivo-defensivo: xG generado vs. xG concedido": "identidad",
  "Juego por afuera: efectividad de regate vs. efectividad de centros": "ofensiva",
  "Generación de peligro: posesión vs. remates por partido": "ofensiva",
  "Dominio aéreo y balón parado: rating aéreo vs. xG de córner": "balon_parado",
  "Solidez defensiva: remates concedidos vs. PPDA": "defensiva",
  "Transiciones: remates de contraataque generados vs. concedidos": "transiciones",
  "Remates concedidos vs. remates a favor": "identidad",
  "Posesión concedida vs. remates en contra": "defensiva",
};

/** Agrupa un array en chunks de 2 (mismo tamaño que antes tenía cada página de scatter, solo cambia dónde aparecen). */
function enParesDe2<T>(items: T[]): T[][] {
  const pares: T[][] = [];
  for (let i = 0; i < items.length; i += 2) pares.push(items.slice(i, i + 2));
  return pares;
}

const OCULTAS_POR_FASE: Record<string, string[]> = {
  identidad: ["passesPerMatch", "obvPerMatch"],
  ofensiva: ["deepCompletionsPerMatch", "deepProgressionsPerMatch", "obvPassPerMatch"],
  transiciones: ["shotsInClearPerMatch"],
  defensiva: [
    "aggression",
    "deepCompletionsConcededPerMatch",
    "pressuresPerMatch",
    "deepProgressionsConcededPerMatch",
    "obvDefensiveActionPerMatch",
  ],
};

const styles = StyleSheet.create({
  page: { padding: 30, fontSize: 10, fontFamily: "Inter", color: COLORS.ink },

  caratula: { alignItems: "center", justifyContent: "center", paddingTop: 46, paddingBottom: 28 },
  escudosFila: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 36 },
  crest: { width: 118, height: 118 },
  vsTexto: { fontSize: 18, fontWeight: 700, color: COLORS.muted },
  clubName: { fontSize: 12, fontWeight: 600, color: COLORS.muted, textTransform: "uppercase", letterSpacing: 1.5, marginTop: 20 },
  tituloDoc: { fontSize: 18, fontWeight: 700, color: COLORS.blueDark, marginTop: 7 },
  rivalNombre: { fontSize: 34, fontWeight: 700, color: COLORS.blue, marginTop: 16, textAlign: "center" },
  metaLinea: { fontSize: 11, color: COLORS.muted, marginTop: 7 },
  metaBadge: {
    marginTop: 16,
    backgroundColor: COLORS.redTint,
    color: COLORS.red,
    fontSize: 12,
    fontWeight: 700,
    paddingVertical: 7,
    paddingHorizontal: 16,
    borderRadius: 14,
  },

  firma: { marginTop: 22, paddingTop: 14, borderTop: `1 solid ${COLORS.border}`, alignItems: "center" },
  firmaTitulo: { fontSize: 11, fontWeight: 700, color: COLORS.ink },
  firmaSub: { fontSize: 9, color: COLORS.muted, marginTop: 3 },

  seccionTitulo: { fontSize: 14, fontWeight: 700, color: COLORS.blueDark, marginBottom: 4 },
  seccionSub: { fontSize: 8.5, color: COLORS.muted, marginBottom: 10 },

  sectionCard: { borderRadius: 6, border: `1 solid ${COLORS.border}`, overflow: "hidden", marginBottom: 10 },
  sectionHeader: { paddingVertical: 6, paddingHorizontal: 10 },
  sectionHeaderTitle: { fontSize: 9.5, fontWeight: 700, color: "#fff" },
  sectionBody: { padding: 9 },
  bodyText: { fontSize: 8.5, lineHeight: 1.5 },

  // Centradas y grandes (máx. 2 por fila) para que se vean bien desde un celular — no miniaturas de 3 por fila.
  notaImagenesFila: { flexDirection: "row", flexWrap: "wrap", gap: 10, justifyContent: "center", marginTop: 5 },
  notaImagen: { width: "47%", maxHeight: 220, objectFit: "contain", borderRadius: 5, border: `1 solid ${COLORS.border}` },

  // Tarjeta clickeable de video: siempre el mismo diseño (escudo del rival | nombre de la nota), tocarla lleva al
  // link real cargado por el cuerpo técnico — pedido explícito del usuario.
  videoCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: COLORS.blueDark,
    borderRadius: 10,
    padding: 10,
    marginBottom: 8,
  },
  videoCardEscudo: { width: 30, height: 30, objectFit: "contain", backgroundColor: "#ffffff", borderRadius: 15, padding: 3 },
  videoCardDivider: { width: 1, height: 22, backgroundColor: "rgba(255,255,255,0.3)" },
  videoCardLabel: { fontSize: 9.5, fontWeight: 700, color: "#ffffff" },
  videoCardSub: { fontSize: 7, color: "rgba(255,255,255,0.7)", marginTop: 1 },

  contextoGrid: { flexDirection: "row", flexWrap: "wrap", gap: 12, marginBottom: 16 },
  contextoItem: { width: "30.5%", border: `1 solid ${COLORS.border}`, borderRadius: 8, padding: 14 },
  contextoLabel: { fontSize: 8, color: COLORS.muted, textTransform: "uppercase", letterSpacing: 0.6 },
  contextoValor: { fontSize: 15, fontWeight: 700, marginTop: 5 },

  dashRow: { flexDirection: "row", alignItems: "center", borderRadius: 7, marginBottom: 6, padding: 13, gap: 12 },
  dashRowPar: { backgroundColor: COLORS.grayTint },
  dashNombreCol: { flex: 1.3, alignItems: "center" },
  dashNombre: { fontSize: 9.4, fontWeight: 700, textAlign: "center" },
  dashUnidad: { fontSize: 7.2, color: COLORS.muted, marginTop: 2, textAlign: "center" },
  dashBarsCol: { flex: 2.6, gap: 6 },
  barRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  barLabel: { width: 52, fontSize: 7, color: COLORS.muted, fontWeight: 700 },
  barTrack: { flex: 1, height: 10, backgroundColor: COLORS.grayTint, borderRadius: 4, overflow: "hidden" },
  barFill: { height: 10, borderRadius: 4 },
  barValor: { width: 38, fontSize: 8.2, fontWeight: 700, textAlign: "right" },
  dashSideCol: { flex: 0.65, alignItems: "center", gap: 3 },
  pctlBadge: { fontSize: 7.4, fontWeight: 700, color: COLORS.blueDark, backgroundColor: COLORS.blueTint, paddingVertical: 2.5, paddingHorizontal: 6, borderRadius: 6 },
  tendText: { fontSize: 10, color: COLORS.muted },
  valorMejor: { color: COLORS.green },
  valorPeor: { color: COLORS.red },

  kpiCardsFila: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginBottom: 10 },
  kpiCard: { flexGrow: 1, minWidth: 140, borderRadius: 8, padding: 12, border: `1 solid ${COLORS.border}` },
  kpiLabel: { fontSize: 7.5, color: COLORS.muted, textTransform: "uppercase", letterSpacing: 0.4, marginBottom: 4 },
  kpiValoresFila: { flexDirection: "row", alignItems: "baseline", gap: 6, flexWrap: "wrap" },
  kpiValor: { fontSize: 17, fontWeight: 700 },
  kpiValorLabel: { fontSize: 7, color: COLORS.muted },
  kpiPctl: { fontSize: 7.5, fontWeight: 700, marginTop: 4 },

  radarLegendFila: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 10, justifyContent: "center" },
  radarLegendItem: { flexDirection: "row", alignItems: "center", gap: 4 },
  radarLegendDot: { width: 7, height: 7, borderRadius: 3.5 },
  radarLegendTxt: { fontSize: 7.5 },

  alertaCard: { flexDirection: "row", gap: 8, border: `1 solid ${COLORS.border}`, borderRadius: 6, padding: 8, marginBottom: 6, alignItems: "flex-start" },
  alertaNumero: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: COLORS.blueDark,
    color: "#fff",
    fontSize: 8,
    fontWeight: 700,
    textAlign: "center",
    paddingTop: 4,
  },
  alertaTexto: { fontSize: 8.8, fontWeight: 600, lineHeight: 1.4 },
  alertaEvidencia: { fontSize: 7.3, color: COLORS.muted, marginTop: 2 },


  vulnCard: { border: `1 solid ${COLORS.border}`, borderRadius: 6, padding: 9, marginBottom: 7 },
  vulnHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 4 },
  vulnTitulo: { fontSize: 9.5, fontWeight: 700 },
  badge: { fontSize: 6.8, fontWeight: 700, paddingVertical: 2, paddingHorizontal: 6, borderRadius: 8, color: "#fff" },

  jugadorCard: { flexDirection: "row", gap: 10, border: `1 solid ${COLORS.border}`, borderRadius: 6, padding: 10, marginBottom: 8 },
  avatar: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center" },
  avatarTexto: { color: "#fff", fontSize: 13, fontWeight: 700 },
  jugadorNombre: { fontSize: 10, fontWeight: 700 },
  jugadorMeta: { fontSize: 7.5, color: COLORS.muted, marginTop: 1 },
  jugadorStatsFila: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 5 },
  statPill: { fontSize: 7, backgroundColor: COLORS.grayTint, paddingVertical: 2, paddingHorizontal: 6, borderRadius: 4 },
  statPillGrande: { fontSize: 10.5, fontWeight: 700, backgroundColor: COLORS.grayTint, paddingVertical: 6, paddingHorizontal: 11, borderRadius: 6 },
  asociacionesBox: { flexDirection: "row", gap: 8, marginTop: 6, backgroundColor: COLORS.grayTint, borderRadius: 5, padding: 6 },
  asociacionCol: { flex: 1 },
  asociacionTitulo: { fontSize: 6.3, fontWeight: 700, color: COLORS.muted, textTransform: "uppercase", marginBottom: 2 },
  asociacionTexto: { fontSize: 7, color: COLORS.blueDark, lineHeight: 1.4 },

  pasesTablaHeader: { flexDirection: "row", backgroundColor: COLORS.blueDark, paddingVertical: 6, paddingHorizontal: 8, borderRadius: 4, marginBottom: 2 },
  pasesTablaHeaderTxt: { fontSize: 6.5, fontWeight: 700, color: "#fff", textTransform: "uppercase" },
  pasesTablaFila: { flexDirection: "row", alignItems: "center", paddingVertical: 6, paddingHorizontal: 8, borderRadius: 3 },
  pasesTablaFilaPar: { backgroundColor: COLORS.grayTint },
  pasesTablaCelda: { fontSize: 7.8 },
  pasesTablaCeldaNum: { fontSize: 7.8, textAlign: "center" },

  divisorTitulo: { fontSize: 34, fontWeight: 700, color: "#fff", textAlign: "center" },
  divisorSubtitulo: { fontSize: 12, color: "#ffffffcc", textAlign: "center", marginTop: 10 },
  divisorNumero: { fontSize: 12, color: "#ffffff99", textAlign: "center", marginBottom: 14, textTransform: "uppercase", letterSpacing: 2 },

  partidoCard: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 8, padding: 6 },
  partidoEscudo: { width: 22, height: 22 },
  partidoTextoChico: { fontSize: 9.5, flex: 1 },
  resultadoChico: { fontSize: 9.5, fontWeight: 700, backgroundColor: COLORS.grayTint, paddingVertical: 3, paddingHorizontal: 8, borderRadius: 4 },

  footer: {
    position: "absolute",
    bottom: 20,
    left: 36,
    right: 36,
    fontSize: 7.5,
    color: "#999",
    textAlign: "center",
    borderTop: `1 solid ${COLORS.border}`,
    paddingTop: 7,
  },
});

function n(v: number | null, decimales = 2): string {
  if (v === null) return "—";
  return Number.isInteger(v) && decimales === 0 ? String(v) : v.toFixed(decimales);
}

/** Verde si ganó, ámbar si empató, rojo si perdió — según el resultado real del partido. */
function colorResultado(golesFavor: number | null, golesContra: number | null): { backgroundColor: string; color: string } | null {
  if (golesFavor === null || golesContra === null) return null;
  if (golesFavor > golesContra) return { backgroundColor: COLORS.greenTint, color: COLORS.green };
  if (golesFavor < golesContra) return { backgroundColor: COLORS.redTint, color: COLORS.red };
  return { backgroundColor: COLORS.amberTint, color: COLORS.amber };
}

function flechaTendencia(t: MetricaComparada["tendenciaRival"]): string {
  if (t === "subiendo") return "↗";
  if (t === "bajando") return "↘";
  if (t === "estable") return "→";
  return "";
}

function Footer({ nombre }: { nombre: string }) {
  return (
    <Text style={styles.footer} render={({ pageNumber, totalPages }) => `Cuerpo Técnico · ${nombre} — Página ${pageNumber} de ${totalPages}`} fixed />
  );
}

/** Página divisoria a pantalla completa: una sola idea por página, mucho aire, antes de cada bloque denso de datos. */
function DividerPage({ numero, titulo, subtitulo, color }: { numero: string; titulo: string; subtitulo: string; color: string }) {
  return (
    <Page size="A4" style={[styles.page, { backgroundColor: color, justifyContent: "center", alignItems: "center" }]}>
      <Text style={styles.divisorNumero}>{numero}</Text>
      <Text style={styles.divisorTitulo}>{titulo}</Text>
      <Text style={styles.divisorSubtitulo}>{subtitulo}</Text>
    </Page>
  );
}

function nombreCorto(nombre: string): string {
  return nombre.length > 12 ? `${nombre.slice(0, 11)}.` : nombre;
}

/** Fila visual: dos barras (equipo propio/rival) en vez de párrafo — prioriza gráfica sobre texto. */
function DashboardRow({
  m,
  nuestroNombre,
  rivalNombre,
  par,
}: {
  m: MetricaComparada;
  nuestroNombre: string;
  rivalNombre: string;
  par: boolean;
}) {
  let rivalMejor: boolean | null = null;
  if (m.nuestroValor !== null && m.rivalValor !== null && m.nuestroValor !== m.rivalValor) {
    rivalMejor = m.invert ? m.rivalValor < m.nuestroValor : m.rivalValor > m.nuestroValor;
  }
  const maxVal = Math.max(m.nuestroValor ?? 0, m.rivalValor ?? 0, m.promedioLiga ?? 0, 0.001) * 1.1;
  const pct = (v: number | null) => (v === null ? 0 : Math.max(3, (v / maxVal) * 100));

  return (
    <View style={[styles.dashRow, par ? styles.dashRowPar : {}]} wrap={false}>
      <View style={styles.dashNombreCol}>
        <Text style={styles.dashNombre}>{m.name}</Text>
        <Text style={styles.dashUnidad}>{m.unit}</Text>
      </View>
      <View style={styles.dashBarsCol}>
        <View style={styles.barRow}>
          <Text style={styles.barLabel}>{nombreCorto(nuestroNombre)}</Text>
          <View style={styles.barTrack}>
            <View style={[styles.barFill, { width: `${pct(m.nuestroValor)}%`, backgroundColor: COLORS.blue }]} />
          </View>
          <Text style={styles.barValor}>{n(m.nuestroValor)}</Text>
        </View>
        <View style={styles.barRow}>
          <Text style={styles.barLabel}>{nombreCorto(rivalNombre)}</Text>
          <View style={styles.barTrack}>
            <View
              style={[
                styles.barFill,
                {
                  width: `${pct(m.rivalValor)}%`,
                  backgroundColor: rivalMejor === true ? COLORS.green : rivalMejor === false ? COLORS.red : COLORS.gray,
                },
              ]}
            />
          </View>
          <Text style={[styles.barValor, rivalMejor === true ? styles.valorMejor : rivalMejor === false ? styles.valorPeor : {}]}>
            {n(m.rivalValor)}
          </Text>
        </View>
      </View>
      <View style={styles.dashSideCol}>
        <Text style={styles.pctlBadge}>{m.percentilRival !== null ? `p${m.percentilRival}` : "s/d"}</Text>
        <Text style={styles.tendText}>{flechaTendencia(m.tendenciaRival)}</Text>
        <Text style={{ fontSize: 6, color: COLORS.muted }}>liga: {n(m.promedioLiga)}</Text>
      </View>
    </View>
  );
}

/** Tarjeta grande para las 2-3 métricas más importantes de una fase — rompe la monotonía de filas de barras repetidas. */
function KpiCard({ m, rivalNombre }: { m: MetricaComparada; rivalNombre: string }) {
  let rivalMejor: boolean | null = null;
  if (m.nuestroValor !== null && m.rivalValor !== null && m.nuestroValor !== m.rivalValor) {
    rivalMejor = m.invert ? m.rivalValor < m.nuestroValor : m.rivalValor > m.nuestroValor;
  }
  return (
    <View style={styles.kpiCard} wrap={false}>
      <Text style={styles.kpiLabel}>{m.name}</Text>
      <View style={styles.kpiValoresFila}>
        <Text style={[styles.kpiValor, { color: COLORS.red }]}>{n(m.rivalValor)}</Text>
        <Text style={styles.kpiValorLabel}>{rivalNombre}</Text>
        <Text style={[styles.kpiValor, { color: COLORS.blueDark, fontSize: 12 }]}> / {n(m.nuestroValor)}</Text>
        <Text style={styles.kpiValorLabel}>nosotros</Text>
      </View>
      <Text
        style={[
          styles.kpiPctl,
          { color: rivalMejor === true ? COLORS.green : rivalMejor === false ? COLORS.red : COLORS.muted },
        ]}
      >
        {m.percentilRival !== null ? `Percentil de liga: p${m.percentilRival} ${flechaTendencia(m.tendenciaRival)}` : "Sin baseline de liga"}
      </Text>
    </View>
  );
}

function FasePagina({
  titulo,
  color,
  metricas,
  subtitulo,
  nuestroNombre,
  rivalNombre,
  destacadasIds,
}: {
  titulo: string;
  color: string;
  metricas: MetricaComparada[];
  subtitulo: string;
  nuestroNombre: string;
  rivalNombre: string;
  /** Ids de las 2-3 métricas que se muestran como tarjetas KPI grandes en vez de fila de barras (variedad visual). */
  destacadasIds?: string[];
}) {
  if (metricas.length === 0) return null;
  const destacadas = destacadasIds ? metricas.filter((m) => destacadasIds.includes(m.id)) : [];
  const resto = destacadasIds ? metricas.filter((m) => !destacadasIds.includes(m.id)) : metricas;
  return (
    <View>
      <Text style={[styles.seccionTitulo, { color }]}>{titulo}</Text>
      <Text style={styles.seccionSub}>{subtitulo}</Text>
      {destacadas.length > 0 && (
        <View style={styles.kpiCardsFila}>
          {destacadas.map((m) => (
            <KpiCard key={m.id} m={m} rivalNombre={rivalNombre} />
          ))}
        </View>
      )}
      {resto.map((m, i) => (
        <DashboardRow key={m.id} m={m} nuestroNombre={nuestroNombre} rivalNombre={rivalNombre} par={i % 2 === 1} />
      ))}
    </View>
  );
}

function MuestraMiniLista({ titulo, color, partidos }: { titulo: string; color: string; partidos: MuestraPartido[] }) {
  if (partidos.length === 0) return null;
  return (
    <View style={styles.sectionCard} wrap={false}>
      <View style={[styles.sectionHeader, { backgroundColor: color }]}>
        <Text style={styles.sectionHeaderTitle}>{titulo}</Text>
      </View>
      <View style={styles.sectionBody}>
        {partidos.map((p) => (
          <View key={p.matchId} style={styles.partidoCard}>
            {p.escudoRivalUrl && (
              // eslint-disable-next-line jsx-a11y/alt-text -- react-pdf Image, no HTML img
              <Image src={p.escudoRivalUrl} style={styles.partidoEscudo} />
            )}
            <Text style={styles.partidoTextoChico}>
              {p.condicion === "visitante" ? `${p.rival} vs. este equipo` : `Este equipo vs. ${p.rival}`} — {p.fecha}
            </Text>
            {p.golesFavor !== null && p.golesContra !== null && (
              <Text style={[styles.resultadoChico, colorResultado(p.golesFavor, p.golesContra) ?? {}]}>
                {p.golesFavor}-{p.golesContra}
              </Text>
            )}
          </View>
        ))}
      </View>
    </View>
  );
}

// Pitch SVG: 120x80 StatsBomb -> viewBox escalado, ancho 460, alto ~307.
const PITCH_W = 460;
const PITCH_H = 307;
const SCALE = PITCH_W / 120;
const px = (x: number) => x * SCALE;
const py = (y: number) => y * SCALE;

function PitchBase() {
  return (
    <>
      <Rect x={0} y={0} width={PITCH_W} height={PITCH_H} fill="#eef3ee" stroke={COLORS.border} strokeWidth={1} />
      <Line x1={PITCH_W / 2} y1={0} x2={PITCH_W / 2} y2={PITCH_H} stroke={COLORS.border} strokeWidth={1} />
      <Circle cx={PITCH_W / 2} cy={PITCH_H / 2} r={px(9.15)} stroke={COLORS.border} strokeWidth={1} fill="none" />
      <Rect x={PITCH_W - px(18)} y={py(18)} width={px(18)} height={py(44)} stroke={COLORS.border} strokeWidth={1} fill="none" />
      <Rect x={0} y={py(18)} width={px(18)} height={py(44)} stroke={COLORS.border} strokeWidth={1} fill="none" />
    </>
  );
}

/** Campograma genérico: grilla de zonas con intensidad de color + etiqueta (cantidad/%), sobre la cancha base. */
function ZoneGridPitch({
  filas,
  columnas,
  intensidad,
  etiqueta,
  colorBase = COLORS.blue,
  direccionAtaque,
}: {
  filas: number;
  columnas: number;
  intensidad: (fila: number, columna: number) => number;
  etiqueta: (fila: number, columna: number) => string;
  colorBase?: string;
  /** Texto de la flecha de dirección de ataque que se muestra arriba de la cancha (ej. "Ataca hacia nuestro arco"). */
  direccionAtaque?: string;
}) {
  const cellW = PITCH_W / columnas;
  const cellH = PITCH_H / filas;
  return (
    <View style={{ alignItems: "center" }}>
      {direccionAtaque && (
        <View style={{ flexDirection: "row", alignItems: "center", gap: 4, marginBottom: 4 }}>
          <Text style={{ fontSize: 9, fontWeight: 700, color: COLORS.blueDark }}>{direccionAtaque}</Text>
          <Text style={{ fontSize: 11, fontWeight: 700, color: COLORS.blueDark }}>→</Text>
        </View>
      )}
      <View style={{ position: "relative", width: PITCH_W, height: PITCH_H }}>
      <Svg width={PITCH_W} height={PITCH_H} viewBox={`0 0 ${PITCH_W} ${PITCH_H}`}>
        <PitchBase />
        {Array.from({ length: filas }).map((_, f) =>
          Array.from({ length: columnas }).map((_, c) => {
            const t = Math.max(0, Math.min(1, intensidad(f, c)));
            return (
              <Rect
                key={`${f}-${c}`}
                x={c * cellW}
                y={f * cellH}
                width={cellW}
                height={cellH}
                fill={colorBase}
                fillOpacity={0.08 + t * 0.55}
                stroke={COLORS.border}
                strokeWidth={0.6}
              />
            );
          }),
        )}
      </Svg>
      {Array.from({ length: filas }).map((_, f) =>
        Array.from({ length: columnas }).map((_, c) => (
          <Text
            key={`lbl-${f}-${c}`}
            style={{
              position: "absolute",
              left: c * cellW,
              top: f * cellH + cellH / 2 - 6,
              width: cellW,
              textAlign: "center",
              fontSize: 8,
              fontWeight: 700,
              color: COLORS.ink,
            }}
          >
            {etiqueta(f, c)}
          </Text>
        )),
      )}
      </View>
    </View>
  );
}

/** Extra de la página de transiciones: campograma de origen real de contraataques + jugadores más involucrados. */
function TransicionesExtra({ data }: { data: OpponentReportData }) {
  const zonas = data.campogramaTransicionesRival;
  if (zonas.every((z) => z.conteo === 0)) return null;
  const maxConteo = Math.max(1, ...zonas.map((z) => z.conteo));
  return (
    <View style={{ marginTop: 18 }}>
      <Text style={{ fontSize: 12, fontWeight: 700, color: COLORS.blueDark, marginBottom: 3 }}>
        Campograma de contraataques — {data.rival.nombre}
      </Text>
      <Text style={[styles.bodyText, { color: COLORS.muted, marginBottom: 8 }]}>
        Zona real donde nace cada contraataque (StatsBomb play pattern &quot;From Counter&quot;). En cada celda: cantidad de
        contraataques que nacieron ahí y, entre paréntesis, qué porcentaje representan sobre el total de contraataques de la
        muestra. Más oscuro = más frecuente.
      </Text>
      <View style={{ alignItems: "center" }}>
        <ZoneGridPitch
          filas={3}
          columnas={3}
          colorBase={COLORS.red}
          direccionAtaque={`${data.rival.nombre} ataca hacia nuestro arco`}
          intensidad={(f, c) => (zonas.find((z) => z.fila === f && z.columna === c)?.conteo ?? 0) / maxConteo}
          etiqueta={(f, c) => {
            const z = zonas.find((zz) => zz.fila === f && zz.columna === c);
            return z && z.conteo > 0 ? `${z.conteo} (${z.porcentaje}%)` : "—";
          }}
        />
      </View>
      {data.jugadoresTransicionRival.length > 0 && (
        <View style={{ marginTop: 14 }}>
          <Text style={{ fontSize: 10.5, fontWeight: 700, color: COLORS.blueDark, marginBottom: 6 }}>Jugadores clave en transición</Text>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
            {data.jugadoresTransicionRival.map((j) => (
              <Text key={j.playerId} style={styles.statPillGrande}>
                {j.nombre} ({j.participaciones})
              </Text>
            ))}
          </View>
        </View>
      )}
      {data.recuperacionesCampoRivalRival.totalCampoRival > 0 && (
        // wrap={false}: si no, el título quedaba solo al final de una página y el campograma se iba a la
        // siguiente (bug real reportado) — ahora el bloque entero salta junto a la próxima página si no entra.
        <View style={{ marginTop: 18 }} wrap={false}>
          <Text style={{ fontSize: 12, fontWeight: 700, color: COLORS.blueDark, marginBottom: 3 }}>
            Zona donde más recupera en campo rival — {data.rival.nombre}
          </Text>
          <Text style={[styles.bodyText, { color: COLORS.muted, marginBottom: 8 }]}>
            Solo recuperaciones reales (Ball Recovery) en la mitad de cancha del rival — {data.recuperacionesCampoRivalRival.totalCampoRival}{" "}
            en la muestra. Las de campo propio no se cuentan acá.
          </Text>
          <View style={{ alignItems: "center" }}>
            <ZoneGridPitch
              filas={3}
              columnas={3}
              colorBase={COLORS.green}
              direccionAtaque={`${data.rival.nombre} ataca hacia nuestro arco`}
              intensidad={(f, c) =>
                (data.recuperacionesCampoRivalRival.campograma.find((z) => z.fila === f && z.columna === c)?.conteo ?? 0) /
                Math.max(1, ...data.recuperacionesCampoRivalRival.campograma.map((z) => z.conteo))
              }
              etiqueta={(f, c) => {
                const z = data.recuperacionesCampoRivalRival.campograma.find((zz) => zz.fila === f && zz.columna === c);
                return z && z.conteo > 0 ? `${z.conteo} (${z.porcentaje}%)` : "—";
              }}
            />
          </View>
        </View>
      )}
    </View>
  );
}

/** Extra de la página de balón parado: quién ejecuta (y de qué lado) y quién recibe córners/libres reales. */
/** Fila de barra horizontal (nombre + barra proporcional al máximo real + valor) — más visual que texto plano. */
function FilaBarraAbp({ nombre, valor, max, sub, color }: { nombre: string; valor: number; max: number; sub?: string; color: string }) {
  return (
    <View style={{ marginBottom: 7 }}>
      <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 2 }}>
        <Text style={{ fontSize: 8.5, fontWeight: 700, color: COLORS.ink }}>{nombre}</Text>
        <Text style={{ fontSize: 8.5, fontWeight: 700, color }}>{valor}</Text>
      </View>
      <View style={{ height: 7, backgroundColor: COLORS.grayTint, borderRadius: 3.5, overflow: "hidden" }}>
        <View style={{ height: 7, width: `${Math.max(4, (valor / max) * 100)}%`, backgroundColor: color, borderRadius: 3.5 }} />
      </View>
      {sub && <Text style={{ fontSize: 6.5, color: COLORS.muted, marginTop: 1.5 }}>{sub}</Text>}
    </View>
  );
}

function BalonParadoExtra({ data }: { data: OpponentReportData }) {
  if (data.ejecutoresAbpRival.length === 0 && data.receptoresAbpRival.length === 0) return null;
  const maxEjecuciones = Math.max(1, ...data.ejecutoresAbpRival.map((e) => e.ejecuciones));
  const maxRecepciones = Math.max(1, ...data.receptoresAbpRival.map((r) => r.recepciones));
  return (
    // wrap={false}: el título quedaba solo al final de una página y las listas se iban a la siguiente (bug
    // real reportado) — ahora el bloque entero salta junto a la próxima página si no entra.
    <View style={{ marginTop: 18 }} wrap={false}>
      <Text style={{ fontSize: 12, fontWeight: 700, color: COLORS.blueDark, marginBottom: 3 }}>
        Ejecución y recepción de córners — {data.rival.nombre}
      </Text>
      <Text style={[styles.bodyText, { color: COLORS.muted, marginBottom: 10 }]}>
        Solo tiros de esquina de los {data.contexto.partidosUtilizadosRival} partidos de la muestra analizada. Efectividad =
        % de sus córners que terminaron en un remate real del equipo en la misma jugada.
      </Text>
      <View style={{ flexDirection: "row", gap: 18 }}>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 9.5, fontWeight: 700, color: COLORS.blueDark, textTransform: "uppercase", marginBottom: 8 }}>
            Ejecutan más
          </Text>
          {data.ejecutoresAbpRival.map((e) => (
            <FilaBarraAbp
              key={e.playerId}
              nombre={e.nombre}
              valor={e.ejecuciones}
              max={maxEjecuciones}
              sub={`${e.ladoIzquierdoPct}% desde la izquierda · ${e.efectividadPct}% efectividad`}
              color={COLORS.blue}
            />
          ))}
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 9.5, fontWeight: 700, color: COLORS.blueDark, textTransform: "uppercase", marginBottom: 8 }}>
            Reciben más
          </Text>
          {data.receptoresAbpRival.map((r) => (
            <FilaBarraAbp key={r.playerId} nombre={r.nombre} valor={r.recepciones} max={maxRecepciones} sub="recepciones" color={COLORS.green} />
          ))}
        </View>
      </View>
    </View>
  );
}

/**
 * Notas tácticas manuales del cuerpo técnico para una fase — a diferencia del resto del informe,
 * NO sale de datos de StatsBomb. Se etiqueta siempre como apreciación manual (color ámbar, aclaración
 * explícita) para no confundirla con los hallazgos basados en datos reales del resto de la página.
 */
function NotasTacticasBloque({
  fase,
  notas,
  imagenes,
  links,
  escudoRivalUrl,
}: {
  fase: NotaTacticaDef["fase"];
  notas: NotasTacticas | undefined;
  imagenes: NotasTacticasImagenes | undefined;
  links: NotasTacticasLinks | undefined;
  escudoRivalUrl: string | null;
}) {
  const items = notasParaFase(fase, notas ?? {}, imagenes, links);
  if (items.length === 0) return null;
  const itemsConImagenes = items.filter((it) => it.imagenes.length > 0);
  const itemsConLinks = items.filter((it) => it.links.length > 0);
  return (
    <View style={{ marginTop: 16 }}>
      <View style={[styles.sectionCard, { borderColor: COLORS.amber, marginBottom: 0 }]} wrap={false}>
        <View style={[styles.sectionHeader, { backgroundColor: COLORS.amber }]}>
          <Text style={styles.sectionHeaderTitle}>Notas tácticas del cuerpo técnico</Text>
        </View>
        <View style={styles.sectionBody}>
          <Text style={[styles.bodyText, { color: COLORS.muted, marginBottom: 6 }]}>
            Apreciación manual del cuerpo técnico — no deriva de datos de StatsBomb.
          </Text>
          {items.map((it, i) => (
            <View key={it.id} style={{ marginBottom: i === items.length - 1 ? 0 : 8 }}>
              <Text style={{ fontSize: 8.5, fontWeight: 700, color: COLORS.amber, marginBottom: 2 }}>{it.label}</Text>
              <Text style={styles.bodyText}>{it.texto}</Text>
            </View>
          ))}
        </View>
      </View>
      {/* Las imágenes van FUERA del cuadro naranja de texto, centradas y en tamaño grande — pedido explícito del
          usuario para que se vean bien desde un celular, no como miniaturas metidas en el cuadro de notas. */}
      {itemsConImagenes.length > 0 && (
        <View style={{ marginTop: 10 }}>
          {itemsConImagenes.map((it) => (
            <View key={it.id} style={{ marginBottom: 12, alignItems: "center" }} wrap={false}>
              <Text style={{ fontSize: 7.5, fontWeight: 700, color: COLORS.muted, marginBottom: 5, textAlign: "center" }}>{it.label}</Text>
              <View style={styles.notaImagenesFila}>
                {it.imagenes.map((url, j) => (
                  // eslint-disable-next-line jsx-a11y/alt-text -- react-pdf Image, no HTML img
                  <Image key={j} src={url} style={styles.notaImagen} />
                ))}
              </View>
            </View>
          ))}
        </View>
      )}
      {/* Videos: mismo diseño siempre (escudo del rival | nombre de la nota), tocar la tarjeta lleva directo al
          link real cargado por el cuerpo técnico — pedido explícito del usuario. */}
      {itemsConLinks.length > 0 && (
        <View style={{ marginTop: 10 }}>
          {itemsConLinks.map((it) =>
            it.links.map((url, j) => (
              <Link key={`${it.id}-${j}`} src={url} style={{ textDecoration: "none" }}>
                <View style={styles.videoCard} wrap={false}>
                  {escudoRivalUrl && (
                    // eslint-disable-next-line jsx-a11y/alt-text -- react-pdf Image, no HTML img
                    <Image src={escudoRivalUrl} style={styles.videoCardEscudo} />
                  )}
                  <View style={styles.videoCardDivider} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.videoCardLabel}>{it.label}</Text>
                    <Text style={styles.videoCardSub}>Toca para ver el video</Text>
                  </View>
                  <Svg width={24} height={24} viewBox="0 0 24 24">
                    <Circle cx={12} cy={12} r={12} fill="rgba(255,255,255,0.18)" />
                    <Polygon points="9,7 9,17 18,12" fill="#ffffff" />
                  </Svg>
                </View>
              </Link>
            )),
          )}
        </View>
      )}
    </View>
  );
}

type DonutSegmento = { label: string; valor: number; color: string };

function DonutChart({ segmentos }: { segmentos: DonutSegmento[] }) {
  const total = segmentos.reduce((acc, s) => acc + s.valor, 0);
  if (total === 0) return null;
  const R = 46;
  const STROKE = 16;
  const CX = 56;
  const CY = 56;
  const CIRC = 2 * Math.PI * R;
  const arcos = segmentos.reduce<{ arcos: (DonutSegmento & { largo: number; anguloInicio: number })[]; acumulado: number }>(
    (acc, s) => ({
      arcos: [...acc.arcos, { ...s, largo: (s.valor / total) * CIRC, anguloInicio: (acc.acumulado / total) * 360 }],
      acumulado: acc.acumulado + s.valor,
    }),
    { arcos: [], acumulado: 0 },
  ).arcos;

  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 16 }}>
      <Svg width={112} height={112} viewBox="0 0 112 112">
        {arcos.map((s, i) => (
          <Circle
            key={i}
            cx={CX}
            cy={CY}
            r={R}
            fill="none"
            stroke={s.color}
            strokeWidth={STROKE}
            strokeDasharray={`${s.largo} ${CIRC - s.largo}`}
            transform={`rotate(${s.anguloInicio - 90} ${CX} ${CY})`}
          />
        ))}
      </Svg>
      <View style={{ gap: 4 }}>
        {segmentos.map((s, i) => (
          <View key={i} style={{ flexDirection: "row", alignItems: "center", gap: 5 }}>
            <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: s.color }} />
            <Text style={{ fontSize: 8 }}>
              {s.label}: {s.valor} ({Math.round((s.valor / total) * 100)}%)
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}

// Vista de mediocancha hacia el arco rival (zoom en el tercio de ataque), más legible que la cancha completa
// porque los remates casi siempre ocurren ahí. El recorte se calcula según los datos reales para no perder tiros.
const SHOT_VW = 360;
const SHOT_VH = 300;

function ShotMapPage({ data }: { data: OpponentReportData }) {
  const goles = data.shotMapRival.filter((s) => s.isGoal).length;
  const desviados = data.shotMapRival.filter((s) => s.outcome === "Off T" || s.outcome === "Wayward").length;
  const resto = data.shotMapRival.length - goles - desviados;

  const xs = data.shotMapRival.map((s) => s.location[0]);
  const xMin = xs.length > 0 ? Math.min(...xs) : 70;
  const xCorte = Math.max(40, Math.min(70, Math.floor(xMin / 5) * 5 - 5));
  const rangoX = 120 - xCorte;
  const escalaY = SHOT_VH / rangoX;
  const escalaX = SHOT_VW / 80;
  const sx = (y: number) => y * escalaX;
  const sy = (x: number) => (120 - x) * escalaY;

  return (
    <View>
      <Text style={styles.seccionTitulo}>Mapa de tiros — {data.rival.nombre}</Text>
      <Text style={styles.seccionSub}>
        Vista del tercio de ataque, arco arriba. Tamaño del punto = xG del remate. Verde = gol, rojo = a puerta/bloqueado, gris =
        desviado.
      </Text>
      <View style={{ alignItems: "center" }}>
        <Svg width={SHOT_VW} height={SHOT_VH} viewBox={`0 0 ${SHOT_VW} ${SHOT_VH}`}>
          <Rect x={0} y={0} width={SHOT_VW} height={SHOT_VH} fill="#eef3ee" stroke={COLORS.border} strokeWidth={1} />
          {/* Área grande */}
          <Rect
            x={sx(18)}
            y={0}
            width={sx(62) - sx(18)}
            height={sy(102)}
            stroke={COLORS.border}
            strokeWidth={1.2}
            fill="none"
          />
          {/* Área chica */}
          <Rect
            x={sx(30)}
            y={0}
            width={sx(50) - sx(30)}
            height={sy(114)}
            stroke={COLORS.border}
            strokeWidth={1.2}
            fill="none"
          />
          {/* Punto penal */}
          <Circle cx={sx(40)} cy={sy(108)} r={1.6} fill={COLORS.border} />
          {/* Boca del arco */}
          <Line x1={sx(36)} y1={1} x2={sx(44)} y2={1} stroke={COLORS.ink} strokeWidth={3} />
          {data.shotMapRival.map((s, i) => {
            const r = Math.max(3, Math.min(13, s.xg * 28));
            const color = s.isGoal ? COLORS.green : s.outcome === "Off T" || s.outcome === "Wayward" ? COLORS.gray : COLORS.red;
            return (
              <Circle
                key={i}
                cx={sx(s.location[1])}
                cy={sy(s.location[0])}
                r={r}
                fill={color}
                fillOpacity={0.8}
                stroke={COLORS.ink}
                strokeWidth={0.6}
                strokeOpacity={0.3}
              />
            );
          })}
        </Svg>
      </View>
      <View style={{ marginTop: 12 }}>
        <Text style={[styles.seccionSub, { marginBottom: 6 }]}>Distribución de resultados ({data.shotMapRival.length} remates)</Text>
        <DonutChart
          segmentos={[
            { label: "Goles", valor: goles, color: COLORS.green },
            { label: "A puerta / bloqueado", valor: resto, color: COLORS.red },
            { label: "Desviados", valor: desviados, color: COLORS.gray },
          ]}
        />
      </View>
      {data.topRematadoresRival.length > 0 && (
        <View style={{ marginTop: 14 }}>
          <Text style={{ fontSize: 11, fontWeight: 700, color: COLORS.blueDark, marginBottom: 3 }}>Top rematadores</Text>
          <Text style={[styles.bodyText, { color: COLORS.muted, marginBottom: 8 }]}>
            Jugadores con más remates reales en la muestra analizada ({data.contexto.partidosUtilizadosRival} partidos). Remates y xG
            acum. son de la muestra (StatsBomb no informa conteo de remates por temporada completa); goles son de toda la temporada
            (por90 real × minutos reales), para no ocultar a un goleador que no anotó en estos {data.contexto.partidosUtilizadosRival}{" "}
            partidos puntuales.
          </Text>
          <View style={styles.pasesTablaHeader}>
            <Text style={[styles.pasesTablaHeaderTxt, { flex: 2.4 }]}>Jugador</Text>
            <Text style={[styles.pasesTablaHeaderTxt, { flex: 1, textAlign: "center" }]}>Remates (muestra)</Text>
            <Text style={[styles.pasesTablaHeaderTxt, { flex: 1, textAlign: "center" }]}>Goles (totales)</Text>
            <Text style={[styles.pasesTablaHeaderTxt, { flex: 1, textAlign: "center" }]}>xG acum. (muestra)</Text>
          </View>
          {data.topRematadoresRival.map((r, i) => (
            <View key={r.playerId} style={[styles.pasesTablaFila, i % 2 === 1 ? styles.pasesTablaFilaPar : {}]} wrap={false}>
              <Text style={[styles.pasesTablaCelda, { flex: 2.4, fontWeight: 600 }]}>{r.nombre}</Text>
              <Text style={[styles.pasesTablaCeldaNum, { flex: 1, fontWeight: 700 }]}>{r.remates}</Text>
              <Text style={[styles.pasesTablaCeldaNum, { flex: 1, color: COLORS.green, fontWeight: 700 }]}>
                {r.golesTemporada ?? "s/d"}
              </Text>
              <Text style={[styles.pasesTablaCeldaNum, { flex: 1 }]}>{r.xgTotal.toFixed(2)}</Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

/**
 * Reemplaza la vieja "Red de pases" — pedido explícito del usuario. Campograma real de dónde nacen las
 * asistencias (pass.goal_assist, terminó en gol) y los pases previos a un remate que NO terminó en gol
 * (pass.shot_assist sin goal_assist), de TODA la temporada disponible del rival (no solo la muestra de 6
 * partidos) — StatsBomb Events v10, campos verificados contra datos reales.
 */
function PasesClavePage({ data }: { data: OpponentReportData }) {
  const info = data.pasesClaveTemporadaRival;
  if (!info) {
    return (
      <View>
        <Text style={styles.seccionTitulo}>Pases clave — {data.rival.nombre}</Text>
        <Text style={styles.seccionSub}>
          No se pudo descargar la temporada completa de eventos del rival para calcular esto (StatsBomb no respondió). El
          resto del informe no se ve afectado.
        </Text>
      </View>
    );
  }
  const maxAsist = Math.max(1, ...info.asistencias.campograma.map((z) => z.conteo));
  const maxPrevios = Math.max(1, ...info.pasesPreviosSinGol.campograma.map((z) => z.conteo));
  return (
    <View>
      <Text style={styles.seccionTitulo}>Pases clave — {data.rival.nombre}</Text>
      <Text style={styles.seccionSub}>
        Toda la temporada disponible ({info.totalPartidos} partidos, no solo la muestra de 6) — StatsBomb Events. Asistencias =
        pase que terminó directamente en gol. Pases previos = pase que terminó en remate pero NO en gol.
      </Text>
      {/* Apilados a lo ancho completo, NO lado a lado en columnas flex — ZoneGridPitch tiene ancho fijo (460pt) y
          se superpone visualmente si se lo mete en una columna angosta (bug real ya encontrado y arreglado antes
          en Pérdidas peligrosas). */}
      <View style={{ alignItems: "center", marginTop: 12 }}>
        <Text style={{ fontSize: 10.5, fontWeight: 700, color: COLORS.green, marginBottom: 6 }}>
          Asistencias reales ({info.asistencias.total})
        </Text>
        <ZoneGridPitch
          filas={3}
          columnas={3}
          colorBase={COLORS.green}
          direccionAtaque={`${data.rival.nombre} ataca hacia nuestro arco`}
          intensidad={(f, c) => (info.asistencias.campograma.find((z) => z.fila === f && z.columna === c)?.conteo ?? 0) / maxAsist}
          etiqueta={(f, c) => {
            const z = info.asistencias.campograma.find((zz) => zz.fila === f && zz.columna === c);
            return z && z.conteo > 0 ? `${z.conteo} (${z.porcentaje}%)` : "—";
          }}
        />
      </View>
      <View style={{ alignItems: "center", marginTop: 16 }}>
        <Text style={{ fontSize: 10.5, fontWeight: 700, color: COLORS.amber, marginBottom: 6 }}>
          Pases previos sin gol ({info.pasesPreviosSinGol.total})
        </Text>
        <ZoneGridPitch
          filas={3}
          columnas={3}
          colorBase={COLORS.amber}
          direccionAtaque={`${data.rival.nombre} ataca hacia nuestro arco`}
          intensidad={(f, c) => (info.pasesPreviosSinGol.campograma.find((z) => z.fila === f && z.columna === c)?.conteo ?? 0) / maxPrevios}
          etiqueta={(f, c) => {
            const z = info.pasesPreviosSinGol.campograma.find((zz) => zz.fila === f && zz.columna === c);
            return z && z.conteo > 0 ? `${z.conteo} (${z.porcentaje}%)` : "—";
          }}
        />
      </View>
    </View>
  );
}

// --- Estructura: formaciones reales usadas en la muestra + alineaciones sobre la cancha con posiciones reales ---
// (formacionARows / formacionATexto viven en events-analytics.ts, compartidas con report-data.ts)

const LINEAS_ORDEN: JugadorAlineado["linea"][] = ["Portero", "Defensa", "Mediocampo", "Ataque"];

/**
 * Coordenada relativa (0-1, x=profundidad hacia el arco rival, y=izquierda→derecha) por posición real de
 * StatsBomb (ya traducida al español por posicionEs). Es una convención de diagrama táctico estándar —no
 * depende del código de formación—, por eso coloca correctamente a un doble 5 aunque el "4-2-3-1" que
 * StatsBomb reporta no distinga izquierda/derecha en su código numérico.
 */
const POSITION_COORDS: Record<string, [number, number]> = {
  Arquero: [0.06, 0.5],
  "Lateral derecho": [0.22, 0.84],
  "Central derecho": [0.15, 0.62],
  Central: [0.13, 0.5],
  "Central izquierdo": [0.15, 0.38],
  "Lateral izquierdo": [0.22, 0.16],
  "Carrilero derecho": [0.34, 0.86],
  "Carrilero izquierdo": [0.34, 0.14],
  "Volante mixto derecho": [0.36, 0.66],
  "Volante central": [0.34, 0.5],
  "Volante mixto izquierdo": [0.36, 0.34],
  "Volante derecho": [0.5, 0.86],
  "Interior derecho": [0.48, 0.65],
  "Interior izquierdo": [0.48, 0.35],
  "Volante izquierdo": [0.5, 0.14],
  "Extremo derecho": [0.74, 0.85],
  "Mediapunta derecho": [0.66, 0.65],
  Mediapunta: [0.64, 0.5],
  "Mediapunta izquierdo": [0.66, 0.35],
  "Extremo izquierdo": [0.74, 0.15],
  "Delantero derecho": [0.86, 0.6],
  "Delantero centro": [0.9, 0.5],
  "Delantero izquierdo": [0.86, 0.4],
  "Segundo delantero": [0.82, 0.5],
};

/** Fallback determinístico (izquierda/derecha/centro por texto + profundidad por línea) para posiciones sin coordenada exacta. */
function coordenadaPosicion(posicion: string, linea: JugadorAlineado["linea"]): [number, number] {
  const exacta = POSITION_COORDS[posicion];
  if (exacta) return exacta;
  const t = posicion.toLowerCase();
  const y = t.includes("izquierd") ? 0.2 : t.includes("derech") ? 0.8 : 0.5;
  const x = linea === "Portero" ? 0.06 : linea === "Defensa" ? 0.16 : linea === "Mediocampo" ? 0.42 : 0.84;
  return [x, y];
}

/** Separa jugadores que caerían en la misma coordenada exacta (ej. 2 centrales) para que no se superpongan. */
function ubicarJugadores(jugadores: JugadorAlineado[]): { j: JugadorAlineado; x: number; y: number }[] {
  const base = jugadores.map((j) => {
    const [x, y] = coordenadaPosicion(j.posicion, j.linea);
    return { j, x, y };
  });
  const grupos = new Map<string, typeof base>();
  for (const b of base) {
    const key = `${b.x.toFixed(2)}_${b.y.toFixed(2)}`;
    if (!grupos.has(key)) grupos.set(key, []);
    grupos.get(key)!.push(b);
  }
  const resultado: { j: JugadorAlineado; x: number; y: number }[] = [];
  for (const grupo of grupos.values()) {
    if (grupo.length === 1) {
      resultado.push(grupo[0]);
      continue;
    }
    grupo.forEach((b, i) => {
      const offset = (i - (grupo.length - 1) / 2) * 0.1;
      resultado.push({ j: b.j, x: b.x, y: Math.min(0.94, Math.max(0.06, b.y + offset)) });
    });
  }
  return resultado;
}

function LineupPitchBase({ width, height }: { width: number; height: number }) {
  return (
    <>
      <Rect x={0} y={0} width={width} height={height} fill="#eef3ee" stroke={COLORS.border} strokeWidth={1} />
      <Line x1={width / 2} y1={0} x2={width / 2} y2={height} stroke={COLORS.border} strokeWidth={1} />
      <Circle cx={width / 2} cy={height / 2} r={height * 0.15} stroke={COLORS.border} strokeWidth={1} fill="none" />
      <Rect x={0} y={height * 0.22} width={width * 0.06} height={height * 0.56} stroke={COLORS.border} strokeWidth={1} fill="none" />
      <Rect x={width - width * 0.06} y={height * 0.22} width={width * 0.06} height={height * 0.56} stroke={COLORS.border} strokeWidth={1} fill="none" />
    </>
  );
}

/**
 * Ficha de alineación probable con nombre Y dorsal juntos en cada posición (pedido explícito del usuario para la
 * página de portada de alineaciones — distinto del resto del informe, donde solo va el dorsal en la cancha y el
 * nombre en una lista aparte). Once real de un partido concreto de la muestra — no es una predicción.
 */
function FichaAlineacionProbable({
  alineacion,
  color,
  equipoNombre,
}: {
  alineacion: AlineacionProbable | undefined;
  color: string;
  equipoNombre: string;
}) {
  const width = 260;
  const height = 169;
  if (!alineacion) {
    return (
      <View style={{ alignItems: "center", width: width + 16 }}>
        <Text style={{ fontSize: 10.5, fontWeight: 700, color: COLORS.blueDark, marginBottom: 6 }}>{equipoNombre}</Text>
        {/* Sin "fontStyle: italic": la fuente Inter registrada no tiene variante itálica. */}
        <Text style={{ fontSize: 8.5, color: COLORS.muted }}>Sin datos suficientes de Starting XI en la muestra.</Text>
      </View>
    );
  }
  const ubicados = ubicarJugadores(alineacion.jugadores);
  return (
    <View style={{ alignItems: "center", width: width + 16 }}>
      <Text style={{ fontSize: 10.5, fontWeight: 700, color: COLORS.blueDark }}>{equipoNombre}</Text>
      <Text style={{ fontSize: 9, fontWeight: 700, color, marginTop: 1 }}>{formacionATexto(alineacion.formacionCodigo)}</Text>
      <Text style={{ fontSize: 6.3, color: COLORS.muted, textAlign: "center", width, marginTop: 1, marginBottom: 6 }}>
        {alineacion.partidoReferenciaFecha} vs. {alineacion.partidoReferenciaRival}
      </Text>
      <View style={{ position: "relative", width, height }}>
        <Svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
          <LineupPitchBase width={width} height={height} />
          {ubicados.map((u, i) => (
            <Circle key={i} cx={u.x * width} cy={u.y * height} r={8.5} fill={color} />
          ))}
        </Svg>
        {ubicados.map((u, i) => (
          <Text
            key={`d-${i}`}
            style={{
              position: "absolute",
              left: u.x * width - 10,
              top: u.y * height - 5.2,
              width: 20,
              textAlign: "center",
              fontSize: 7.2,
              fontWeight: 700,
              color: "#ffffff",
            }}
          >
            {u.j.dorsal ?? ""}
          </Text>
        ))}
        {ubicados.map((u, i) => (
          <Text
            key={`n-${i}`}
            style={{
              position: "absolute",
              left: u.x * width - 44,
              top: u.y * height + 8.5,
              width: 88,
              textAlign: "center",
              fontSize: 5.3,
              fontWeight: 600,
              color: COLORS.ink,
            }}
          >
            {u.j.nombre}
          </Text>
        ))}
      </View>
    </View>
  );
}

/**
 * Nueva página al comienzo del informe: alineaciones probables de los dos equipos lado a lado (Starting XI real
 * de un partido concreto de la muestra de cada uno), con nombre y dorsal en cada ficha y la estructura usada —
 * pedido explícito del usuario, para tener esto de entrada sin tener que llegar a la página de Estructura.
 */
/** Solo el rival, hasta 2 variantes (si usó más de una formación en la muestra) — a pedido explícito del usuario,
 * se sacó a nuestro equipo de esta página. */
function AlineacionesProbablesAmbosPage({ data }: { data: OpponentReportData }) {
  return (
    <View>
      <Text style={styles.seccionTitulo}>Alineaciones probables — {data.rival.nombre}</Text>
      <Text style={styles.seccionSub}>
        Once real de un partido concreto de la muestra — no es una predicción, es el Starting XI real de ese partido, con la
        formación que usó.
      </Text>
      <View style={{ flexDirection: "row", justifyContent: "space-around", flexWrap: "wrap", gap: 14, marginTop: 12 }}>
        {data.alineacionesProbablesRival.slice(0, 2).map((al, i) => (
          <FichaAlineacionProbable key={i} alineacion={al} color={i === 0 ? COLORS.red : COLORS.blueDark} equipoNombre={data.rival.nombre} />
        ))}
      </View>
    </View>
  );
}

/** Once real sobre una cancha, con cada jugador en la posición real que jugó (no una grilla genérica). */
/** Solo dorsal en la cancha (nunca se superpone con nombres largos) — el nombre completo va en la lista de abajo
 * junto al dorsal, mismo criterio que FaseFormacionMini (pedido explícito del usuario). */
function AlineacionEnCancha({ alineacion, color }: { alineacion: AlineacionProbable; color: string }) {
  const width = 250;
  const height = 163;
  const ubicados = ubicarJugadores(alineacion.jugadores);
  return (
    <View style={{ alignItems: "center", width: width + 16 }}>
      <Text style={{ fontSize: 9.5, fontWeight: 700, color: COLORS.blueDark }}>{formacionATexto(alineacion.formacionCodigo)}</Text>
      <Text style={{ fontSize: 6.3, color: COLORS.muted, textAlign: "center", width, marginBottom: 4 }}>
        {alineacion.partidoReferenciaFecha} vs. {alineacion.partidoReferenciaRival}
        {alineacion.huboCambioEnEsePartido ? " — con cambio de formación durante ese partido" : ""}
      </Text>
      <View style={{ position: "relative", width, height }}>
        <Svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
          <LineupPitchBase width={width} height={height} />
          {ubicados.map((u, i) => (
            <Circle key={i} cx={u.x * width} cy={u.y * height} r={8.5} fill={color} />
          ))}
        </Svg>
        {ubicados.map((u, i) => (
          <Text
            key={i}
            style={{
              position: "absolute",
              left: u.x * width - 10,
              top: u.y * height - 5.2,
              width: 20,
              textAlign: "center",
              fontSize: 7.2,
              fontWeight: 700,
              color: "#ffffff",
            }}
          >
            {u.j.dorsal ?? ""}
          </Text>
        ))}
      </View>
      <View style={{ marginTop: 10, width }}>
        {LINEAS_ORDEN.map((linea) => {
          const jugadoresLinea = alineacion.jugadores.filter((j) => j.linea === linea);
          if (jugadoresLinea.length === 0) return null;
          return (
            <Text key={linea} style={{ fontSize: 6.3, marginBottom: 2, lineHeight: 1.35 }}>
              <Text style={{ fontWeight: 700, color: COLORS.muted }}>{linea}: </Text>
              {jugadoresLinea.map((j) => `#${j.dorsal ?? "—"} ${j.nombre}`).join(", ")}
            </Text>
          );
        })}
      </View>
    </View>
  );
}

/** Últimas estructuras reales del rival, partido a partido, con el cambio táctico si lo hubo (StatsBomb Lineups). */
function EstructurasRecientesTabla({ estructuras }: { estructuras: EstructuraPartido[] }) {
  if (estructuras.length === 0) return null;
  return (
    <View style={{ marginBottom: 16 }}>
      <View style={{ flexDirection: "row", borderBottom: `1 solid ${COLORS.border}`, paddingBottom: 4, marginBottom: 2 }}>
        <Text style={{ flex: 1.5, fontSize: 7, fontWeight: 700, color: COLORS.muted, textTransform: "uppercase" }}>Fecha</Text>
        <Text style={{ flex: 2, fontSize: 7, fontWeight: 700, color: COLORS.muted, textTransform: "uppercase" }}>Rival</Text>
        <Text style={{ flex: 1.3, fontSize: 7, fontWeight: 700, color: COLORS.muted, textTransform: "uppercase", textAlign: "center" }}>
          Formación inicial
        </Text>
        <Text style={{ flex: 1.6, fontSize: 7, fontWeight: 700, color: COLORS.muted, textTransform: "uppercase", textAlign: "center" }}>
          Cambio durante el partido
        </Text>
      </View>
      {estructuras.map((e, i) => (
        <View
          key={e.matchId}
          style={{ flexDirection: "row", alignItems: "center", paddingVertical: 4, backgroundColor: i % 2 === 1 ? COLORS.grayTint : "transparent" }}
        >
          <Text style={{ flex: 1.5, fontSize: 7.6 }}>{e.fecha}</Text>
          <Text style={{ flex: 2, fontSize: 7.6 }}>{e.rival}</Text>
          <Text style={{ flex: 1.3, fontSize: 7.6, textAlign: "center", fontWeight: 700 }}>{formacionATexto(e.formacionInicial)}</Text>
          <Text style={{ flex: 1.6, fontSize: 7.6, textAlign: "center", fontWeight: 700, color: e.huboCambio ? COLORS.red : COLORS.muted }}>
            {e.huboCambio ? `→ ${formacionATexto(e.formacionFinal)} (${e.tiempoCambio})` : "Sin cambios"}
          </Text>
        </View>
      ))}
    </View>
  );
}

/** Mini-cancha de una fase táctica real de un partido puntual (dorsal + nombre en cada posición ocupada en ese momento). */
function FaseFormacionMini({ fase }: { fase: FaseFormacionPartido }) {
  const width = 250;
  const height = 164;
  const ubicados = ubicarJugadores(fase.jugadores);
  const rango = fase.hastaMinuto !== null ? `${fase.desdeMinuto}'–${fase.hastaMinuto}'` : `${fase.desdeMinuto}'–fin`;
  // Solo dorsal en la cancha (nunca se superpone, siempre es corto) — el nombre completo va en la leyenda de
  // abajo, ordenada por dorsal, para poder identificar a cada uno sin que el texto se pise en un diagrama chico.
  const leyenda = [...fase.jugadores].sort((a, b) => (a.dorsal ?? 999) - (b.dorsal ?? 999));
  return (
    <View style={{ alignItems: "center", width: width + 8 }}>
      <Text style={{ fontSize: 11.5, fontWeight: 700, color: COLORS.blueDark }}>{formacionATexto(fase.formacionCodigo)}</Text>
      <Text style={{ fontSize: 8.5, fontWeight: 700, color: COLORS.muted, marginBottom: 4 }}>{rango}</Text>
      <View style={{ position: "relative", width, height }}>
        <Svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
          <LineupPitchBase width={width} height={height} />
          {ubicados.map((u, i) => (
            <Circle key={i} cx={u.x * width} cy={u.y * height} r={9} fill={COLORS.blueDark} />
          ))}
        </Svg>
        {ubicados.map((u, i) => (
          <Text
            key={`d-${i}`}
            style={{
              position: "absolute",
              left: u.x * width - 10,
              top: u.y * height - 5.5,
              width: 20,
              textAlign: "center",
              fontSize: 7.5,
              fontWeight: 700,
              color: "#ffffff",
            }}
          >
            {u.j.dorsal ?? ""}
          </Text>
        ))}
      </View>
      <View style={{ flexDirection: "row", flexWrap: "wrap", width, marginTop: 6, gap: 2 }}>
        {leyenda.map((j, i) => (
          <Text key={i} style={{ width: width / 2 - 2, fontSize: 5.6, color: COLORS.ink }}>
            <Text style={{ fontWeight: 700, color: COLORS.blueDark }}>{j.dorsal ?? "—"}</Text> {j.nombre}
          </Text>
        ))}
      </View>
    </View>
  );
}

/**
 * Una página por partido de la muestra: alineación real y todas sus fases tácticas (Starting XI + cada cambio
 * de formación real, StatsBomb Lineups v5), con horario real de cada fase. Inspirado en el informe de
 * referencia que compartió el usuario (Wyscout, sección "Partidos").
 */
function AlineacionPorPartidoPage({
  data,
  partido,
  alineacion,
}: {
  data: OpponentReportData;
  partido: MuestraPartido;
  alineacion: AlineacionesPartido;
}) {
  return (
    <View>
      <Text style={styles.seccionTitulo}>Alineación por partido — {data.rival.nombre}</Text>
      <Text style={styles.seccionSub}>
        Fases tácticas reales del partido (formación inicial y cada cambio registrado), con quién ocupaba cada posición en
        cada momento.
      </Text>
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 12, marginTop: 10 }}>
        {partido.escudoRivalUrl && (
          // eslint-disable-next-line jsx-a11y/alt-text -- react-pdf Image, no HTML img
          <Image src={partido.escudoRivalUrl} style={{ width: 30, height: 30 }} />
        )}
        <Text style={{ fontSize: 12.5, fontWeight: 700, color: COLORS.blueDark }}>
          {partido.condicion === "visitante" ? `${partido.rival} vs. ${data.rival.nombre}` : `${data.rival.nombre} vs. ${partido.rival}`}
        </Text>
      </View>
      <Text style={{ textAlign: "center", fontSize: 9, color: COLORS.muted, marginTop: 2, marginBottom: 16 }}>
        {partido.golesFavor !== null && partido.golesContra !== null ? `${partido.golesFavor} - ${partido.golesContra} · ` : ""}
        {partido.fecha}
      </Text>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 14, justifyContent: "center" }}>
        {alineacion.fases.map((fase, i) => (
          <FaseFormacionMini key={i} fase={fase} />
        ))}
      </View>

      {alineacion.sustituciones.length > 0 && (
        <View style={{ marginTop: 18 }} wrap={false}>
          <Text style={{ fontSize: 10.5, fontWeight: 700, color: COLORS.blueDark, marginBottom: 6 }}>
            Sustituciones — {data.rival.nombre}
          </Text>
          <View style={styles.pasesTablaHeader}>
            <Text style={[styles.pasesTablaHeaderTxt, { flex: 0.7, textAlign: "center" }]}>Minuto</Text>
            <Text style={[styles.pasesTablaHeaderTxt, { flex: 2 }]}>Sale</Text>
            <Text style={[styles.pasesTablaHeaderTxt, { flex: 2 }]}>Entra</Text>
          </View>
          {alineacion.sustituciones.map((s, i) => (
            <View key={i} style={[styles.pasesTablaFila, i % 2 === 1 ? styles.pasesTablaFilaPar : {}]} wrap={false}>
              <Text style={[styles.pasesTablaCeldaNum, { flex: 0.7 }]}>{s.minuto}&apos;</Text>
              <Text style={[styles.pasesTablaCelda, { flex: 2, color: COLORS.red }]}>
                {s.saleDorsal !== null ? `#${s.saleDorsal} ` : ""}
                {s.saleNombre}
              </Text>
              <Text style={[styles.pasesTablaCelda, { flex: 2, color: COLORS.green }]}>
                {s.entraDorsal !== null ? `#${s.entraDorsal} ` : ""}
                {s.entraNombre}
              </Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

function EstructuraPage({ data }: { data: OpponentReportData }) {
  return (
    <View>
      <Text style={styles.seccionTitulo}>Estructura y formación — {data.rival.nombre}</Text>
      <Text style={styles.seccionSub}>
        Formaciones reales del rival en cada partido de la muestra (Starting XI y cambios tácticos), según StatsBomb Lineups.
      </Text>
      <EstructurasRecientesTabla estructuras={data.estructurasRecientesRival} />
      {data.alineacionesProbablesRival.length > 0 && (
        <View style={{ marginTop: 4 }}>
          <Text style={{ fontSize: 11, fontWeight: 700, color: COLORS.blueDark, marginBottom: 3 }}>
            {data.alineacionesProbablesRival.length === 2 ? "Alineaciones probables (dos variantes)" : "Alineación probable"}
          </Text>
          <Text style={[styles.bodyText, { color: COLORS.muted, marginBottom: 8 }]}>
            Once real de un partido concreto de la muestra — no es una predicción, es el Starting XI real de ese partido.
          </Text>
          <View style={{ flexDirection: "row", justifyContent: "space-around", flexWrap: "wrap", gap: 10 }} wrap={false}>
            {data.alineacionesProbablesRival.map((al, i) => (
              <AlineacionEnCancha key={i} alineacion={al} color={i === 0 ? COLORS.red : COLORS.blueDark} />
            ))}
          </View>
        </View>
      )}
      {data.estructuraInterpretacion.length > 0 && (
        <View style={[styles.sectionCard, { marginTop: 16 }]} wrap={false}>
          <View style={[styles.sectionHeader, { backgroundColor: COLORS.blueDark }]}>
            <Text style={styles.sectionHeaderTitle}>Cambios de estructura y de jugadores</Text>
          </View>
          <View style={styles.sectionBody}>
            {data.estructuraInterpretacion.map((l, i) => (
              <Text key={i} style={[styles.bodyText, { marginBottom: 3 }]}>
                • {l}
              </Text>
            ))}
          </View>
        </View>
      )}
    </View>
  );
}

function GolesPorFranjaChart({ franjas, rivalNombre }: { franjas: OpponentReportData["golesPorFranjaRival"]; rivalNombre: string }) {
  const ALTO = 180;
  const maxVal = Math.max(1, ...franjas.flatMap((f) => [f.golesFavor, f.golesContra]));
  return (
    <View>
      <View style={{ flexDirection: "row", alignItems: "flex-end", height: ALTO, gap: 18, marginTop: 8 }}>
        {franjas.map((f) => (
          <View key={f.franja} style={{ flex: 1, flexDirection: "row", alignItems: "flex-end", justifyContent: "center", gap: 8, height: ALTO }}>
            <View style={{ alignItems: "center" }}>
              {f.golesContra > 0 && <Text style={{ fontSize: 9, fontWeight: 700, color: COLORS.red, marginBottom: 2 }}>{f.golesContra}</Text>}
              <View style={{ width: 28, height: Math.max(2, (f.golesContra / maxVal) * ALTO), backgroundColor: COLORS.red, borderRadius: 3 }} />
            </View>
            <View style={{ alignItems: "center" }}>
              {f.golesFavor > 0 && <Text style={{ fontSize: 9, fontWeight: 700, color: COLORS.blue, marginBottom: 2 }}>{f.golesFavor}</Text>}
              <View style={{ width: 28, height: Math.max(2, (f.golesFavor / maxVal) * ALTO), backgroundColor: COLORS.blue, borderRadius: 3 }} />
            </View>
          </View>
        ))}
      </View>
      <View style={{ flexDirection: "row", gap: 14, marginTop: 4 }}>
        {franjas.map((f) => (
          <Text key={f.franja} style={{ flex: 1, fontSize: 8, fontWeight: 700, textAlign: "center", color: COLORS.muted }}>
            {f.franja}
          </Text>
        ))}
      </View>
      <View style={{ flexDirection: "row", gap: 14, marginTop: 10 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
          <View style={{ width: 9, height: 9, backgroundColor: COLORS.blue, borderRadius: 2 }} />
          <Text style={{ fontSize: 8 }}>Goles a favor de {rivalNombre}</Text>
        </View>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
          <View style={{ width: 9, height: 9, backgroundColor: COLORS.red, borderRadius: 2 }} />
          <Text style={{ fontSize: 8 }}>Goles concedidos por {rivalNombre}</Text>
        </View>
      </View>
    </View>
  );
}

function PatronSustitucionesTabla({
  patron,
  cambiosHabituales,
  rivalNombre,
}: {
  patron: OpponentReportData["patronSustitucionesRival"];
  cambiosHabituales: OpponentReportData["sustitucionesHabitualesRival"];
  rivalNombre: string;
}) {
  if (!patron) {
    return <Text style={styles.bodyText}>No hay cambios tácticos registrados (excluyendo lesiones) en la muestra analizada.</Text>;
  }
  const pct = (n: number) => Math.round((n / patron.totalCambios) * 100);
  return (
    <View>
      <Text style={[styles.bodyText, { fontSize: 9.5 }]}>
        {rivalNombre} hizo {patron.totalCambios} cambios tácticos (sin contar lesiones) en la muestra analizada, en el minuto
        {" "}
        {patron.minutoPromedio}&apos; en promedio. El {Math.round((patron.segundoTiempo / patron.totalCambios) * 100)}% de los
        cambios fueron en el segundo tiempo.
      </Text>
      <View style={{ flexDirection: "row", gap: 12, marginTop: 12 }}>
        <View style={{ flex: 1, alignItems: "center", padding: 12, backgroundColor: COLORS.grayTint, borderRadius: 7 }}>
          <Text style={{ fontSize: 20, fontWeight: 700, color: COLORS.blue }}>{patron.ganando}</Text>
          <Text style={{ fontSize: 7.5, color: COLORS.muted }}>Cambios ganando ({pct(patron.ganando)}%)</Text>
        </View>
        <View style={{ flex: 1, alignItems: "center", padding: 12, backgroundColor: COLORS.grayTint, borderRadius: 7 }}>
          <Text style={{ fontSize: 20, fontWeight: 700, color: COLORS.ink }}>{patron.empatando}</Text>
          <Text style={{ fontSize: 7.5, color: COLORS.muted }}>Cambios empatando ({pct(patron.empatando)}%)</Text>
        </View>
        <View style={{ flex: 1, alignItems: "center", padding: 12, backgroundColor: COLORS.grayTint, borderRadius: 7 }}>
          <Text style={{ fontSize: 20, fontWeight: 700, color: COLORS.red }}>{patron.perdiendo}</Text>
          <Text style={{ fontSize: 7.5, color: COLORS.muted }}>Cambios perdiendo ({pct(patron.perdiendo)}%)</Text>
        </View>
      </View>
      {cambiosHabituales.length > 0 && (
        <View style={{ marginTop: 14 }}>
          <Text style={{ fontSize: 9.5, fontWeight: 700, color: COLORS.blueDark, marginBottom: 5 }}>Cambios más habituales</Text>
          {cambiosHabituales.map((c, i) => (
            <View
              key={`${c.saleNombre}-${c.entraNombre}`}
              style={{ flexDirection: "row", alignItems: "center", paddingVertical: 5, backgroundColor: i % 2 === 1 ? COLORS.grayTint : "transparent", borderRadius: 4, paddingHorizontal: 6 }}
            >
              <Text style={{ fontSize: 8.6, flex: 1 }}>
                <Text style={{ color: COLORS.red, fontWeight: 700 }}>{c.saleNombre}</Text>
                {"  →  "}
                <Text style={{ color: COLORS.green, fontWeight: 700 }}>{c.entraNombre}</Text>
              </Text>
              <Text style={{ fontSize: 8, color: COLORS.muted }}>{c.veces} {c.veces === 1 ? "vez" : "veces"}</Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

function DinamicaPartidoPage({ data }: { data: OpponentReportData }) {
  return (
    <View>
      <Text style={styles.seccionTitulo}>Dinámica de partido — {data.rival.nombre}</Text>
      <Text style={styles.seccionSub}>
        Cuándo llegan sus goles y cómo mueve el banco, según los eventos reales de StatsBomb en la muestra analizada.
      </Text>
      <View style={{ marginTop: 20 }} wrap={false}>
        <Text style={{ fontSize: 13, fontWeight: 700, color: COLORS.blueDark, marginBottom: 4 }}>Goles por franja de 15 minutos</Text>
        <GolesPorFranjaChart franjas={data.golesPorFranjaRival} rivalNombre={data.rival.nombre} />
      </View>
      <View style={{ marginTop: 34, paddingTop: 22, borderTop: `1 solid ${COLORS.border}` }}>
        <Text style={{ fontSize: 13, fontWeight: 700, color: COLORS.blueDark, marginBottom: 4 }}>Patrones de sustitución</Text>
        <PatronSustitucionesTabla patron={data.patronSustitucionesRival} cambiosHabituales={data.sustitucionesHabitualesRival} rivalNombre={data.rival.nombre} />
      </View>
    </View>
  );
}

// --- Matriz de pases jugador a jugador (StatsBomb Events, mismo criterio que la red de pases: mínimo 2 pases) ---
/** Verde más fuerte = conexión más intensa, relativo al máximo de la propia matriz. */
function colorIntensidadPase(valor: number, max: number): string {
  const t = max > 0 ? Math.min(1, valor / max) : 0;
  const opacidad = 0.12 + t * 0.8;
  return `rgba(15, 110, 86, ${opacidad.toFixed(2)})`;
}

function PassMatrixTable({ red }: { red: OpponentReportData["passNetworkRival"] }) {
  const jugadores = [...red.nodes].sort((a, b) => b.passesCompleted - a.passesCompleted);
  if (jugadores.length === 0) return null;

  const edgeMap = new Map<string, number>();
  let maxValor = 1;
  for (const e of red.edges) {
    edgeMap.set(`${e.fromPlayerId}-${e.toPlayerId}`, e.count);
    if (e.count > maxValor) maxValor = e.count;
  }

  const ROW_LABEL_W = 122;
  const anchoDisponible = 782 - ROW_LABEL_W;
  const COL_W = Math.max(20, Math.min(30, anchoDisponible / jugadores.length));

  return (
    <View>
      <View style={{ flexDirection: "row" }}>
        <View style={{ width: ROW_LABEL_W }} />
        {jugadores.map((j) => (
          <View key={j.playerId} style={{ width: COL_W, alignItems: "center", justifyContent: "flex-end", paddingBottom: 3 }}>
            <Text style={{ fontSize: 8, fontWeight: 700, color: COLORS.blueDark, textAlign: "center" }}>{j.dorsal ?? "—"}</Text>
          </View>
        ))}
      </View>
      {jugadores.map((fila, i) => (
        <View
          key={fila.playerId}
          style={{ flexDirection: "row", backgroundColor: i % 2 === 1 ? COLORS.grayTint : "transparent" }}
        >
          <View style={{ width: ROW_LABEL_W, justifyContent: "center", paddingVertical: 3 }}>
            <Text style={{ fontSize: 6.2 }}>
              {fila.dorsal !== null ? `#${fila.dorsal} ` : ""}
              {fila.playerName}
            </Text>
          </View>
          {jugadores.map((col) => {
            const esDiagonal = col.playerId === fila.playerId;
            const valor = edgeMap.get(`${fila.playerId}-${col.playerId}`);
            return (
              <View
                key={col.playerId}
                style={{
                  width: COL_W,
                  height: 17,
                  alignItems: "center",
                  justifyContent: "center",
                  backgroundColor: esDiagonal ? COLORS.gray : valor ? colorIntensidadPase(valor, maxValor) : "transparent",
                }}
              >
                {!esDiagonal && valor ? (
                  <Text style={{ fontSize: 6, fontWeight: valor / maxValor > 0.5 ? 700 : 400, color: valor / maxValor > 0.6 ? "#fff" : COLORS.ink }}>
                    {valor}
                  </Text>
                ) : null}
              </View>
            );
          })}
        </View>
      ))}
    </View>
  );
}

// --- Radar comparativo (percentiles normalizados 0-100, ya orientados para que "más = mejor") ---
const RADAR_SIZE = 400;
const RADAR_CENTER = RADAR_SIZE / 2;
const RADAR_RADIUS = 100;
const RADAR_LABEL_RADIUS = 145;
const RADAR_LABEL_W = 98;

function puntoEnAngulo(radio: number, indice: number, total: number): [number, number] {
  const angulo = -Math.PI / 2 + indice * ((2 * Math.PI) / total);
  return [RADAR_CENTER + radio * Math.cos(angulo), RADAR_CENTER + radio * Math.sin(angulo)];
}

function puntoRadar(valor: number, indice: number, total: number): [number, number] {
  const r = (Math.max(0, Math.min(100, valor)) / 100) * RADAR_RADIUS;
  return puntoEnAngulo(r, indice, total);
}

function RadarChart({ puntos, nuestroNombre, rivalNombre }: { puntos: OpponentReportData["radar"]; nuestroNombre: string; rivalNombre: string }) {
  if (puntos.length < 3) return null;
  const total = puntos.length;
  const poligono = (valores: (number | null)[]) =>
    valores.map((v, i) => puntoRadar(v ?? 0, i, total).join(",")).join(" ");
  const nosotrosPts = poligono(puntos.map((p) => p.nosotros));
  const rivalPts = poligono(puntos.map((p) => p.rival));

  return (
    <View style={{ alignItems: "center" }}>
      <View style={{ position: "relative", width: RADAR_SIZE, height: RADAR_SIZE }}>
        <Svg width={RADAR_SIZE} height={RADAR_SIZE} viewBox={`0 0 ${RADAR_SIZE} ${RADAR_SIZE}`}>
          {[0.25, 0.5, 0.75, 1].map((f, i) => (
            <Circle key={i} cx={RADAR_CENTER} cy={RADAR_CENTER} r={RADAR_RADIUS * f} stroke={COLORS.border} strokeWidth={0.6} fill="none" />
          ))}
          {puntos.map((_, i) => {
            const [x, y] = puntoEnAngulo(RADAR_RADIUS, i, total);
            return <Line key={i} x1={RADAR_CENTER} y1={RADAR_CENTER} x2={x} y2={y} stroke={COLORS.border} strokeWidth={0.6} />;
          })}
          <Polygon points={rivalPts} stroke={COLORS.red} strokeWidth={1.5} fill={COLORS.red} fillOpacity={0.18} />
          <Polygon points={nosotrosPts} stroke={COLORS.blue} strokeWidth={1.5} fill={COLORS.blue} fillOpacity={0.18} />
          {puntos.map((p, i) => {
            if (p.rival === null) return null;
            const [x, y] = puntoRadar(p.rival, i, total);
            return <Circle key={`rv-${p.metricId}`} cx={x} cy={y} r={2.6} fill={COLORS.red} />;
          })}
          {puntos.map((p, i) => {
            if (p.nosotros === null) return null;
            const [x, y] = puntoRadar(p.nosotros, i, total);
            return <Circle key={`ns-${p.metricId}`} cx={x} cy={y} r={2.6} fill={COLORS.blue} />;
          })}
        </Svg>
        {/* Percentiles reales sobre cada vértice — números, no solo el área del polígono. */}
        {puntos.map((p, i) => {
          if (p.rival === null) return null;
          const [x, y] = puntoRadar(p.rival, i, total);
          return (
            <Text
              key={`pct-rv-${p.metricId}`}
              style={{
                position: "absolute",
                left: x - 12,
                top: y - 13,
                width: 24,
                fontSize: 6.3,
                fontWeight: 700,
                textAlign: "center",
                color: "#fff",
                backgroundColor: COLORS.red,
                borderRadius: 5,
                paddingVertical: 1,
              }}
            >
              {p.rival}
            </Text>
          );
        })}
        {puntos.map((p, i) => {
          if (p.nosotros === null) return null;
          const [x, y] = puntoRadar(p.nosotros, i, total);
          return (
            <Text
              key={`pct-ns-${p.metricId}`}
              style={{
                position: "absolute",
                left: x - 12,
                top: y + 5,
                width: 24,
                fontSize: 6.3,
                fontWeight: 700,
                textAlign: "center",
                color: "#fff",
                backgroundColor: COLORS.blue,
                borderRadius: 5,
                paddingVertical: 1,
              }}
            >
              {p.nosotros}
            </Text>
          );
        })}
        {puntos.map((p, i) => {
          const [x, y] = puntoEnAngulo(RADAR_LABEL_RADIUS, i, total);
          const dx = x - RADAR_CENTER;
          const lado: "izquierda" | "derecha" | "centro" = dx < -14 ? "izquierda" : dx > 14 ? "derecha" : "centro";
          const left = lado === "izquierda" ? x - RADAR_LABEL_W : lado === "derecha" ? x : x - RADAR_LABEL_W / 2;
          return (
            <View
              key={p.metricId}
              style={{
                position: "absolute",
                left,
                top: y - 12,
                width: RADAR_LABEL_W,
              }}
            >
              <Text
                style={{
                  fontSize: 6.8,
                  lineHeight: 1.25,
                  color: COLORS.blueDark,
                  fontWeight: 700,
                  textAlign: lado === "izquierda" ? "right" : lado === "derecha" ? "left" : "center",
                }}
              >
                {p.label}
              </Text>
            </View>
          );
        })}
      </View>
      <View style={styles.radarLegendFila}>
        <View style={styles.radarLegendItem}>
          <View style={[styles.radarLegendDot, { backgroundColor: COLORS.blue }]} />
          <Text style={styles.radarLegendTxt}>{nuestroNombre}</Text>
        </View>
        <View style={styles.radarLegendItem}>
          <View style={[styles.radarLegendDot, { backgroundColor: COLORS.red }]} />
          <Text style={styles.radarLegendTxt}>{rivalNombre}</Text>
        </View>
      </View>
    </View>
  );
}

/** Tabla con los valores reales detrás del radar (percentiles no dicen la magnitud) — la mejor marca en verde. */
function RadarTable({
  puntos,
  nuestroNombre,
  rivalNombre,
}: {
  puntos: OpponentReportData["radar"];
  nuestroNombre: string;
  rivalNombre: string;
}) {
  return (
    <View style={{ marginTop: 16 }}>
      <View style={{ flexDirection: "row", borderBottom: `1 solid ${COLORS.border}`, paddingBottom: 5, marginBottom: 2 }}>
        <Text style={{ flex: 2, fontSize: 7.2, fontWeight: 700, color: COLORS.muted, textTransform: "uppercase" }}>Métrica</Text>
        <Text style={{ flex: 1, fontSize: 7.2, fontWeight: 700, color: COLORS.blue, textAlign: "center" }}>{nombreCorto(nuestroNombre)}</Text>
        <Text style={{ flex: 1, fontSize: 7.2, fontWeight: 700, color: COLORS.red, textAlign: "center" }}>{nombreCorto(rivalNombre)}</Text>
        <Text style={{ flex: 1, fontSize: 7.2, fontWeight: 700, color: COLORS.muted, textAlign: "center" }}>Liga</Text>
      </View>
      {puntos.map((p, i) => {
        let nuestroMejor: boolean | null = null;
        if (p.nuestroValorReal !== null && p.rivalValorReal !== null && p.nuestroValorReal !== p.rivalValorReal) {
          nuestroMejor = p.invert ? p.nuestroValorReal < p.rivalValorReal : p.nuestroValorReal > p.rivalValorReal;
        }
        return (
          <View
            key={p.metricId}
            style={{
              flexDirection: "row",
              alignItems: "center",
              paddingVertical: 4,
              backgroundColor: i % 2 === 1 ? COLORS.grayTint : "transparent",
            }}
          >
            <Text style={{ flex: 2, fontSize: 7.6 }}>{p.label}</Text>
            <View style={{ flex: 1, alignItems: "center" }}>
              <Text
                style={[
                  { fontSize: 7.8, fontWeight: 700, paddingHorizontal: 6, paddingVertical: 1.5, borderRadius: 8 },
                  nuestroMejor === true ? { backgroundColor: COLORS.greenTint, color: COLORS.green } : {},
                ]}
              >
                {n(p.nuestroValorReal)}
              </Text>
            </View>
            <View style={{ flex: 1, alignItems: "center" }}>
              <Text
                style={[
                  { fontSize: 7.8, fontWeight: 700, paddingHorizontal: 6, paddingVertical: 1.5, borderRadius: 8 },
                  nuestroMejor === false ? { backgroundColor: COLORS.greenTint, color: COLORS.green } : {},
                ]}
              >
                {n(p.rivalValorReal)}
              </Text>
            </View>
            <Text style={{ flex: 1, fontSize: 7.3, color: COLORS.muted, textAlign: "center" }}>{n(p.promedioLiga)}</Text>
          </View>
        );
      })}
    </View>
  );
}

// --- Scatter plot con escudos reales de toda la liga ---
const SCATTER_W = 460;
const SCATTER_H = 280;
const SCATTER_PAD = 30;

/** N+1 marcas equiespaciadas entre origen y origen+rango, para referencias numéricas en los ejes. */
function marcasEje(origen: number, rango: number, n = 4): number[] {
  return Array.from({ length: n + 1 }, (_, i) => origen + (rango * i) / n);
}

function formatoEje(v: number): string {
  const abs = Math.abs(v);
  return abs < 10 ? v.toFixed(2) : abs < 100 ? v.toFixed(1) : v.toFixed(0);
}

function ScatterChart({
  plot,
  nuestroCrestUrl,
  width = SCATTER_W,
  height = SCATTER_H,
}: {
  plot: ScatterPlot;
  nuestroCrestUrl: string;
  width?: number;
  height?: number;
}) {
  const xs = plot.puntos.map((p) => p.x);
  const ys = plot.puntos.map((p) => p.y);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  const margenX = (maxX - minX) * 0.08 || 1;
  const margenY = (maxY - minY) * 0.08 || 1;
  const origenX = minX - margenX;
  const rangoX = maxX - minX + 2 * margenX || 1;
  const origenY = minY - margenY;
  const rangoY = maxY - minY + 2 * margenY || 1;
  const padIzq = 34;
  const padResto = SCATTER_PAD;
  const toX = (v: number) => padIzq + ((v - origenX) / rangoX) * (width - padIzq - padResto);
  const toY = (v: number) => height - padResto - ((v - origenY) / rangoY) * (height - 2 * padResto);

  const promedioX = xs.reduce((a, b) => a + b, 0) / xs.length;
  const promedioY = ys.reduce((a, b) => a + b, 0) / ys.length;
  const avgXpx = toX(promedioX);
  const avgYpx = toY(promedioY);
  const left = padIzq;
  const right = width - padResto;
  const top = padResto;
  const bottom = height - padResto;

  // Cuadrante "mejor" = lado bueno de X ∩ lado bueno de Y; "peor" = lado malo ∩ lado malo. Los otros 2 quedan neutros.
  const xLadoBueno = plot.xInvertido ? [left, avgXpx] : [avgXpx, right];
  const xLadoMalo = plot.xInvertido ? [avgXpx, right] : [left, avgXpx];
  const yLadoBueno = plot.yInvertido ? [avgYpx, bottom] : [top, avgYpx];
  const yLadoMalo = plot.yInvertido ? [top, avgYpx] : [avgYpx, bottom];

  const destacados = plot.puntos.filter((p) => p.esNosotros || p.esRival);
  const resto = plot.puntos.filter((p) => !p.esNosotros && !p.esRival);
  const SIZE_RESTO = width < 350 ? 10 : 15;
  const SIZE_DESTACADO = width < 350 ? 18 : 26;
  const xTicks = marcasEje(origenX, rangoX);
  const yTicks = marcasEje(origenY, rangoY);

  return (
    <View>
      <View style={{ position: "relative", width, height: height + 12 }}>
        <Svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
          <Rect x={0} y={0} width={width} height={height} fill="#fafaf8" stroke={COLORS.border} strokeWidth={1} />
          <Rect x={xLadoBueno[0]} y={yLadoBueno[0]} width={xLadoBueno[1] - xLadoBueno[0]} height={yLadoBueno[1] - yLadoBueno[0]} fill={COLORS.green} opacity={0.09} />
          <Rect x={xLadoMalo[0]} y={yLadoMalo[0]} width={xLadoMalo[1] - xLadoMalo[0]} height={yLadoMalo[1] - yLadoMalo[0]} fill={COLORS.red} opacity={0.07} />
          {xTicks.map((v, i) => (
            <Line key={`xg-${i}`} x1={toX(v)} y1={top} x2={toX(v)} y2={bottom} stroke={COLORS.border} strokeWidth={0.4} />
          ))}
          {yTicks.map((v, i) => (
            <Line key={`yg-${i}`} x1={left} y1={toY(v)} x2={right} y2={toY(v)} stroke={COLORS.border} strokeWidth={0.4} />
          ))}
          <Line x1={left} y1={bottom} x2={right} y2={bottom} stroke={COLORS.border} strokeWidth={1} />
          <Line x1={left} y1={top} x2={left} y2={bottom} stroke={COLORS.border} strokeWidth={1} />
          <Line x1={avgXpx} y1={top} x2={avgXpx} y2={bottom} stroke={COLORS.muted} strokeWidth={0.7} strokeDasharray="3 3" />
          <Line x1={left} y1={avgYpx} x2={right} y2={avgYpx} stroke={COLORS.muted} strokeWidth={0.7} strokeDasharray="3 3" />
        </Svg>
        {xTicks.map((v, i) => (
          <Text
            key={`xt-${i}`}
            style={{ position: "absolute", left: toX(v) - 16, top: bottom + 2, width: 32, textAlign: "center", fontSize: 5.6, color: COLORS.muted }}
          >
            {formatoEje(v)}
          </Text>
        ))}
        {yTicks.map((v, i) => (
          <Text
            key={`yt-${i}`}
            style={{ position: "absolute", left: 0, top: toY(v) - 3, width: padIzq - 4, textAlign: "right", fontSize: 5.6, color: COLORS.muted }}
          >
            {formatoEje(v)}
          </Text>
        ))}
        <Text style={{ position: "absolute", left: Math.min(avgXpx + 4, width - 60), top: 2, fontSize: 6, fontWeight: 700, color: COLORS.muted }}>
          PROMEDIO LIGA
        </Text>
        {resto.map((p, i) => {
          const left2 = toX(p.x) - SIZE_RESTO / 2;
          const top2 = toY(p.y) - SIZE_RESTO / 2;
          return p.escudoUrl ? (
            // eslint-disable-next-line jsx-a11y/alt-text -- react-pdf Image, no HTML img
            <Image key={i} src={p.escudoUrl} style={{ position: "absolute", left: left2, top: top2, width: SIZE_RESTO, height: SIZE_RESTO, opacity: 0.7 }} />
          ) : (
            <View
              key={i}
              style={{
                position: "absolute",
                left: left2,
                top: top2,
                width: SIZE_RESTO,
                height: SIZE_RESTO,
                borderRadius: SIZE_RESTO / 2,
                backgroundColor: COLORS.gray,
                opacity: 0.4,
              }}
            />
          );
        })}
        {destacados.map((p, i) => {
          const crestUrl = p.esNosotros ? nuestroCrestUrl : p.escudoUrl;
          const left2 = toX(p.x) - SIZE_DESTACADO / 2;
          const top2 = toY(p.y) - SIZE_DESTACADO / 2;
          return crestUrl ? (
            // eslint-disable-next-line jsx-a11y/alt-text -- react-pdf Image, no HTML img
            <Image key={i} src={crestUrl} style={{ position: "absolute", left: left2, top: top2, width: SIZE_DESTACADO, height: SIZE_DESTACADO }} />
          ) : (
            <View
              key={i}
              style={{
                position: "absolute",
                left: left2,
                top: top2,
                width: SIZE_DESTACADO,
                height: SIZE_DESTACADO,
                borderRadius: SIZE_DESTACADO / 2,
                backgroundColor: p.esNosotros ? COLORS.blue : COLORS.red,
              }}
            />
          );
        })}
      </View>
      <Text style={{ fontSize: 7, color: COLORS.muted, marginTop: 4, textAlign: "center" }}>
        Eje X: {plot.ejeXLabel} · Eje Y: {plot.ejeYLabel} · verde = por encima del promedio de liga en ambos ejes · rojo = por
        debajo en ambos
      </Text>
    </View>
  );
}

/** Una de las 2 gráficas de una página de comparación con la liga — más chica que antes para que entren dos por página. */
const SCATTER_MINI_W = 490;
const SCATTER_MINI_H = 250;

function ScatterMini({ plot, nuestroCrestUrl }: { plot: ScatterPlot; nuestroCrestUrl: string }) {
  return (
    <View style={{ marginBottom: 34, alignItems: "center" }} wrap={false}>
      <Text style={{ fontSize: 11.5, fontWeight: 700, color: COLORS.blueDark, marginBottom: 6, textAlign: "center" }}>{plot.titulo}</Text>
      <ScatterChart plot={plot} nuestroCrestUrl={nuestroCrestUrl} width={SCATTER_MINI_W} height={SCATTER_MINI_H} />
      <Text style={[styles.bodyText, { marginTop: 8, textAlign: "center", width: SCATTER_MINI_W }]}>{plot.interpretacion}</Text>
    </View>
  );
}

/** Página con 2 comparaciones contra la liga (mismo grupo temático) — rompe la monotonía de 1 sola gráfica repetida. */
function ScatterGrupoPage({ plots, nuestroCrestUrl }: { plots: ScatterPlot[]; nuestroCrestUrl: string }) {
  return (
    <View>
      <Text style={[styles.seccionTitulo, { textAlign: "center" }]}>Comparación contra la liga</Text>
      <Text style={[styles.seccionSub, { textAlign: "center", marginBottom: 20 }]}>
        Muestra de últimos 6 partidos por equipo — cada punto es un equipo de la competencia.
      </Text>
      <View style={{ alignItems: "center" }}>
        {plots.map((plot, i) => (
          <ScatterMini key={i} plot={plot} nuestroCrestUrl={nuestroCrestUrl} />
        ))}
      </View>
    </View>
  );
}

function iniciales(nombre: string): string {
  const partes = nombre.trim().split(/\s+/);
  return ((partes[0]?.[0] ?? "") + (partes[partes.length - 1]?.[0] ?? "")).toUpperCase();
}

function JugadorCard({ j }: { j: OpponentReportData["jugadoresClaveRival"][number] }) {
  return (
    <View style={styles.jugadorCard} wrap={false}>
      <View style={[styles.avatar, { backgroundColor: COLORS.blue }]}>
        <Text style={styles.avatarTexto}>{iniciales(j.nombre)}</Text>
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.jugadorNombre}>{j.nombreConocido ?? j.nombre}</Text>
        <Text style={styles.jugadorMeta}>
          {[j.posicion, j.edad !== null ? `${j.edad} años` : null, j.altura !== null ? `${j.altura} cm` : null, j.pieHabil]
            .filter(Boolean)
            .join(" · ") || "Datos no disponibles"}
        </Text>
        <View style={styles.jugadorStatsFila}>
          <Text style={styles.statPill}>{j.golesTemporada ?? j.golesMuestra} goles (temporada)</Text>
          <Text style={styles.statPill}>{j.asistenciasTemporada ?? j.asistenciasMuestra} asist. (temporada)</Text>
          {j.golesPor90 !== null && <Text style={styles.statPill}>{n(j.golesPor90)} goles/90 (temporada)</Text>}
          {j.xgPor90 !== null && <Text style={styles.statPill}>{n(j.xgPor90)} xG/90</Text>}
          {j.asistenciasPor90 !== null && <Text style={styles.statPill}>{n(j.asistenciasPor90)} asist./90</Text>}
          {j.obvPor90 !== null && <Text style={styles.statPill}>{n(j.obvPor90)} OBV/90</Text>}
          {j.progresionesPor90 !== null && <Text style={styles.statPill}>{n(j.progresionesPor90)} progresiones/90</Text>}
          {j.pressuresPor90 !== null && <Text style={styles.statPill}>{n(j.pressuresPor90)} presiones/90</Text>}
        </View>
        {(j.pasesHaciaTop.length > 0 || j.recibeDeTop.length > 0) && (
          <View style={styles.asociacionesBox}>
            {j.pasesHaciaTop.length > 0 && (
              <View style={styles.asociacionCol}>
                <Text style={styles.asociacionTitulo}>Le pasa más a</Text>
                {j.pasesHaciaTop.map((a, i) => (
                  <Text key={i} style={styles.asociacionTexto}>
                    {a.nombre} ({a.pases})
                  </Text>
                ))}
              </View>
            )}
            {j.recibeDeTop.length > 0 && (
              <View style={styles.asociacionCol}>
                <Text style={styles.asociacionTitulo}>Recibe más de</Text>
                {j.recibeDeTop.map((a, i) => (
                  <Text key={i} style={styles.asociacionTexto}>
                    {a.nombre} ({a.pases})
                  </Text>
                ))}
              </View>
            )}
          </View>
        )}
      </View>
    </View>
  );
}

/** Plantel completo del rival (Player Season Stats, temporada completa) — nombre, posición, altura, pie hábil y minutos. */
/**
 * Once probable: continuidad real (titularidades + minutos) en la muestra analizada, y los sistemas
 * tácticos que efectivamente usó el rival. No infiere convocatoria ni lesiones — solo cuenta apariciones
 * reales de StatsBomb Lineups v5.
 */
function OnceProbablePage({ data }: { data: OpponentReportData }) {
  return (
    <View>
      <Text style={styles.seccionTitulo}>Once probable — {data.rival.nombre}</Text>
      <Text style={styles.seccionSub}>
        Continuidad real en los {data.contexto.partidosUtilizadosRival} partidos de la muestra: titularidades y minutos jugados
        efectivos (StatsBomb Lineups). No infiere convocatoria ni disponibilidad — solo lo que ya ocurrió.
      </Text>
      <View style={styles.pasesTablaHeader}>
        <Text style={[styles.pasesTablaHeaderTxt, { flex: 2.2 }]}>Jugador</Text>
        <Text style={[styles.pasesTablaHeaderTxt, { flex: 1.4 }]}>Posición</Text>
        <Text style={[styles.pasesTablaHeaderTxt, { flex: 1.1, textAlign: "center" }]}>Titular</Text>
        <Text style={[styles.pasesTablaHeaderTxt, { flex: 1, textAlign: "center" }]}>Minutos</Text>
      </View>
      {data.onceProbableRival.slice(0, 14).map((j, i) => (
        <View key={j.playerId} style={[styles.pasesTablaFila, i % 2 === 1 ? styles.pasesTablaFilaPar : {}]} wrap={false}>
          <Text style={[styles.pasesTablaCelda, { flex: 2.2, fontWeight: 600 }]}>{j.nombre}</Text>
          <Text style={[styles.pasesTablaCelda, { flex: 1.4, color: COLORS.muted }]}>{j.posicion ?? "—"}</Text>
          <Text style={[styles.pasesTablaCeldaNum, { flex: 1.1 }]}>
            {j.titularidades} de {j.totalPartidosMuestra}
          </Text>
          <Text style={[styles.pasesTablaCeldaNum, { flex: 1 }]}>{j.minutosMuestra}</Text>
        </View>
      ))}

      <View style={[styles.sectionCard, { marginTop: 16 }]} wrap={false}>
        <View style={[styles.sectionHeader, { backgroundColor: COLORS.blueDark }]}>
          <Text style={styles.sectionHeaderTitle}>Sistemas utilizados</Text>
        </View>
        <View style={styles.sectionBody}>
          {data.sistemasUtilizadosRival.map((s) => (
            <Text key={s.formacionCodigo} style={[styles.bodyText, { marginBottom: 3 }]}>
              {formacionATexto(s.formacionCodigo)} — {s.partidosConEstaFormacion} de {s.totalPartidosConDatos} partidos (
              {Math.round((s.partidosConEstaFormacion / s.totalPartidosConDatos) * 100)}%)
            </Text>
          ))}
        </View>
      </View>
    </View>
  );
}

/** Mini gráfico de línea de una métrica real, partido a partido (no un promedio) — sirve para ver tendencia, no nivel absoluto. */
function rivalCorto(nombre: string): string {
  const primeraPalabra = nombre.trim().split(/\s+/)[0];
  return primeraPalabra.length > 9 ? `${primeraPalabra.slice(0, 8)}.` : primeraPalabra;
}

function SerieTemporalMiniChart({ serie }: { serie: TendenciaPartidoAPartido }) {
  const W = 250;
  const H = 92;
  const PAD_IZQ = 8;
  const PAD_DER = 8;
  const PAD_TOP = 14;
  const PAD_BOTTOM = 20;
  const puntos = serie.puntos.filter(
    (p): p is { matchId: number; fecha: string; rival: string; valor: number } => p.valor !== null,
  );

  return (
    <View style={{ width: W }} wrap={false}>
      <Text style={{ fontSize: 8.3, fontWeight: 700, color: COLORS.blueDark, marginBottom: 1 }}>{serie.name}</Text>
      <Text style={{ fontSize: 5.6, color: COLORS.muted, marginBottom: 3 }}>
        Eje X: partido (cronológico, izq. → der.) · Eje Y: {serie.unit}
      </Text>
      {puntos.length < 2 ? (
        <Text style={{ fontSize: 7.5, color: COLORS.muted }}>Datos insuficientes en la muestra para graficar evolución.</Text>
      ) : (
        (() => {
          const valores = puntos.map((p) => p.valor);
          const minV = Math.min(...valores);
          const maxV = Math.max(...valores);
          const rango = maxV - minV || 1;
          const toX = (i: number) => PAD_IZQ + (i / (puntos.length - 1)) * (W - PAD_IZQ - PAD_DER);
          const toY = (v: number) => H - PAD_BOTTOM - ((v - minV) / rango) * (H - PAD_TOP - PAD_BOTTOM);
          return (
            <>
              <Svg width={W} height={H} viewBox={`0 0 ${W} ${H}`}>
                <Line x1={PAD_IZQ} y1={H - PAD_BOTTOM} x2={W - PAD_DER} y2={H - PAD_BOTTOM} stroke={COLORS.border} strokeWidth={0.5} />
                {puntos.slice(0, -1).map((p, i) => (
                  <Line
                    key={i}
                    x1={toX(i)}
                    y1={toY(p.valor)}
                    x2={toX(i + 1)}
                    y2={toY(puntos[i + 1].valor)}
                    stroke={COLORS.blue}
                    strokeWidth={1.4}
                  />
                ))}
                {puntos.map((p, i) => (
                  <Circle key={i} cx={toX(i)} cy={toY(p.valor)} r={2.1} fill={COLORS.blue} />
                ))}
              </Svg>
              {puntos.map((p, i) => (
                <Text
                  key={i}
                  style={{
                    position: "absolute",
                    left: toX(i) - 17,
                    top: toY(p.valor) - 12,
                    width: 34,
                    textAlign: "center",
                    fontSize: 4.6,
                    fontWeight: 700,
                    color: COLORS.ink,
                  }}
                >
                  {n(p.valor, 1)}
                </Text>
              ))}
              {puntos.map((p, i) => (
                <Text
                  key={`r-${i}`}
                  style={{
                    position: "absolute",
                    left: toX(i) - 17,
                    top: H - PAD_BOTTOM + 3,
                    width: 34,
                    textAlign: "center",
                    fontSize: 4.4,
                    color: COLORS.muted,
                  }}
                >
                  vs. {rivalCorto(p.rival)}
                </Text>
              ))}
            </>
          );
        })()
      )}
    </View>
  );
}

function TendenciaPartidoPage({ data }: { data: OpponentReportData }) {
  return (
    <View>
      <Text style={styles.seccionTitulo}>Tendencia partido a partido — {data.rival.nombre}</Text>
      <Text style={styles.seccionSub}>
        Evolución real de cada métrica en los {data.contexto.partidosUtilizadosRival} partidos de la muestra, de más antiguo a
        más reciente (no un promedio) — sirve para ver si el rival viene mejorando, empeorando o estable en cada aspecto.
      </Text>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 16, marginTop: 10 }}>
        {data.tendenciasPartidoRival.map((serie) => (
          <SerieTemporalMiniChart key={serie.id} serie={serie} />
        ))}
      </View>
    </View>
  );
}

/** Inicios del arquero: distribución real (corta/media/larga por longitud de pase), receptores y zonas de destino. */
function IniciosArqueroPage({ data }: { data: OpponentReportData }) {
  const info = data.iniciosArqueroRival;
  if (!info) return null;
  const maxConteo = Math.max(1, ...info.zonasDestino.map((z) => z.conteo));
  return (
    <View>
      <Text style={styles.seccionTitulo}>Inicios del arquero — {data.rival.nombre}</Text>
      <Text style={styles.seccionSub}>
        Distribución real de los pases del arquero (StatsBomb Events): corta &lt;15y, media 15-32y, larga &gt;32y. Zonas de
        destino y receptores más frecuentes.
      </Text>
      <View style={{ flexDirection: "row", gap: 12, marginTop: 10 }}>
        {info.distribucion.map((d) => (
          <View key={d.zona} style={{ flex: 1, alignItems: "center", padding: 12, backgroundColor: COLORS.grayTint, borderRadius: 7 }}>
            <Text style={{ fontSize: 20, fontWeight: 700, color: COLORS.blue }}>{d.porcentaje}%</Text>
            <Text style={{ fontSize: 7.5, color: COLORS.muted, textTransform: "capitalize" }}>
              {d.zona} ({d.cantidad})
            </Text>
          </View>
        ))}
      </View>

      <View style={{ marginTop: 16, alignItems: "center" }}>
        <Text style={{ fontSize: 9.5, fontWeight: 700, color: COLORS.blueDark, marginBottom: 6 }}>Zonas de destino reales</Text>
        <ZoneGridPitch
          filas={3}
          columnas={3}
          colorBase={COLORS.blue}
          direccionAtaque={`${data.rival.nombre} ataca hacia nuestro arco`}
          intensidad={(f, c) => (info.zonasDestino.find((z) => z.fila === f && z.columna === c)?.conteo ?? 0) / maxConteo}
          etiqueta={(f, c) => {
            const z = info.zonasDestino.find((zz) => zz.fila === f && zz.columna === c);
            return z && z.conteo > 0 ? `${z.conteo} (${z.porcentaje}%)` : "—";
          }}
        />
      </View>

      {info.receptoresTop.length > 0 && (
        <View style={{ marginTop: 16 }}>
          <Text style={{ fontSize: 10.5, fontWeight: 700, color: COLORS.blueDark, marginBottom: 6 }}>Receptores más frecuentes</Text>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
            {info.receptoresTop.map((r) => (
              <Text key={r.nombre} style={styles.statPillGrande}>
                {r.nombre} ({r.recepciones})
              </Text>
            ))}
          </View>
        </View>
      )}
      <FlechasSaqueArquero data={data} info={info} />
      <PerdidasEnInicioBloque data={data} />
    </View>
  );
}

const FLECHAS_PITCH_W = 380;
const FLECHAS_PITCH_H = 253;

/** Triángulo (punta de flecha) real hacia el destino, orientado según el ángulo real origen→destino. */
function puntosFlecha(origX: number, origY: number, destX: number, destY: number, largo = 8, spread = 0.4): string {
  const angulo = Math.atan2(destY - origY, destX - origX);
  const izq: [number, number] = [destX - largo * Math.cos(angulo - spread), destY - largo * Math.sin(angulo - spread)];
  const der: [number, number] = [destX - largo * Math.cos(angulo + spread), destY - largo * Math.sin(angulo + spread)];
  return `${destX},${destY} ${izq[0]},${izq[1]} ${der[0]},${der[1]}`;
}

/**
 * Flechas reales desde la posición promedio de saque del arquero hacia cada zona destino (mismo campograma de
 * "zonasDestino" ya calculado, solo que en forma de flecha en vez de heatmap) — pedido explícito del usuario.
 */
/**
 * Cada flecha es un pase real del arquero (origen y destino reales, `pass.end_location`) — no una zona agregada.
 * Opacidad baja por flecha para que la densidad real se note donde se superponen muchas (pedido explícito del
 * usuario: quería ver los saques reales, no un resumen por zona). Cancha dibujada completa (mitad + círculo
 * central), no un rectángulo liso, para que se entienda la orientación.
 */
function FlechasSaqueArquero({ data, info }: { data: OpponentReportData; info: IniciosArquero }) {
  if (info.pases.length === 0) return null;
  const escalaX = FLECHAS_PITCH_W / 120;
  const escalaY = FLECHAS_PITCH_H / 80;
  return (
    // wrap={false}: el título quedaba solo al final de una página y el dibujo se iba a la siguiente (bug real
    // reportado) — ahora el bloque entero salta junto a la próxima página si no entra.
    <View style={{ marginTop: 18, alignItems: "center" }} wrap={false}>
      <Text style={{ fontSize: 10.5, fontWeight: 700, color: COLORS.blueDark, marginBottom: 3 }}>
        Dirección real de los saques — {data.rival.nombre}
      </Text>
      <Text style={[styles.bodyText, { color: COLORS.muted, marginBottom: 8, textAlign: "center" }]}>
        Cada flecha es un pase real del arquero, de su ubicación real de origen a su destino real ({info.pases.length} pases con
        ambos datos) — no un resumen por zona.
      </Text>
      <Svg width={FLECHAS_PITCH_W} height={FLECHAS_PITCH_H} viewBox={`0 0 ${FLECHAS_PITCH_W} ${FLECHAS_PITCH_H}`}>
        <Rect x={0} y={0} width={FLECHAS_PITCH_W} height={FLECHAS_PITCH_H} fill="#eef3ee" stroke={COLORS.border} strokeWidth={1} />
        <Line x1={FLECHAS_PITCH_W / 2} y1={0} x2={FLECHAS_PITCH_W / 2} y2={FLECHAS_PITCH_H} stroke={COLORS.border} strokeWidth={1} />
        <Circle cx={FLECHAS_PITCH_W / 2} cy={FLECHAS_PITCH_H / 2} r={22} stroke={COLORS.border} strokeWidth={1} fill="none" />
        {info.pases.map((p, i) => {
          const origX = p.origen[0] * escalaX;
          const origY = p.origen[1] * escalaY;
          const destX = p.destino[0] * escalaX;
          const destY = p.destino[1] * escalaY;
          return (
            <Fragment key={i}>
              <Line x1={origX} y1={origY} x2={destX} y2={destY} stroke={COLORS.blue} strokeWidth={1} strokeOpacity={0.28} />
              <Polygon points={puntosFlecha(origX, origY, destX, destY, 5)} fill={COLORS.blue} fillOpacity={0.4} />
            </Fragment>
          );
        })}
        {info.origenPromedio && (
          <Circle cx={info.origenPromedio[0] * escalaX} cy={info.origenPromedio[1] * escalaY} r={5} fill={COLORS.blueDark} />
        )}
      </Svg>
    </View>
  );
}

/** "¿Dónde pierden más pelotas en los inicios?" — Dispossessed/Miscontrol reales en el propio tercio defensivo. */
function PerdidasEnInicioBloque({ data }: { data: OpponentReportData }) {
  const info = data.perdidasEnInicioRival;
  if (!info) return null;
  const maxConteo = Math.max(1, ...info.campograma.map((z) => z.conteo));
  return (
    <View style={{ marginTop: 18 }}>
      <Text style={{ fontSize: 10.5, fontWeight: 700, color: COLORS.blueDark, marginBottom: 3 }}>
        Pérdidas en los inicios — {data.rival.nombre}
      </Text>
      <Text style={[styles.bodyText, { color: COLORS.muted, marginBottom: 8 }]}>
        {info.total} pérdidas de balón reales (Dispossessed/Miscontrol) del rival en su propio tercio defensivo — zona de
        salida/construcción, no toda la cancha.
      </Text>
      <View style={{ alignItems: "center" }}>
        <ZoneGridPitch
          filas={3}
          columnas={3}
          colorBase={COLORS.red}
          direccionAtaque={`${data.rival.nombre} ataca hacia nuestro arco`}
          intensidad={(f, c) => (info.campograma.find((z) => z.fila === f && z.columna === c)?.conteo ?? 0) / maxConteo}
          etiqueta={(f, c) => {
            const z = info.campograma.find((zz) => zz.fila === f && zz.columna === c);
            return z && z.conteo > 0 ? `${z.conteo} (${z.porcentaje}%)` : "—";
          }}
        />
      </View>
    </View>
  );
}

/** Mapa real de presiones + aproximación de eficacia (presión seguida de recuperación real, no un campo StatsBomb). */
function PresionPage({ data }: { data: OpponentReportData }) {
  const info = data.mapaPresionRival;
  if (!info) return null;
  const maxConteo = Math.max(1, ...info.campograma.map((z) => z.conteo));
  return (
    <View>
      <Text style={styles.seccionTitulo}>Presión — {data.rival.nombre}</Text>
      <Text style={styles.seccionSub}>
        {info.totalPresiones} presiones reales (StatsBomb Events) en la muestra. StatsBomb no marca un resultado en el evento
        de presión en sí; se considera efectiva la que fue seguida, dentro de los 5 segundos siguientes, por una recuperación
        real del mismo equipo (Ball Recovery o Interception ganada).
      </Text>
      <View style={{ alignItems: "center", marginTop: 10 }}>
        <View style={{ marginBottom: 10, alignItems: "center" }}>
          <Text style={{ fontSize: 24, fontWeight: 700, color: COLORS.blue }}>{info.presionesConRecuperacionPct}%</Text>
          <Text style={{ fontSize: 7.5, color: COLORS.muted }}>de las presiones terminó en recuperación real dentro de los 5s</Text>
        </View>
        <ZoneGridPitch
          filas={3}
          columnas={3}
          colorBase={COLORS.red}
          direccionAtaque={`${data.rival.nombre} presiona hacia nuestro arco`}
          intensidad={(f, c) => (info.campograma.find((z) => z.fila === f && z.columna === c)?.conteo ?? 0) / maxConteo}
          etiqueta={(f, c) => {
            const z = info.campograma.find((zz) => zz.fila === f && zz.columna === c);
            return z && z.conteo > 0 ? `${z.conteo} (${z.porcentaje}%)` : "—";
          }}
        />
      </View>
      {data.recuperacionesCampoRivalRival.porJugador.length > 0 && (
        <View style={{ marginTop: 16 }}>
          <Text style={{ fontSize: 9.5, fontWeight: 700, color: COLORS.blueDark, marginBottom: 4 }}>
            Jugadores con más recuperaciones en campo rival ({data.recuperacionesCampoRivalRival.totalCampoRival} en total)
          </Text>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
            {data.recuperacionesCampoRivalRival.porJugador.map((j) => (
              <Text key={j.playerId} style={styles.statPill}>
                {j.nombre} ({j.recuperaciones})
              </Text>
            ))}
          </View>
        </View>
      )}
    </View>
  );
}

const CARD_PITCH_W = 380;
const CARD_PITCH_H = 253; // 380 * 80/120, proporción real de la cancha StatsBomb (120x80)
const COLOR_TARJETA_AMARILLA = "#eab308";

const COLOR_FALTA_SIN_TARJETA = COLORS.gray;

/**
 * Campograma real de las faltas: cada punto es una falta real, ubicada en la zona real donde ocurrió (StatsBomb
 * Foul Committed) — gris si no terminó en tarjeta, amarillo/rojo si sí. Mismos datos que la lista de "Disciplina
 * contextualizada" (más abajo en el informe) más las faltas sin tarjeta, solo que acá en formato visual. Pedido
 * explícito del usuario: mostrar también las faltas que no terminaron en amarilla, no solo las amonestadas.
 */
function TarjetasEnCancha({ data }: { data: OpponentReportData }) {
  const conUbicacion = data.disciplinaContextualizadaRival.filter(
    (f): f is typeof f & { location: [number, number] } => f.location !== null,
  );
  const faltasSinTarjetaConUbicacion = data.faltasSinTarjetaRival.filter(
    (f): f is typeof f & { location: [number, number] } => f.location !== null,
  );
  if (conUbicacion.length === 0 && faltasSinTarjetaConUbicacion.length === 0) return null;
  const escalaX = CARD_PITCH_W / 120;
  const escalaY = CARD_PITCH_H / 80;
  const sinUbicacion = data.disciplinaContextualizadaRival.length - conUbicacion.length;
  return (
    <View style={{ marginTop: 18 }}>
      <Text style={{ fontSize: 12, fontWeight: 700, color: COLORS.blueDark, marginBottom: 3 }}>
        Zona de las faltas — {data.rival.nombre}
      </Text>
      <Text style={[styles.bodyText, { color: COLORS.muted, marginBottom: 8 }]}>
        {conUbicacion.length} tarjetas reales y {faltasSinTarjetaConUbicacion.length} faltas reales sin tarjeta, con ubicación real
        (StatsBomb Foul Committed){sinUbicacion > 0 ? ` — ${sinUbicacion} tarjeta(s) sin falta asociada (ej. protesta) están en la tabla de abajo` : ""}.
        Gris = falta sin tarjeta, amarillo = tarjeta amarilla, rojo = tarjeta roja. El número es el dorsal real del jugador.
      </Text>
      <View style={{ alignItems: "center" }}>
        <View style={{ position: "relative", width: CARD_PITCH_W, height: CARD_PITCH_H }}>
          <Svg width={CARD_PITCH_W} height={CARD_PITCH_H} viewBox={`0 0 ${CARD_PITCH_W} ${CARD_PITCH_H}`}>
            <Rect x={0} y={0} width={CARD_PITCH_W} height={CARD_PITCH_H} fill="#eef3ee" stroke={COLORS.border} strokeWidth={1} />
            <Line x1={CARD_PITCH_W / 2} y1={0} x2={CARD_PITCH_W / 2} y2={CARD_PITCH_H} stroke={COLORS.border} strokeWidth={1} />
            <Circle cx={CARD_PITCH_W / 2} cy={CARD_PITCH_H / 2} r={22} stroke={COLORS.border} strokeWidth={1} fill="none" />
            {/* Faltas sin tarjeta primero, para que las tarjetas (más relevantes) queden siempre visibles encima. */}
            {faltasSinTarjetaConUbicacion.map((f, i) => (
              <Circle
                key={`s${i}`}
                cx={f.location[0] * escalaX}
                cy={f.location[1] * escalaY}
                r={7}
                fill={COLOR_FALTA_SIN_TARJETA}
                fillOpacity={0.55}
                stroke={COLORS.ink}
                strokeWidth={0.5}
                strokeOpacity={0.25}
              />
            ))}
            {conUbicacion.map((f, i) => (
              <Circle
                key={i}
                cx={f.location[0] * escalaX}
                cy={f.location[1] * escalaY}
                r={9}
                fill={f.tarjeta.toLowerCase().includes("red") ? COLORS.red : COLOR_TARJETA_AMARILLA}
                stroke={COLORS.ink}
                strokeWidth={0.6}
                strokeOpacity={0.35}
              />
            ))}
          </Svg>
          {conUbicacion.map((f, i) => (
            <Text
              key={i}
              style={{
                position: "absolute",
                left: f.location[0] * escalaX - 9,
                top: f.location[1] * escalaY - 4.5,
                width: 18,
                textAlign: "center",
                fontSize: 6.5,
                fontWeight: 700,
                color: f.tarjeta.toLowerCase().includes("red") ? "#ffffff" : COLORS.ink,
              }}
            >
              {f.dorsal ?? ""}
            </Text>
          ))}
        </View>
      </View>
      <View style={{ flexDirection: "row", gap: 14, marginTop: 8, justifyContent: "center" }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
          <View style={{ width: 9, height: 9, borderRadius: 5, backgroundColor: COLOR_FALTA_SIN_TARJETA }} />
          <Text style={{ fontSize: 7, color: COLORS.muted }}>Falta sin tarjeta</Text>
        </View>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
          <View style={{ width: 9, height: 9, borderRadius: 5, backgroundColor: COLOR_TARJETA_AMARILLA }} />
          <Text style={{ fontSize: 7, color: COLORS.muted }}>Amarilla</Text>
        </View>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
          <View style={{ width: 9, height: 9, borderRadius: 5, backgroundColor: COLORS.red }} />
          <Text style={{ fontSize: 7, color: COLORS.muted }}>Roja</Text>
        </View>
      </View>
    </View>
  );
}

function PlantelCompletoPage({ data }: { data: OpponentReportData }) {
  return (
    <View>
      <Text style={styles.seccionTitulo}>Plantel completo — {data.rival.nombre}</Text>
      <Text style={styles.seccionSub}>
        Todos los jugadores con datos de StatsBomb, ordenados por minutos jugados en los {data.contexto.partidosUtilizadosRival}{" "}
        partidos de la muestra analizada (no la temporada completa).
      </Text>
      <View style={styles.pasesTablaHeader}>
        <Text style={[styles.pasesTablaHeaderTxt, { flex: 0.5, textAlign: "center" }]}>#</Text>
        <Text style={[styles.pasesTablaHeaderTxt, { flex: 2.2 }]}>Jugador</Text>
        <Text style={[styles.pasesTablaHeaderTxt, { flex: 1.4 }]}>Posición</Text>
        <Text style={[styles.pasesTablaHeaderTxt, { flex: 0.7, textAlign: "center" }]}>Edad</Text>
        <Text style={[styles.pasesTablaHeaderTxt, { flex: 0.8, textAlign: "center" }]}>Altura</Text>
        <Text style={[styles.pasesTablaHeaderTxt, { flex: 1, textAlign: "center" }]}>Pie hábil</Text>
        <Text style={[styles.pasesTablaHeaderTxt, { flex: 1, textAlign: "center" }]}>Minutos (muestra)</Text>
      </View>
      {data.plantelCompletoRival.map((j, i) => (
        <View key={j.playerId} style={[styles.pasesTablaFila, i % 2 === 1 ? styles.pasesTablaFilaPar : {}]} wrap={false}>
          <Text style={[styles.pasesTablaCeldaNum, { flex: 0.5, fontWeight: 700, color: COLORS.blueDark }]}>{j.dorsal ?? "—"}</Text>
          <Text style={[styles.pasesTablaCelda, { flex: 2.2, fontWeight: 600 }]}>{j.nombreConocido ?? j.nombre}</Text>
          <Text style={[styles.pasesTablaCelda, { flex: 1.4, color: COLORS.muted }]}>{j.posicion ?? "—"}</Text>
          <Text style={[styles.pasesTablaCeldaNum, { flex: 0.7 }]}>{j.edad ?? "—"}</Text>
          <Text style={[styles.pasesTablaCeldaNum, { flex: 0.8 }]}>{j.altura !== null ? `${j.altura} cm` : "—"}</Text>
          <Text style={[styles.pasesTablaCeldaNum, { flex: 1 }]}>{j.pieHabil ?? "—"}</Text>
          <Text style={[styles.pasesTablaCeldaNum, { flex: 1 }]}>{j.minutosMuestra}</Text>
        </View>
      ))}
    </View>
  );
}

/** Verde = entre los que más tienen de esa métrica en la tabla real, rojo = entre los que menos, gris = en el medio.
 * Umbrales por terciles reales de la propia plantilla (no un corte inventado). */
function colorPorRankEnPlantilla(valor: number | null, todos: (number | null)[]): string {
  if (valor === null) return COLORS.muted;
  const validos = todos.filter((v): v is number => v !== null).sort((a, b) => a - b);
  if (validos.length < 3) return COLORS.ink;
  const p33 = validos[Math.floor(validos.length * 0.33)];
  const p67 = validos[Math.floor(validos.length * 0.67)];
  if (valor >= p67) return COLORS.green;
  if (valor <= p33) return COLORS.red;
  return COLORS.ink;
}

function PlantillaPasesPage({ data }: { data: OpponentReportData }) {
  const pasesValores = data.plantillaPasesRival.map((j) => j.pasesPor90);
  const claveValores = data.plantillaPasesRival.map((j) => j.keyPassesPor90);
  // "Más peligrosos" = top 3 reales por pases clave/90 (Player Season Stats) — se resalta la fila entera para
  // previsualizar de un vistazo a quién vigilar, sin tener que leer columna por columna (pedido del usuario).
  const top3PeligrososIds = new Set(
    [...data.plantillaPasesRival]
      .filter((j) => j.keyPassesPor90 !== null && j.keyPassesPor90 > 0)
      .sort((a, b) => (b.keyPassesPor90 ?? 0) - (a.keyPassesPor90 ?? 0))
      .slice(0, 3)
      .map((j) => j.playerId),
  );
  return (
    <View>
      <Text style={styles.seccionTitulo}>Cuadro de pases — plantilla completa</Text>
      <Text style={styles.seccionSub}>
        Todos los jugadores de {data.rival.nombre} que sumaron minutos en la muestra analizada (no solo goleadores/asistidores).
        Métricas de temporada completa de StatsBomb — más robustas que la muestra de 6 partidos. Verde = entre los que más
        tienen de esa columna en esta plantilla, rojo = entre los que menos. Fila resaltada = top 3 en pases clave/90, los más
        peligrosos para generar ocasiones.
      </Text>
      <View style={styles.pasesTablaHeader}>
        <Text style={[styles.pasesTablaHeaderTxt, { flex: 2 }]}>Jugador</Text>
        <Text style={[styles.pasesTablaHeaderTxt, { flex: 1.3 }]}>Posición</Text>
        <Text style={[styles.pasesTablaHeaderTxt, { flex: 0.9, textAlign: "center" }]}>Pases/90</Text>
        <Text style={[styles.pasesTablaHeaderTxt, { flex: 0.9, textAlign: "center" }]}>Precisión</Text>
        <Text style={[styles.pasesTablaHeaderTxt, { flex: 1, textAlign: "center" }]}>Progr./90</Text>
        <Text style={[styles.pasesTablaHeaderTxt, { flex: 0.9, textAlign: "center" }]}>Clave/90</Text>
      </View>
      {data.plantillaPasesRival.map((j, i) => {
        const peligroso = top3PeligrososIds.has(j.playerId);
        return (
          <View
            key={j.playerId}
            style={[
              styles.pasesTablaFila,
              i % 2 === 1 ? styles.pasesTablaFilaPar : {},
              peligroso ? { backgroundColor: COLORS.amberTint, borderLeft: `2 solid ${COLORS.amber}` } : {},
            ]}
            wrap={false}
          >
            <Text style={[styles.pasesTablaCelda, { flex: 2, fontWeight: peligroso ? 700 : 600 }]}>
              {j.nombreConocido ?? j.nombre}
              {peligroso ? " ⚠" : ""}
            </Text>
            <Text style={[styles.pasesTablaCelda, { flex: 1.3, color: COLORS.muted }]}>{j.posicion ?? "—"}</Text>
            <Text style={[styles.pasesTablaCeldaNum, { flex: 0.9, color: colorPorRankEnPlantilla(j.pasesPor90, pasesValores), fontWeight: 700 }]}>
              {n(j.pasesPor90, 1)}
            </Text>
            <Text style={[styles.pasesTablaCeldaNum, { flex: 0.9 }]}>{j.precisionPase !== null ? `${n(j.precisionPase, 0)}%` : "—"}</Text>
            <Text style={[styles.pasesTablaCeldaNum, { flex: 1 }]}>{n(j.pasesProgresivosPor90, 1)}</Text>
            <Text style={[styles.pasesTablaCeldaNum, { flex: 0.9, color: colorPorRankEnPlantilla(j.keyPassesPor90, claveValores), fontWeight: 700 }]}>
              {n(j.keyPassesPor90, 1)}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

export function OpponentReportPdfDocument({
  data,
  nuestroCrestUrl,
  notasTacticas,
  notasTacticasImagenes,
  notasTacticasLinks,
}: {
  data: OpponentReportData;
  nuestroCrestUrl: string;
  /** Notas manuales del cuerpo técnico, opcionales — si no se pasan, el informe se genera igual sin esas secciones. */
  notasTacticas?: NotasTacticas;
  /** Imágenes opcionales (una o varias) por nota, se muestran debajo del texto de esa nota. */
  notasTacticasImagenes?: NotasTacticasImagenes;
  /** Enlaces a video opcionales (uno o varios) por nota — se muestran como tarjeta clickeable (escudo del rival + nombre de la nota). */
  notasTacticasLinks?: NotasTacticasLinks;
}) {
  registerPdfFonts();
  const fechaGenerado = new Date(data.generadoEn).toLocaleDateString("es-UY", { day: "2-digit", month: "long", year: "numeric" });

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.caratula}>
          <View style={styles.escudosFila}>
            {/* eslint-disable-next-line jsx-a11y/alt-text -- react-pdf Image, no HTML img */}
            <Image src={nuestroCrestUrl} style={styles.crest} />
            <Text style={styles.vsTexto}>VS</Text>
            {data.rival.escudoUrl ? (
              // eslint-disable-next-line jsx-a11y/alt-text -- react-pdf Image, no HTML img
              <Image src={data.rival.escudoUrl} style={styles.crest} />
            ) : (
              <View style={[styles.crest, { alignItems: "center", justifyContent: "center", borderRadius: 30, backgroundColor: COLORS.grayTint }]}>
                <Text style={{ fontSize: 7, color: COLORS.muted, textAlign: "center" }}>Sin escudo</Text>
              </View>
            )}
          </View>
          <Text style={styles.clubName}>Cuerpo Técnico · {data.nuestroEquipo.nombre}</Text>
          <Text style={styles.tituloDoc}>Informe Completo de Rival</Text>
          <Text style={styles.rivalNombre}>{data.rival.nombre}</Text>
          {data.proximoPartido && (
            <Text style={styles.metaBadge}>
              Próximo partido: {data.proximoPartido.fecha} ({data.proximoPartido.condicion === "local" ? "de local" : "de visitante"})
            </Text>
          )}
          <Text style={styles.metaLinea}>
            {data.contexto.competicion} — {data.contexto.temporada} · Muestra: últimos {data.contexto.partidosUtilizadosRival} partidos
            de {data.rival.nombre}
          </Text>
          <Text style={styles.metaLinea}>Generado el {fechaGenerado} · Fuente: StatsBomb</Text>
        </View>

        <Text style={[styles.seccionTitulo, { fontSize: 11, marginTop: 4, marginBottom: 2 }]}>Partidos utilizados en el análisis</Text>
        <Text style={[styles.seccionSub, { marginBottom: 6 }]}>
          Resultado de {data.rival.nombre}: verde = ganó, amarillo = empató, rojo = perdió.
        </Text>
        {data.muestraRival.map((p) => (
          <View key={p.matchId} style={styles.partidoCard}>
            {p.escudoRivalUrl && (
              // eslint-disable-next-line jsx-a11y/alt-text -- react-pdf Image, no HTML img
              <Image src={p.escudoRivalUrl} style={styles.partidoEscudo} />
            )}
            <Text style={styles.partidoTextoChico}>
              {p.condicion === "visitante" ? `${p.rival} vs. ${data.rival.nombre}` : `${data.rival.nombre} vs. ${p.rival}`} — {p.fecha}
            </Text>
            {p.golesFavor !== null && p.golesContra !== null && (
              <Text style={[styles.resultadoChico, colorResultado(p.golesFavor, p.golesContra) ?? {}]}>
                {p.golesFavor}-{p.golesContra}
              </Text>
            )}
          </View>
        ))}

        <View style={styles.firma}>
          <Text style={styles.firmaTitulo}>Cuerpo Técnico Jorge Bava</Text>
          <Text style={styles.firmaSub}>Analista de Rendimiento: Gastón Lucas Torres</Text>
        </View>
        <Footer nombre={data.nuestroEquipo.nombre} />
      </Page>

      <Page size="A4" style={styles.page}>
        <Text style={styles.seccionTitulo}>Contexto del partido</Text>
        <Text style={styles.seccionSub}>Alcance, muestra y calidad de los datos utilizados en este informe.</Text>
        <View style={styles.contextoGrid}>
          {[
            { label: "Competición", valor: data.contexto.competicion },
            { label: "Temporada", valor: data.contexto.temporada },
            { label: "Condición próximo partido", valor: data.proximoPartido?.condicion === "visitante" ? "Visitante" : "Local" },
            { label: "Partidos analizados (rival)", valor: String(data.contexto.partidosUtilizadosRival) },
            { label: "Partidos analizados (nosotros)", valor: String(data.contexto.partidosUtilizadosNuestro) },
            { label: "Minutos analizados (aprox.)", valor: `${data.contexto.minutosAnalizadosAprox}'` },
            { label: "Calidad de los datos", valor: data.contexto.calidadDatos.toUpperCase() },
            { label: "Fuente", valor: "StatsBomb (datos reales)" },
            { label: "Generado", valor: fechaGenerado },
          ].map((it) => (
            <View key={it.label} style={styles.contextoItem}>
              <Text style={styles.contextoLabel}>{it.label}</Text>
              <Text style={styles.contextoValor}>{it.valor}</Text>
            </View>
          ))}
        </View>
        {data.contexto.advertencias.length > 0 && (
          <View style={styles.sectionCard}>
            <View style={[styles.sectionHeader, { backgroundColor: COLORS.amber }]}>
              <Text style={styles.sectionHeaderTitle}>Advertencias metodológicas</Text>
            </View>
            <View style={styles.sectionBody}>
              {data.contexto.advertencias.map((a, i) => (
                <Text key={i} style={[styles.bodyText, { marginBottom: 3 }]}>
                  ⚠ {a}
                </Text>
              ))}
            </View>
          </View>
        )}
        <Footer nombre={data.nuestroEquipo.nombre} />
      </Page>

      {data.alineacionesProbablesRival.length > 0 && (
        <Page size="A4" style={styles.page}>
          <AlineacionesProbablesAmbosPage data={data} />
          <Footer nombre={data.nuestroEquipo.nombre} />
        </Page>
      )}

      {data.plantelCompletoRival.length > 0 && (
        <Page size="A4" style={styles.page} wrap>
          <PlantelCompletoPage data={data} />
          <Footer nombre={data.nuestroEquipo.nombre} />
        </Page>
      )}

      {data.radar.length >= 3 && (
        <Page size="A4" style={styles.page}>
          <Text style={styles.seccionTitulo}>Radar comparativo</Text>
          <Text style={styles.seccionSub}>
            Percentil contra la liga en {data.radar.length} indicadores clave (orientados para que más área = mejor
            rendimiento). Los valores reales están en la tabla debajo.
          </Text>
          <RadarChart puntos={data.radar} nuestroNombre={data.nuestroEquipo.nombre} rivalNombre={data.rival.nombre} />
          <RadarTable puntos={data.radar} nuestroNombre={data.nuestroEquipo.nombre} rivalNombre={data.rival.nombre} />
          <Footer nombre={data.nuestroEquipo.nombre} />
        </Page>
      )}

      {data.tendenciasPartidoRival.length > 0 && (
        <Page size="A4" style={styles.page} wrap>
          <TendenciaPartidoPage data={data} />
          <Footer nombre={data.nuestroEquipo.nombre} />
        </Page>
      )}

      {FASES.map((fase, i) => {
        const ocultas = OCULTAS_POR_FASE[fase.id] ?? [];
        const metricasFase = data.metricas.filter((m) => m.fase === fase.id && !ocultas.includes(m.id));
        if (metricasFase.length === 0) return null;
        const scattersFase = data.scatterPlots.filter((p) => FASE_POR_SCATTER[p.titulo] === fase.id);
        return (
          <Fragment key={fase.id}>
            <DividerPage numero={`Bloque ${i + 1} de ${FASES.length}`} titulo={fase.titulo} subtitulo={fase.subtitulo} color={fase.color} />
            <Page size="A4" style={styles.page} wrap>
              <FasePagina
                titulo={fase.titulo}
                color={fase.color}
                metricas={metricasFase}
                subtitulo={`Comparación ${data.nuestroEquipo.nombre} vs. ${data.rival.nombre} — promedio por partido sobre la muestra. "Liga" = promedio de la competencia, "p" = percentil del rival.`}
                nuestroNombre={data.nuestroEquipo.nombre}
                rivalNombre={data.rival.nombre}
                destacadasIds={DESTACADAS_POR_FASE[fase.id]}
              />
              {fase.id === "transiciones" && <TransicionesExtra data={data} />}
              {fase.id === "balon_parado" && <BalonParadoExtra data={data} />}
              {fase.id === "disciplina" && <TarjetasEnCancha data={data} />}
              {(fase.id === "identidad" || fase.id === "ofensiva" || fase.id === "defensiva" || fase.id === "transiciones") && (
                <NotasTacticasBloque
                  fase={fase.id}
                  notas={notasTacticas}
                  imagenes={notasTacticasImagenes}
                  links={notasTacticasLinks}
                  escudoRivalUrl={data.rival.escudoUrl}
                />
              )}
              <Footer nombre={data.nuestroEquipo.nombre} />
            </Page>
            {enParesDe2(scattersFase).map((par, j) => (
              <Page key={j} size="A4" style={styles.page} wrap>
                <ScatterGrupoPage plots={par} nuestroCrestUrl={nuestroCrestUrl} />
                <Footer nombre={data.nuestroEquipo.nombre} />
              </Page>
            ))}
          </Fragment>
        );
      })}

      {data.iniciosArqueroRival && (
        <Page size="A4" style={styles.page}>
          <IniciosArqueroPage data={data} />
          <Footer nombre={data.nuestroEquipo.nombre} />
        </Page>
      )}

      {data.mapaPresionRival && (
        <Page size="A4" style={styles.page}>
          <PresionPage data={data} />
          <Footer nombre={data.nuestroEquipo.nombre} />
        </Page>
      )}

      <Page size="A4" style={styles.page}>
        <ShotMapPage data={data} />
        <Footer nombre={data.nuestroEquipo.nombre} />
      </Page>

      <Page size="A4" style={styles.page} wrap>
        <PasesClavePage data={data} />
        <Footer nombre={data.nuestroEquipo.nombre} />
      </Page>

      {data.passNetworkRival.nodes.length > 0 && (
        <Page size="A4" orientation="landscape" style={styles.page}>
          <Text style={styles.seccionTitulo}>Matriz de pases — {data.rival.nombre}</Text>
          <Text style={styles.seccionSub}>
            Pases completados de cada jugador (fila) hacia cada jugador (columna) en la muestra — los {data.passNetworkRival.nodes.length} jugadores que completaron pases. Verde más intenso = conexión más frecuente.
          </Text>
          <PassMatrixTable red={data.passNetworkRival} />
          <Footer nombre={data.nuestroEquipo.nombre} />
        </Page>
      )}

      {data.estructurasRecientesRival.length > 0 && (
        <Page size="A4" style={styles.page} wrap>
          <EstructuraPage data={data} />
          <Footer nombre={data.nuestroEquipo.nombre} />
        </Page>
      )}

      {data.onceProbableRival.length > 0 && (
        <Page size="A4" style={styles.page} wrap>
          <OnceProbablePage data={data} />
          <Footer nombre={data.nuestroEquipo.nombre} />
        </Page>
      )}

      {(data.golesPorFranjaRival.some((f) => f.golesFavor > 0 || f.golesContra > 0) || data.patronSustitucionesRival) && (
        <Page size="A4" style={styles.page}>
          <DinamicaPartidoPage data={data} />
          <Footer nombre={data.nuestroEquipo.nombre} />
        </Page>
      )}

      {data.jugadoresClaveRival.length > 0 && (
        <Page size="A4" style={styles.page}>
          <Text style={styles.seccionTitulo}>Jugadores clave del rival</Text>
          <Text style={styles.seccionSub}>
            Datos personales verificados de StatsBomb (edad, altura, pie hábil, posición). No hay foto disponible en StatsBomb
            — se muestra un avatar con iniciales, no una fotografía real.
          </Text>
          {data.jugadoresClaveRival.map((j) => (
            <JugadorCard key={j.playerId} j={j} />
          ))}
          <Footer nombre={data.nuestroEquipo.nombre} />
        </Page>
      )}

      {data.plantillaPasesRival.length > 0 && (
        <Page size="A4" style={styles.page} wrap>
          <PlantillaPasesPage data={data} />
          <Footer nombre={data.nuestroEquipo.nombre} />
        </Page>
      )}

      {data.alineacionesPorPartidoRival.map((alineacion) => {
        const partido = data.muestraRival.find((p) => p.matchId === alineacion.matchId);
        if (!partido || alineacion.fases.length === 0) return null;
        return (
          <Page key={alineacion.matchId} size="A4" style={styles.page} wrap>
            <AlineacionPorPartidoPage data={data} partido={partido} alineacion={alineacion} />
            <Footer nombre={data.nuestroEquipo.nombre} />
          </Page>
        );
      })}

      <Page size="A4" style={styles.page}>
        <Text style={styles.seccionTitulo}>Historial reciente y muestras analizadas</Text>
        <Text style={styles.seccionSub}>Enfrentamientos directos y detalle completo de los partidos usados en cada muestra.</Text>
        <MuestraMiniLista titulo={`Nacional vs. ${data.rival.nombre} (historial)`} color={COLORS.red} partidos={data.historialReciente} />
        <MuestraMiniLista titulo={`Muestra — ${data.rival.nombre}`} color={COLORS.blue} partidos={data.muestraRival} />
        <MuestraMiniLista titulo={`Muestra — ${data.nuestroEquipo.nombre}`} color={COLORS.amber} partidos={data.muestraNuestra} />
        <Footer nombre={data.nuestroEquipo.nombre} />
      </Page>

      {/* Página de cierre en blanco con el escudo de Nacional, a pedido explícito del usuario. */}
      <Page size="A4" style={[styles.page, { alignItems: "center", justifyContent: "center" }]}>
        {/* eslint-disable-next-line jsx-a11y/alt-text -- react-pdf Image, no HTML img */}
        <Image src={nuestroCrestUrl} style={{ width: 260, height: 260 }} />
      </Page>
    </Document>
  );
}

import { Document, Image, Page, StyleSheet, Text, View } from "@react-pdf/renderer";
import { COLORS, registerPdfFonts } from "@/lib/pdf-theme";
import type { AnalisisRivalData } from "@/lib/analisis-rival-types";

registerPdfFonts();

const styles = StyleSheet.create({
  page: { padding: 32, fontSize: 10, fontFamily: "Inter", color: COLORS.ink },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderBottom: `2 solid ${COLORS.blue}`,
    paddingBottom: 14,
    marginBottom: 18,
  },
  crest: { width: 42, height: 42 },
  clubName: { fontSize: 17, fontWeight: 700, color: COLORS.blueDark },
  subtitle: { fontSize: 10, fontWeight: 500, color: COLORS.muted, marginTop: 2 },

  metaRow: { flexDirection: "row", gap: 8, marginBottom: 18, flexWrap: "wrap" },
  metaChip: {
    flexDirection: "column",
    backgroundColor: COLORS.blueTint,
    borderRadius: 6,
    paddingVertical: 7,
    paddingHorizontal: 11,
    minWidth: 90,
  },
  metaLabel: { fontSize: 7.5, fontWeight: 600, color: COLORS.blueDark, textTransform: "uppercase", letterSpacing: 0.6 },
  metaValue: { fontSize: 10.5, fontWeight: 700, color: COLORS.blueDark },

  section: { marginBottom: 12 },
  sectionCard: { borderRadius: 6, border: `1 solid ${COLORS.border}`, overflow: "hidden" },
  sectionHeader: { paddingVertical: 7, paddingHorizontal: 10, backgroundColor: COLORS.blue },
  sectionHeaderTitle: { fontSize: 10, fontWeight: 700, color: "#ffffff" },
  sectionBody: { padding: 10 },
  bodyText: { fontSize: 9.5, lineHeight: 1.5, color: COLORS.ink },
  emptyText: { fontSize: 9, color: "#999", fontStyle: "italic" },

  table: { border: `1 solid ${COLORS.border}`, borderRadius: 6, overflow: "hidden" },
  tableRow: { flexDirection: "row", borderBottom: `1 solid ${COLORS.border}` },
  tableRowLast: { flexDirection: "row" },
  tableHeadCell: { flex: 1, padding: 6, backgroundColor: COLORS.grayTint, fontSize: 8.5, fontWeight: 700 },
  tableCell: { flex: 1, padding: 6, fontSize: 9 },

  faseCard: { border: `1 solid ${COLORS.border}`, borderRadius: 6, padding: 10, marginBottom: 8 },
  faseTitulo: { fontSize: 10.5, fontWeight: 700, color: COLORS.blueDark, marginBottom: 4 },
  faseRoles: { fontSize: 9, color: COLORS.ink, marginBottom: 3 },
  faseAereo: { fontSize: 9, color: COLORS.muted },

  patronCard: { border: `1 solid ${COLORS.border}`, borderRadius: 6, padding: 10, marginBottom: 8 },
  etiqueta: {
    alignSelf: "flex-start",
    backgroundColor: COLORS.blueDark,
    color: "#fff",
    fontSize: 8.5,
    fontWeight: 700,
    letterSpacing: 0.4,
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 4,
    marginBottom: 5,
  },
  referencia: { fontSize: 8.5, color: COLORS.muted, marginTop: 3 },
  implicancia: { fontSize: 9, color: COLORS.ink, marginTop: 4 },
  implicanciaLabel: { fontSize: 8.5, fontWeight: 700, color: COLORS.blueDark },

  clavesBox: { backgroundColor: COLORS.redTint, borderRadius: 6, padding: 12 },
  claveRow: { flexDirection: "row", marginBottom: 5 },
  claveNumero: { width: 16, fontSize: 9.5, fontWeight: 700, color: COLORS.red },
  claveTexto: { flex: 1, fontSize: 9.5, color: COLORS.ink },

  footer: {
    position: "absolute",
    bottom: 24,
    left: 32,
    right: 32,
    fontSize: 8,
    color: "#999",
    textAlign: "center",
    borderTop: `1 solid ${COLORS.border}`,
    paddingTop: 8,
  },
});

function SeccionSimple({ titulo, conclusion, color }: { titulo: string; conclusion: string; color: string }) {
  if (!conclusion.trim()) return null;
  return (
    <View style={styles.section} wrap={false}>
      <View style={styles.sectionCard}>
        <View style={[styles.sectionHeader, { backgroundColor: color }]}>
          <Text style={styles.sectionHeaderTitle}>{titulo}</Text>
        </View>
        <View style={styles.sectionBody}>
          <Text style={styles.bodyText}>{conclusion}</Text>
        </View>
      </View>
    </View>
  );
}

export function AnalisisRivalPdfDocument({ plan, crestUrl }: { plan: AnalisisRivalData; crestUrl: string }) {
  const partidos = plan.partidos_analizados.filter((p) => p.fecha || p.rival);
  const fases = plan.estructura_base.filter((f) => f.nombre || f.formacion);
  const patrones = plan.patrones.filter((p) => p.etiqueta || p.descripcion);
  const claves = plan.claves.filter((c) => c.trim());

  return (
    <Document>
      <Page size="A4" style={styles.page} wrap>
        <View style={styles.header}>
          {/* eslint-disable-next-line jsx-a11y/alt-text -- react-pdf Image, not an HTML img */}
          <Image src={crestUrl} style={styles.crest} />
          <View>
            <Text style={styles.clubName}>Club Nacional de Football</Text>
            <Text style={styles.subtitle}>Plan de Partido — Análisis de {plan.rival || "Rival"}</Text>
          </View>
        </View>

        <View style={styles.metaRow}>
          <View style={styles.metaChip}>
            <Text style={styles.metaLabel}>Rival</Text>
            <Text style={styles.metaValue}>{plan.rival || "—"}</Text>
          </View>
          <View style={styles.metaChip}>
            <Text style={styles.metaLabel}>Fecha</Text>
            <Text style={styles.metaValue}>{plan.fecha || "—"}</Text>
          </View>
          <View style={styles.metaChip}>
            <Text style={styles.metaLabel}>Cancha</Text>
            <Text style={styles.metaValue}>{plan.cancha || "—"}</Text>
          </View>
          <View style={styles.metaChip}>
            <Text style={styles.metaLabel}>Tipo de partido</Text>
            <Text style={styles.metaValue}>{plan.tipo_partido || "—"}</Text>
          </View>
          {plan.analista && (
            <View style={styles.metaChip}>
              <Text style={styles.metaLabel}>Analista</Text>
              <Text style={styles.metaValue}>{plan.analista}</Text>
            </View>
          )}
        </View>

        {partidos.length > 0 && (
          <View style={styles.section} wrap={false}>
            <Text style={[styles.faseTitulo, { marginBottom: 6 }]}>Partidos analizados</Text>
            <View style={styles.table}>
              <View style={styles.tableRow}>
                <Text style={styles.tableHeadCell}>Fecha</Text>
                <Text style={styles.tableHeadCell}>Rival</Text>
                <Text style={styles.tableHeadCell}>Resultado</Text>
              </View>
              {partidos.map((p, i) => (
                <View key={i} style={i === partidos.length - 1 ? styles.tableRowLast : styles.tableRow}>
                  <Text style={styles.tableCell}>{p.fecha || "—"}</Text>
                  <Text style={styles.tableCell}>{p.rival || "—"}</Text>
                  <Text style={styles.tableCell}>{p.resultado || "—"}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {fases.length > 0 && (
          <View style={styles.section}>
            <Text style={[styles.faseTitulo, { marginBottom: 6 }]}>Estructura base</Text>
            {fases.map((f, i) => {
              const rolesTxt = Object.entries(f.roles)
                .filter(([, v]) => v)
                .map(([k, v]) => `${k}: ${v}`)
                .join("  ·  ");
              return (
                <View key={i} style={styles.faseCard} wrap={false}>
                  <Text style={styles.faseTitulo}>
                    {f.nombre || "Fase"} {f.formacion ? `(${f.formacion})` : ""}
                  </Text>
                  {rolesTxt && <Text style={styles.faseRoles}>{rolesTxt}</Text>}
                  {f.aereo && <Text style={styles.faseAereo}>Duelos aéreos: {f.aereo}</Text>}
                </View>
              );
            })}
          </View>
        )}

        <SeccionSimple titulo="Fase ofensiva" conclusion={plan.fase_ofensiva.conclusion} color={COLORS.blue} />
        <SeccionSimple
          titulo="Transiciones ofensivas"
          conclusion={plan.transiciones_ofensivas.conclusion}
          color={COLORS.green}
        />
        <SeccionSimple
          titulo="Transiciones defensivas"
          conclusion={plan.transiciones_defensivas.conclusion}
          color={COLORS.amber}
        />
        <SeccionSimple titulo="Presión zona 3" conclusion={plan.presion_zona3.conclusion} color={COLORS.red} />
        <SeccionSimple titulo="Zona 2 / Zona 1" conclusion={plan.zona21.conclusion} color={COLORS.gray} />

        {patrones.length > 0 && (
          <View style={styles.section}>
            <Text style={[styles.faseTitulo, { marginBottom: 6 }]}>Patrones puntuales recurrentes</Text>
            {patrones.map((p, i) => (
              <View key={i} style={styles.patronCard} wrap={false}>
                <Text style={styles.etiqueta}>{p.etiqueta || "PATRÓN"}</Text>
                {p.descripcion && <Text style={styles.bodyText}>{p.descripcion}</Text>}
                {p.referencia && <Text style={styles.referencia}>Ref: {p.referencia}</Text>}
                {p.implicancia && (
                  <Text style={styles.implicancia}>
                    <Text style={styles.implicanciaLabel}>Implicancia: </Text>
                    {p.implicancia}
                  </Text>
                )}
              </View>
            ))}
          </View>
        )}

        <SeccionSimple titulo="ABP ofensivas" conclusion={plan.abp_ofensivas.conclusion} color={COLORS.blue} />
        <SeccionSimple titulo="ABP defensivas" conclusion={plan.abp_defensivas.conclusion} color={COLORS.amber} />

        {claves.length > 0 && (
          <View style={styles.section} wrap={false}>
            <Text style={[styles.faseTitulo, { marginBottom: 6 }]}>Claves del partido</Text>
            <View style={styles.clavesBox}>
              {claves.map((c, i) => (
                <View key={i} style={styles.claveRow}>
                  <Text style={styles.claveNumero}>{i + 1}.</Text>
                  <Text style={styles.claveTexto}>{c}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        <Text
          style={styles.footer}
          render={({ pageNumber, totalPages }) => `Cuerpo Técnico · Nacional — Página ${pageNumber} de ${totalPages}`}
          fixed
        />
      </Page>
    </Document>
  );
}

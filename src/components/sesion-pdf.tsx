import { Document, Image, Page, StyleSheet, Text, View } from "@react-pdf/renderer";
import { COLORS, registerPdfFonts } from "@/lib/pdf-theme";

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
  headerText: { flexDirection: "column" },
  clubName: { fontSize: 17, fontWeight: 700, color: COLORS.blueDark },
  subtitle: { fontSize: 10, fontWeight: 500, color: COLORS.muted, marginTop: 2 },

  metaRow: { flexDirection: "row", gap: 10, marginBottom: 18 },
  metaChip: {
    flexDirection: "column",
    backgroundColor: COLORS.blueTint,
    borderRadius: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
    minWidth: 100,
  },
  metaLabel: { fontSize: 7.5, fontWeight: 600, color: COLORS.blueDark, textTransform: "uppercase", letterSpacing: 0.6 },
  metaValue: { fontSize: 11, fontWeight: 700, color: COLORS.blueDark },

  quadrantGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginBottom: 14 },
  quadrant: {
    width: "48.5%",
    borderRadius: 6,
    border: `1 solid ${COLORS.border}`,
    overflow: "hidden",
  },
  quadrantFull: { width: "100%" },
  quadrantHeader: { backgroundColor: COLORS.blue, paddingVertical: 6, paddingHorizontal: 10 },
  quadrantHeaderTitle: { fontSize: 10, fontWeight: 700, color: "#ffffff" },
  quadrantBody: { padding: 10, minHeight: 40 },
  quadrantText: { fontSize: 9.5, lineHeight: 1.5, color: COLORS.ink },
  emptyText: { fontSize: 9, color: "#999", fontStyle: "italic" },

  section: { marginBottom: 14 },
  sectionCard: { borderRadius: 6, border: `1 solid ${COLORS.border}`, overflow: "hidden" },
  sectionHeader: { paddingVertical: 7, paddingHorizontal: 10 },
  sectionHeaderTitle: { fontSize: 10, fontWeight: 700, color: "#ffffff" },
  sectionBody: { padding: 10 },

  countsRow: { flexDirection: "row", gap: 10, marginBottom: 8 },
  countBox: { flex: 1, borderRadius: 6, padding: 8, flexDirection: "column" },
  countNumber: { fontSize: 18, fontWeight: 700 },
  countLabel: { fontSize: 8, fontWeight: 600, marginTop: 2, textTransform: "uppercase" },
  playerList: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  playerChip: {
    fontSize: 8.5,
    fontWeight: 500,
    paddingVertical: 3,
    paddingHorizontal: 7,
    borderRadius: 10,
    backgroundColor: "#f1f3f6",
    color: "#333",
  },
  equiposRow: { flexDirection: "row", gap: 12 },
  equipoCol: { flex: 1, border: `1 solid ${COLORS.border}`, borderRadius: 6, padding: 8 },
  equipoNombre: { fontSize: 10, fontWeight: 700, marginBottom: 6, color: COLORS.blueDark },
  equipoPlayer: { fontSize: 9, marginBottom: 3, color: COLORS.ink },

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

export type SesionPdfData = {
  fecha: string;
  lugar: string;
  activacion: string;
  introductorio: string;
  principal: string;
  objetivos_tarea: string;
  objetivos_fisicos: string;
  habilitados: string[];
  recuperacion: string[];
  reduccion: string[];
  equipos: { nombre: string; jugadores: string[] }[];
  crestUrl: string;
};

function Quadrant({ title, body, full }: { title: string; body: string; full?: boolean }) {
  return (
    <View style={[styles.quadrant, full ? styles.quadrantFull : {}]} wrap={false}>
      <View style={styles.quadrantHeader}>
        <Text style={styles.quadrantHeaderTitle}>{title}</Text>
      </View>
      <View style={styles.quadrantBody}>
        {body ? <Text style={styles.quadrantText}>{body}</Text> : <Text style={styles.emptyText}>Sin definir</Text>}
      </View>
    </View>
  );
}

export function SesionPdfDocument({ data }: { data: SesionPdfData }) {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          {/* eslint-disable-next-line jsx-a11y/alt-text -- react-pdf Image, not an HTML img */}
          <Image src={data.crestUrl} style={styles.crest} />
          <View style={styles.headerText}>
            <Text style={styles.clubName}>Club Nacional de Football</Text>
            <Text style={styles.subtitle}>Planificación de sesión de entrenamiento</Text>
          </View>
        </View>

        <View style={styles.metaRow}>
          <View style={styles.metaChip}>
            <Text style={styles.metaLabel}>Fecha</Text>
            <Text style={styles.metaValue}>{data.fecha}</Text>
          </View>
          <View style={styles.metaChip}>
            <Text style={styles.metaLabel}>Lugar</Text>
            <Text style={styles.metaValue}>{data.lugar || "—"}</Text>
          </View>
        </View>

        <View style={styles.quadrantGrid}>
          <Quadrant title="Activación" body={data.activacion} />
          <Quadrant title="Introductorio" body={data.introductorio} />
          <Quadrant title="Principal" body={data.principal} />
          <Quadrant title="Objetivos de la tarea" body={data.objetivos_tarea} />
          <Quadrant title="Objetivos físicos" body={data.objetivos_fisicos} full />
        </View>

        <View style={styles.section}>
          <View style={styles.sectionCard} wrap={false}>
            <View style={[styles.sectionHeader, { backgroundColor: COLORS.blue }]}>
              <Text style={styles.sectionHeaderTitle}>Disponibilidad del plantel</Text>
            </View>
            <View style={styles.sectionBody}>
              <View style={styles.countsRow}>
                <View style={[styles.countBox, { backgroundColor: COLORS.blueTint }]}>
                  <Text style={[styles.countNumber, { color: COLORS.blueDark }]}>{data.habilitados.length}</Text>
                  <Text style={[styles.countLabel, { color: COLORS.blueDark }]}>Habilitados</Text>
                </View>
                <View style={[styles.countBox, { backgroundColor: COLORS.amberTint }]}>
                  <Text style={[styles.countNumber, { color: COLORS.amber }]}>{data.recuperacion.length}</Text>
                  <Text style={[styles.countLabel, { color: COLORS.amber }]}>En recuperación</Text>
                </View>
                <View style={[styles.countBox, { backgroundColor: COLORS.redTint }]}>
                  <Text style={[styles.countNumber, { color: COLORS.red }]}>{data.reduccion.length}</Text>
                  <Text style={[styles.countLabel, { color: COLORS.red }]}>Reducción de tareas</Text>
                </View>
              </View>
              <View style={styles.playerList}>
                {data.habilitados.map((n) => (
                  <Text key={n} style={styles.playerChip}>
                    {n}
                  </Text>
                ))}
              </View>
            </View>
          </View>
        </View>

        {data.equipos.some((eq) => eq.jugadores.length > 0) && (
          <View style={styles.section} wrap={false}>
            <View style={styles.sectionCard}>
              <View style={[styles.sectionHeader, { backgroundColor: COLORS.green }]}>
                <Text style={styles.sectionHeaderTitle}>Equipos</Text>
              </View>
              <View style={[styles.sectionBody, { backgroundColor: COLORS.greenTint }]}>
                <View style={styles.equiposRow}>
                  {data.equipos.map((eq) => (
                    <View key={eq.nombre} style={styles.equipoCol}>
                      <Text style={styles.equipoNombre}>{eq.nombre}</Text>
                      {eq.jugadores.length === 0 ? (
                        <Text style={styles.emptyText}>Sin jugadores</Text>
                      ) : (
                        eq.jugadores.map((n) => (
                          <Text key={n} style={styles.equipoPlayer}>
                            {n}
                          </Text>
                        ))
                      )}
                    </View>
                  ))}
                </View>
              </View>
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

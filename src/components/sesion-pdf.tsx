import { Document, Image, Page, StyleSheet, Text, View } from "@react-pdf/renderer";

const NAC_BLUE = "#0b3d91";
const NAC_BLUE_DARK = "#072a66";
const NAC_RED = "#d7263d";

const styles = StyleSheet.create({
  page: { padding: 32, fontSize: 10, fontFamily: "Helvetica", color: "#1a1a1a" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderBottom: `2 solid ${NAC_BLUE}`,
    paddingBottom: 12,
    marginBottom: 16,
  },
  crest: { width: 40, height: 40 },
  headerText: { flexDirection: "column" },
  clubName: { fontSize: 16, fontWeight: 700, color: NAC_BLUE_DARK },
  subtitle: { fontSize: 10, color: "#555", marginTop: 2 },
  metaRow: { flexDirection: "row", gap: 24, marginBottom: 18 },
  metaItem: { flexDirection: "column" },
  metaLabel: { fontSize: 8, color: "#888", textTransform: "uppercase", letterSpacing: 0.5 },
  metaValue: { fontSize: 11, fontWeight: 700, marginTop: 2, color: "#111" },
  section: { marginBottom: 14 },
  sectionTitle: {
    fontSize: 11,
    fontWeight: 700,
    color: "#fff",
    backgroundColor: NAC_BLUE,
    paddingVertical: 4,
    paddingHorizontal: 8,
    marginBottom: 6,
  },
  sectionBody: { fontSize: 10, lineHeight: 1.5, paddingHorizontal: 2, color: "#222" },
  emptyText: { fontSize: 9, color: "#999", fontStyle: "italic" },
  countsRow: { flexDirection: "row", gap: 10, marginBottom: 4 },
  countBox: {
    flex: 1,
    borderRadius: 4,
    padding: 8,
    flexDirection: "column",
  },
  countNumber: { fontSize: 18, fontWeight: 700 },
  countLabel: { fontSize: 8, marginTop: 2, textTransform: "uppercase" },
  playerList: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 4 },
  playerChip: {
    fontSize: 8.5,
    paddingVertical: 3,
    paddingHorizontal: 6,
    borderRadius: 3,
    backgroundColor: "#f1f3f6",
    color: "#333",
  },
  equiposRow: { flexDirection: "row", gap: 12 },
  equipoCol: { flex: 1, border: "1 solid #e2e5ea", borderRadius: 4, padding: 8 },
  equipoNombre: { fontSize: 10, fontWeight: 700, marginBottom: 6, color: NAC_BLUE_DARK },
  footer: { position: "absolute", bottom: 24, left: 32, right: 32, fontSize: 8, color: "#999", textAlign: "center" },
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

function Section({ title, body }: { title: string; body: string }) {
  return (
    <View style={styles.section} wrap={false}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {body ? <Text style={styles.sectionBody}>{body}</Text> : <Text style={styles.emptyText}>Sin definir</Text>}
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
          <View style={styles.metaItem}>
            <Text style={styles.metaLabel}>Fecha</Text>
            <Text style={styles.metaValue}>{data.fecha}</Text>
          </View>
          <View style={styles.metaItem}>
            <Text style={styles.metaLabel}>Lugar</Text>
            <Text style={styles.metaValue}>{data.lugar || "—"}</Text>
          </View>
        </View>

        <Section title="Activación" body={data.activacion} />
        <Section title="Introductorio" body={data.introductorio} />
        <Section title="Principal" body={data.principal} />
        <Section title="Objetivos de la tarea" body={data.objetivos_tarea} />
        <Section title="Objetivos físicos" body={data.objetivos_fisicos} />

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Disponibilidad del plantel</Text>
          <View style={styles.countsRow}>
            <View style={[styles.countBox, { backgroundColor: "#e6f1fb" }]}>
              <Text style={[styles.countNumber, { color: NAC_BLUE_DARK }]}>{data.habilitados.length}</Text>
              <Text style={[styles.countLabel, { color: NAC_BLUE_DARK }]}>Habilitados</Text>
            </View>
            <View style={[styles.countBox, { backgroundColor: "#faeeda" }]}>
              <Text style={[styles.countNumber, { color: "#854f0b" }]}>{data.recuperacion.length}</Text>
              <Text style={[styles.countLabel, { color: "#854f0b" }]}>En recuperación</Text>
            </View>
            <View style={[styles.countBox, { backgroundColor: "#fcebeb" }]}>
              <Text style={[styles.countNumber, { color: NAC_RED }]}>{data.reduccion.length}</Text>
              <Text style={[styles.countLabel, { color: NAC_RED }]}>Reducción de tareas</Text>
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

        {data.equipos.some((eq) => eq.jugadores.length > 0) && (
          <View style={styles.section} wrap={false}>
            <Text style={styles.sectionTitle}>Equipos</Text>
            <View style={styles.equiposRow}>
              {data.equipos.map((eq) => (
                <View key={eq.nombre} style={styles.equipoCol}>
                  <Text style={styles.equipoNombre}>{eq.nombre}</Text>
                  {eq.jugadores.length === 0 ? (
                    <Text style={styles.emptyText}>Sin jugadores</Text>
                  ) : (
                    eq.jugadores.map((n) => (
                      <Text key={n} style={{ fontSize: 9, marginBottom: 3 }}>
                        {n}
                      </Text>
                    ))
                  )}
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

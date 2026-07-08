import { Document, Image, Link, Page, StyleSheet, Text, View } from "@react-pdf/renderer";

const NAC_BLUE = "#0b3d91";
const NAC_BLUE_DARK = "#072a66";

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
  metaRow: { flexDirection: "row", flexWrap: "wrap", gap: 20, marginBottom: 20 },
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
    marginBottom: 8,
  },
  linkRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderBottom: "1 solid #e2e5ea",
    paddingVertical: 6,
    paddingHorizontal: 2,
  },
  linkLabel: { fontSize: 10, color: "#222" },
  linkUrl: { fontSize: 9, color: NAC_BLUE, textDecoration: "none" },
  emptyText: { fontSize: 9, color: "#999", fontStyle: "italic" },
  footer: { position: "absolute", bottom: 24, left: 32, right: 32, fontSize: 8, color: "#999", textAlign: "center" },
});

export type EntrenamientoPdfData = {
  fecha: string;
  turno: string | null;
  lugar: string | null;
  rival: string | null;
  sesionCompletaUrl: string | null;
  gpsUrl: string | null;
  tareas: { nombre: string; url: string | null }[];
  crestUrl: string;
};

function LinkRow({ label, url }: { label: string; url: string }) {
  return (
    <View style={styles.linkRow} wrap={false}>
      <Text style={styles.linkLabel}>{label}</Text>
      <Link src={url} style={styles.linkUrl}>
        Ver enlace
      </Link>
    </View>
  );
}

export function EntrenamientoPdfDocument({ data }: { data: EntrenamientoPdfData }) {
  const tareasConLink = data.tareas.filter((t) => t.url);

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          {/* eslint-disable-next-line jsx-a11y/alt-text -- react-pdf Image, not an HTML img */}
          <Image src={data.crestUrl} style={styles.crest} />
          <View style={styles.headerText}>
            <Text style={styles.clubName}>Club Nacional de Football</Text>
            <Text style={styles.subtitle}>Cuerpo Técnico · CT Jorge Bava — Sesión de entrenamiento</Text>
          </View>
        </View>

        <View style={styles.metaRow}>
          <View style={styles.metaItem}>
            <Text style={styles.metaLabel}>Fecha</Text>
            <Text style={styles.metaValue}>{data.fecha}</Text>
          </View>
          {data.turno && (
            <View style={styles.metaItem}>
              <Text style={styles.metaLabel}>Turno</Text>
              <Text style={styles.metaValue}>{data.turno}</Text>
            </View>
          )}
          <View style={styles.metaItem}>
            <Text style={styles.metaLabel}>Lugar</Text>
            <Text style={styles.metaValue}>{data.lugar || "—"}</Text>
          </View>
          {data.rival && (
            <View style={styles.metaItem}>
              <Text style={styles.metaLabel}>Rival</Text>
              <Text style={styles.metaValue}>{data.rival}</Text>
            </View>
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Video</Text>
          {data.sesionCompletaUrl ? (
            <LinkRow label="Sesión completa" url={data.sesionCompletaUrl} />
          ) : (
            <Text style={styles.emptyText}>Sin video cargado</Text>
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>GPS</Text>
          {data.gpsUrl ? (
            <LinkRow label="Informe GPS" url={data.gpsUrl} />
          ) : (
            <Text style={styles.emptyText}>Sin informe GPS cargado</Text>
          )}
        </View>

        <View style={styles.section} wrap={false}>
          <Text style={styles.sectionTitle}>Tareas de la sesión</Text>
          {tareasConLink.length > 0 ? (
            tareasConLink.map((t, i) => <LinkRow key={i} label={t.nombre} url={t.url!} />)
          ) : (
            <Text style={styles.emptyText}>Sin tareas con video cargadas</Text>
          )}
        </View>

        <Text
          style={styles.footer}
          render={({ pageNumber, totalPages }) => `Cuerpo Técnico · Nacional — Página ${pageNumber} de ${totalPages}`}
          fixed
        />
      </Page>
    </Document>
  );
}

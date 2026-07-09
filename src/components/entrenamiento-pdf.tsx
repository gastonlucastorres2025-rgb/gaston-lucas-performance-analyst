import { Document, Image, Link, Page, StyleSheet, Text, View } from "@react-pdf/renderer";
import { IconChart, IconPin, IconPlay, IconTask } from "@/components/pdf-icons";
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

  metaRow: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginBottom: 20 },
  metaChip: {
    flexDirection: "column",
    backgroundColor: COLORS.blueTint,
    borderRadius: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
    minWidth: 100,
  },
  metaChipHeader: { flexDirection: "row", alignItems: "center", gap: 4, marginBottom: 3 },
  metaLabel: { fontSize: 7.5, fontWeight: 600, color: COLORS.blueDark, textTransform: "uppercase", letterSpacing: 0.6 },
  metaValue: { fontSize: 11, fontWeight: 700, color: COLORS.blueDark },

  quadrantsRow: { flexDirection: "row", gap: 12, marginBottom: 12 },
  card: { flex: 1, borderRadius: 6, border: `1 solid ${COLORS.border}`, overflow: "hidden" },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 7,
    paddingHorizontal: 10,
  },
  cardHeaderTitle: { fontSize: 10, fontWeight: 700, color: "#ffffff" },
  cardBody: { padding: 10 },
  linkRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderBottom: `1 solid ${COLORS.border}`,
    paddingVertical: 6,
  },
  linkRowLast: { borderBottom: "none" },
  linkLabel: { fontSize: 9.5, fontWeight: 500, color: COLORS.ink, flex: 1, paddingRight: 8 },
  linkUrl: { fontSize: 9, fontWeight: 600, color: COLORS.blue, textDecoration: "none" },
  emptyText: { fontSize: 9, color: "#999", fontStyle: "italic" },

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

function LinkRow({ label, url, isLast }: { label: string; url: string; isLast?: boolean }) {
  return (
    <View style={[styles.linkRow, isLast ? styles.linkRowLast : {}]} wrap={false}>
      <Text style={styles.linkLabel}>{label}</Text>
      <Link src={url} style={styles.linkUrl}>
        Ver enlace →
      </Link>
    </View>
  );
}

function Card({
  icon,
  title,
  color,
  tint,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  color: string;
  tint: string;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.card} wrap={false}>
      <View style={[styles.cardHeader, { backgroundColor: color }]}>
        {icon}
        <Text style={styles.cardHeaderTitle}>{title}</Text>
      </View>
      <View style={[styles.cardBody, { backgroundColor: tint }]}>{children}</View>
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
          <View style={styles.metaChip}>
            <Text style={styles.metaLabel}>Fecha</Text>
            <Text style={styles.metaValue}>{data.fecha}</Text>
          </View>
          {data.turno && (
            <View style={styles.metaChip}>
              <Text style={styles.metaLabel}>Turno</Text>
              <Text style={styles.metaValue}>{data.turno}</Text>
            </View>
          )}
          <View style={styles.metaChip}>
            <View style={styles.metaChipHeader}>
              <IconPin color={COLORS.blueDark} size={9} />
              <Text style={styles.metaLabel}>Lugar</Text>
            </View>
            <Text style={styles.metaValue}>{data.lugar || "—"}</Text>
          </View>
          {data.rival && (
            <View style={styles.metaChip}>
              <Text style={styles.metaLabel}>Rival</Text>
              <Text style={styles.metaValue}>{data.rival}</Text>
            </View>
          )}
        </View>

        <View style={styles.quadrantsRow}>
          <Card icon={<IconPlay color="#ffffff" size={13} />} title="Video" color={COLORS.red} tint={COLORS.redTint}>
            {data.sesionCompletaUrl ? (
              <LinkRow label="Sesión completa" url={data.sesionCompletaUrl} isLast />
            ) : (
              <Text style={styles.emptyText}>Sin video cargado</Text>
            )}
          </Card>

          <Card icon={<IconChart color="#ffffff" size={13} />} title="GPS" color={COLORS.blue} tint={COLORS.blueTint}>
            {data.gpsUrl ? (
              <LinkRow label="Informe GPS" url={data.gpsUrl} isLast />
            ) : (
              <Text style={styles.emptyText}>Sin informe GPS cargado</Text>
            )}
          </Card>
        </View>

        <Card icon={<IconTask color="#ffffff" size={13} />} title="Tareas de la sesión" color={COLORS.green} tint={COLORS.greenTint}>
          {tareasConLink.length > 0 ? (
            tareasConLink.map((t, i) => (
              <LinkRow key={i} label={t.nombre} url={t.url!} isLast={i === tareasConLink.length - 1} />
            ))
          ) : (
            <Text style={styles.emptyText}>Sin tareas con video cargadas</Text>
          )}
        </Card>

        <Text
          style={styles.footer}
          render={({ pageNumber, totalPages }) => `Cuerpo Técnico · Nacional — Página ${pageNumber} de ${totalPages}`}
          fixed
        />
      </Page>
    </Document>
  );
}

import { Document, Image, Link, Page, StyleSheet, Text, View } from "@react-pdf/renderer";
import { COLORS, registerPdfFonts } from "@/lib/pdf-theme";

registerPdfFonts();

const styles = StyleSheet.create({
  page: { padding: 40, fontSize: 10, fontFamily: "Inter", color: COLORS.ink },

  caratula: { alignItems: "center", justifyContent: "center", paddingTop: 90, paddingBottom: 40 },
  crest: { width: 72, height: 72, marginBottom: 18 },
  clubName: { fontSize: 13, fontWeight: 600, color: COLORS.muted, textTransform: "uppercase", letterSpacing: 1 },
  tituloDoc: { fontSize: 22, fontWeight: 700, color: COLORS.blueDark, marginTop: 10 },
  rivalNombre: { fontSize: 30, fontWeight: 700, color: COLORS.blue, marginTop: 24, textAlign: "center" },
  metaLinea: { fontSize: 12, color: COLORS.muted, marginTop: 8, textAlign: "center" },

  cantidadBadge: {
    marginTop: 30,
    alignSelf: "center",
    backgroundColor: COLORS.blueTint,
    borderRadius: 20,
    paddingVertical: 8,
    paddingHorizontal: 20,
  },
  cantidadTexto: { fontSize: 11, fontWeight: 700, color: COLORS.blueDark },

  listaTitulo: { fontSize: 14, fontWeight: 700, color: COLORS.blueDark, marginBottom: 12 },
  faseCard: {
    flexDirection: "row",
    alignItems: "center",
    border: `1 solid ${COLORS.border}`,
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
  },
  faseNumero: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: COLORS.blue,
    color: "#fff",
    fontSize: 9,
    fontWeight: 700,
    textAlign: "center",
    paddingTop: 5,
    marginRight: 10,
  },
  faseNombre: { fontSize: 11, fontWeight: 700, color: COLORS.ink, marginBottom: 2 },
  faseLink: { fontSize: 8.5, color: COLORS.blue, textDecoration: "underline" },

  footer: {
    position: "absolute",
    bottom: 24,
    left: 40,
    right: 40,
    fontSize: 8,
    color: "#999",
    textAlign: "center",
    borderTop: `1 solid ${COLORS.border}`,
    paddingTop: 8,
  },
});

export type FasesRivalPdfData = {
  rival: string;
  ronda: string;
  competencia: string;
  fases: { nombre: string; link: string }[];
  crestUrl: string;
};

export function FasesRivalPdfDocument({ data }: { data: FasesRivalPdfData }) {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.caratula}>
          {/* eslint-disable-next-line jsx-a11y/alt-text -- react-pdf Image, not an HTML img */}
          <Image src={data.crestUrl} style={styles.crest} />
          <Text style={styles.clubName}>Club Nacional de Football — Cuerpo Técnico</Text>
          <Text style={styles.tituloDoc}>Fases del Rival</Text>
          <Text style={styles.rivalNombre}>{data.rival || "Rival"}</Text>
          {(data.ronda || data.competencia) && (
            <Text style={styles.metaLinea}>{[data.competencia, data.ronda].filter(Boolean).join(" · ")}</Text>
          )}
          <View style={styles.cantidadBadge}>
            <Text style={styles.cantidadTexto}>
              {data.fases.length} {data.fases.length === 1 ? "fase analizada" : "fases analizadas"}
            </Text>
          </View>
        </View>

        <View break>
          <Text style={styles.listaTitulo}>Links de video por fase</Text>
          {data.fases.map((f, i) => (
            <View key={i} style={styles.faseCard} wrap={false}>
              <Text style={styles.faseNumero}>{i + 1}</Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.faseNombre}>{f.nombre}</Text>
                <Link src={f.link}>
                  <Text style={styles.faseLink}>{f.link}</Text>
                </Link>
              </View>
            </View>
          ))}
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

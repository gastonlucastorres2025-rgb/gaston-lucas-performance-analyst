import { Circle, Document, Image, Link, Page, Polygon, StyleSheet, Svg, Text, View } from "@react-pdf/renderer";
import { COLORS, registerPdfFonts } from "@/lib/pdf-theme";

export type JugadorCarpetaPdf = { id: string; nombre: string; notas: string; videoLinks: string[] };

export type CarpetaPdfData = {
  carpetaNombre: string;
  jugadores: JugadorCarpetaPdf[];
  crestUrl: string;
  generadoEn: string;
};

const styles = StyleSheet.create({
  page: { padding: 36, fontFamily: "Inter", fontSize: 9, color: COLORS.ink },
  portadaEscudo: { width: 90, height: 90, objectFit: "contain", marginBottom: 14 },
  portadaTitulo: { fontSize: 20, fontWeight: 700, color: COLORS.blueDark, textAlign: "center" },
  portadaSub: { fontSize: 10.5, color: COLORS.muted, marginTop: 6, textAlign: "center" },
  portadaFecha: { fontSize: 8.5, color: COLORS.muted, marginTop: 20, textAlign: "center" },

  jugadorNombre: { fontSize: 15, fontWeight: 700, color: COLORS.blueDark, marginBottom: 8 },
  seccionLabel: { fontSize: 8, fontWeight: 700, color: COLORS.muted, textTransform: "uppercase", letterSpacing: 0.6, marginBottom: 4 },
  notasTexto: { fontSize: 9.5, lineHeight: 1.55, marginBottom: 14 },
  notasVacio: { fontSize: 9, color: COLORS.muted, marginBottom: 14 },

  videoCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: COLORS.blueDark,
    borderRadius: 10,
    padding: 10,
    marginBottom: 8,
  },
  videoCardLabel: { fontSize: 9.5, fontWeight: 700, color: "#ffffff" },
  videoCardSub: { fontSize: 7, color: "rgba(255,255,255,0.7)", marginTop: 1 },

  footer: { position: "absolute", bottom: 18, left: 36, right: 36, fontSize: 7, color: COLORS.muted, textAlign: "center" },
});

function Footer({ nombre }: { nombre: string }) {
  return (
    <Text style={styles.footer} fixed>
      {nombre} — uso interno del cuerpo técnico
    </Text>
  );
}

/**
 * Carpeta de seguimiento en PDF: un jugador rival por página, con sus características (texto libre del
 * cuerpo técnico) y sus videos como tarjetas tocables que llevan directo al link real de Drive — pensado
 * para mandárselo a los propios jugadores del plantel. Nunca inventa datos: todo sale de lo que el cuerpo
 * técnico cargó a mano en la carpeta.
 */
export function CarpetaPdfDocument({ data }: { data: CarpetaPdfData }) {
  registerPdfFonts();
  const fecha = new Date(data.generadoEn).toLocaleDateString("es-UY", { day: "2-digit", month: "long", year: "numeric" });

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
          {/* eslint-disable-next-line jsx-a11y/alt-text -- react-pdf Image, no HTML img */}
          <Image src={data.crestUrl} style={styles.portadaEscudo} />
          <Text style={styles.portadaTitulo}>{data.carpetaNombre}</Text>
          <Text style={styles.portadaSub}>
            Información de jugadores rivales — {data.jugadores.length} {data.jugadores.length === 1 ? "jugador" : "jugadores"}
          </Text>
          <Text style={styles.portadaFecha}>Generado el {fecha}</Text>
        </View>
        <Footer nombre={data.carpetaNombre} />
      </Page>

      {data.jugadores.map((j, i) => (
        <Page key={j.id} size="A4" style={styles.page} wrap>
          <Text style={styles.jugadorNombre}>
            {i + 1}. {j.nombre}
          </Text>

          <Text style={styles.seccionLabel}>Características</Text>
          {j.notas.trim() ? <Text style={styles.notasTexto}>{j.notas.trim()}</Text> : <Text style={styles.notasVacio}>Sin notas cargadas.</Text>}

          {j.videoLinks.length > 0 && (
            <View style={{ marginTop: 6 }}>
              <Text style={styles.seccionLabel}>Videos</Text>
              {j.videoLinks.map((url, k) => (
                <Link key={k} src={url} style={{ textDecoration: "none" }}>
                  <View style={styles.videoCard} wrap={false}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.videoCardLabel}>Video {k + 1} — {j.nombre}</Text>
                      <Text style={styles.videoCardSub}>Toca para ver el video</Text>
                    </View>
                    <Svg width={24} height={24} viewBox="0 0 24 24">
                      <Circle cx={12} cy={12} r={12} fill="rgba(255,255,255,0.18)" />
                      <Polygon points="9,7 9,17 18,12" fill="#ffffff" />
                    </Svg>
                  </View>
                </Link>
              ))}
            </View>
          )}

          <Footer nombre={data.carpetaNombre} />
        </Page>
      ))}
    </Document>
  );
}

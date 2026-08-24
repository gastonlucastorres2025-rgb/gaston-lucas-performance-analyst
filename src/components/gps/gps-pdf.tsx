import { Document, Page, StyleSheet, Text, View } from "@react-pdf/renderer";
import { COLORS, registerPdfFonts } from "@/lib/pdf-theme";
import type { GpsRegistro, GpsResumenJugador } from "@/lib/gps-data";
import { resumenPorJugador } from "@/lib/gps-data";

export type GpsPdfBloque = { fecha: string; turno: string | null; registros: GpsRegistro[] };

export type GpsPdfData = {
  titulo: string;
  bloques: GpsPdfBloque[];
  generadoEn: string;
};

const TURNO_LABEL: Record<string, string> = { M: "Matutino", V: "Vespertino" };

const styles = StyleSheet.create({
  page: { padding: 32, fontFamily: "Inter", fontSize: 8.5, color: COLORS.ink },
  titulo: { fontSize: 16, fontWeight: 700, color: COLORS.blueDark },
  sub: { fontSize: 9, color: COLORS.muted, marginTop: 3, marginBottom: 14 },
  seccionTitulo: { fontSize: 11, fontWeight: 700, color: COLORS.blueDark, marginBottom: 6 },
  tablaHeader: { flexDirection: "row", backgroundColor: COLORS.grayTint, paddingVertical: 4, paddingHorizontal: 4 },
  tablaHeaderTxt: { fontSize: 7, fontWeight: 700, color: COLORS.muted, textTransform: "uppercase" },
  fila: { flexDirection: "row", paddingVertical: 3, paddingHorizontal: 4, borderBottom: `0.5 solid ${COLORS.border}` },
  celda: { fontSize: 8 },
  footer: { position: "absolute", bottom: 16, left: 32, right: 32, fontSize: 7, color: COLORS.muted, textAlign: "center" },
});

function Footer() {
  return (
    <Text style={styles.footer} fixed>
      Cuerpo Técnico Jorge Bava — GPS, uso interno
    </Text>
  );
}

function fechaLarga(fecha: string) {
  return new Date(`${fecha}T00:00:00`).toLocaleDateString("es-UY", { weekday: "long", day: "2-digit", month: "long", year: "numeric" });
}

function TablaSesion({ bloque }: { bloque: GpsPdfBloque }) {
  return (
    <View style={{ marginBottom: 16 }} wrap={false}>
      <Text style={styles.seccionTitulo}>
        {fechaLarga(bloque.fecha)}
        {bloque.turno ? ` — ${TURNO_LABEL[bloque.turno] ?? bloque.turno}` : ""}
      </Text>
      <View style={styles.tablaHeader}>
        <Text style={[styles.tablaHeaderTxt, { flex: 2 }]}>Jugador</Text>
        <Text style={[styles.tablaHeaderTxt, { flex: 1, textAlign: "center" }]}>Tiempo (min)</Text>
        <Text style={[styles.tablaHeaderTxt, { flex: 1, textAlign: "center" }]}>Distancia (m)</Text>
        <Text style={[styles.tablaHeaderTxt, { flex: 1, textAlign: "center" }]}>Vel. máx (km/h)</Text>
        <Text style={[styles.tablaHeaderTxt, { flex: 1, textAlign: "center" }]}>Dist. alta vel. (m)</Text>
        <Text style={[styles.tablaHeaderTxt, { flex: 1, textAlign: "center" }]}>Acel.</Text>
        <Text style={[styles.tablaHeaderTxt, { flex: 1, textAlign: "center" }]}>Desac.</Text>
      </View>
      {bloque.registros.map((r) => (
        <View key={r.id} style={styles.fila} wrap={false}>
          <Text style={[styles.celda, { flex: 2, fontWeight: 700 }]}>{r.nombre}</Text>
          <Text style={[styles.celda, { flex: 1, textAlign: "center" }]}>{r.duracionMin ?? "—"}</Text>
          <Text style={[styles.celda, { flex: 1, textAlign: "center" }]}>{r.distanciaTotalM ?? "—"}</Text>
          <Text style={[styles.celda, { flex: 1, textAlign: "center" }]}>{r.velocidadMaximaKmh ?? "—"}</Text>
          <Text style={[styles.celda, { flex: 1, textAlign: "center" }]}>{r.distAltaVelocidadM ?? "—"}</Text>
          <Text style={[styles.celda, { flex: 1, textAlign: "center" }]}>{r.aceleracionesCant ?? "—"}</Text>
          <Text style={[styles.celda, { flex: 1, textAlign: "center" }]}>{r.desaceleracionesCant ?? "—"}</Text>
        </View>
      ))}
    </View>
  );
}

function TablaResumen({ jugadores }: { jugadores: GpsResumenJugador[] }) {
  return (
    <View wrap>
      <Text style={styles.seccionTitulo}>Resumen del período — por jugador</Text>
      <View style={styles.tablaHeader}>
        <Text style={[styles.tablaHeaderTxt, { flex: 2 }]}>Jugador</Text>
        <Text style={[styles.tablaHeaderTxt, { flex: 1, textAlign: "center" }]}>Sesiones</Text>
        <Text style={[styles.tablaHeaderTxt, { flex: 1, textAlign: "center" }]}>Dist. total (m)</Text>
        <Text style={[styles.tablaHeaderTxt, { flex: 1, textAlign: "center" }]}>Dist. prom. (m)</Text>
        <Text style={[styles.tablaHeaderTxt, { flex: 1, textAlign: "center" }]}>Vel. máx (km/h)</Text>
      </View>
      {jugadores.map((j) => (
        <View key={j.nombre} style={styles.fila} wrap={false}>
          <Text style={[styles.celda, { flex: 2, fontWeight: 700 }]}>{j.nombre}</Text>
          <Text style={[styles.celda, { flex: 1, textAlign: "center" }]}>{j.sesiones}</Text>
          <Text style={[styles.celda, { flex: 1, textAlign: "center" }]}>{j.distanciaTotalM.toLocaleString("es-UY")}</Text>
          <Text style={[styles.celda, { flex: 1, textAlign: "center" }]}>{j.distanciaPromedioM.toLocaleString("es-UY")}</Text>
          <Text style={[styles.celda, { flex: 1, textAlign: "center" }]}>{j.velocidadMaximaKmh}</Text>
        </View>
      ))}
    </View>
  );
}

/** PDF de GPS: uno o varios días juntos (un día suelto, o un microciclo/semana completo). Si hay
 * más de un día, se agrega una página de resumen consolidado por jugador al final. */
export function GpsPdfDocument({ data }: { data: GpsPdfData }) {
  registerPdfFonts();
  const generado = new Date(data.generadoEn).toLocaleDateString("es-UY", { day: "2-digit", month: "long", year: "numeric" });
  const jugadores = data.bloques.length > 1 ? resumenPorJugador(data.bloques) : [];

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <Text style={styles.titulo}>{data.titulo}</Text>
        <Text style={styles.sub}>Datos reales de GPS — generado el {generado}.</Text>
        {data.bloques.map((bloque) => (
          <TablaSesion key={`${bloque.fecha}-${bloque.turno ?? ""}`} bloque={bloque} />
        ))}
        {jugadores.length > 0 && <TablaResumen jugadores={jugadores} />}
        <Footer />
      </Page>
    </Document>
  );
}

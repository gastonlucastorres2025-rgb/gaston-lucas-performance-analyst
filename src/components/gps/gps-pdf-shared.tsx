import { StyleSheet, Text, View } from "@react-pdf/renderer";
import { COLORS } from "@/lib/pdf-theme";
import { colorSemaforo, porcentajeDeReferencia } from "@/lib/gps-pdf-helpers";
import type { MetricaVolumen } from "@/lib/gps-actions";

/** Piezas visuales compartidas entre los distintos PDF de carga física (partido, sesión de
 * entrenamiento) — mismo estilo de reporte en todos: tabla con semáforo de color por % de una
 * referencia real (nunca un umbral inventado), misma tipografía y misma leyenda. */

export const ETIQUETA_METRICA: Record<MetricaVolumen, string> = {
  distanciaTotalM: "Distancia",
  distAltaVelocidadM: "HSR",
  distMuyAltaVelocidadM: "D. Sprint",
  sprintsCant: "Sprints",
  aceleracionesCant: "Ace",
  desaceleracionesCant: "Des",
};
export const METRICAS: MetricaVolumen[] = ["distanciaTotalM", "distAltaVelocidadM", "distMuyAltaVelocidadM", "sprintsCant", "aceleracionesCant", "desaceleracionesCant"];

export const styles = StyleSheet.create({
  page: { padding: 32, fontFamily: "Inter", fontSize: 8.5, color: COLORS.ink },
  escudo: { width: 40, height: 40, alignSelf: "center", marginBottom: 12 },
  tituloSeccion: { fontSize: 13, fontWeight: 700, color: COLORS.ink, textAlign: "center", marginTop: 4 },
  tituloAcento: { width: 32, height: 2.5, backgroundColor: COLORS.red, borderRadius: 2, alignSelf: "center", marginTop: 5, marginBottom: 14 },
  tarjeta: { backgroundColor: COLORS.grayTint, borderRadius: 6, padding: 12, marginBottom: 14 },
  resultadoFila: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 16 },
  resultadoEquipo: { fontSize: 15, fontWeight: 700 },
  resultadoMarcador: { fontSize: 17, fontWeight: 700, marginHorizontal: 6 },
  infoFila: { flexDirection: "row", gap: 10, marginBottom: 14 },
  infoCaja: { flex: 1, backgroundColor: "#fff", borderRadius: 6, padding: 8, alignItems: "center", borderWidth: 0.5, borderColor: COLORS.border },
  infoEtiqueta: { fontSize: 7, color: COLORS.muted, textTransform: "uppercase", marginBottom: 3 },
  infoValor: { fontSize: 11, fontWeight: 700 },
  subtitulo: { fontSize: 10, fontWeight: 700, textAlign: "center", marginBottom: 8, marginTop: 4 },
  nota: { fontSize: 7, color: COLORS.muted, textAlign: "center", marginTop: -10, marginBottom: 10 },
  tablaHeader: { flexDirection: "row", backgroundColor: COLORS.blueDark },
  tablaHeaderTxt: { flex: 1, fontSize: 7, fontWeight: 700, color: "#fff", textAlign: "center", paddingVertical: 5 },
  tablaHeaderTxtLabel: { flex: 1.3, fontSize: 7, fontWeight: 700, color: "#fff", textAlign: "left", paddingVertical: 5, paddingLeft: 4 },
  fila: { flexDirection: "row", borderBottomWidth: 0.5, borderBottomColor: COLORS.border },
  celdaLabel: { flex: 1.3, fontSize: 8, fontWeight: 700, paddingVertical: 5, paddingLeft: 4 },
  celda: { flex: 1, fontSize: 8, fontWeight: 700, textAlign: "center", paddingVertical: 5 },
  leyenda: { flexDirection: "row", gap: 6, justifyContent: "center", marginTop: 10 },
  leyendaChip: { flexDirection: "row", alignItems: "center", gap: 3, fontSize: 6.5 },
  leyendaColor: { width: 8, height: 8, borderRadius: 2 },
  footer: { position: "absolute", bottom: 16, left: 32, right: 32, fontSize: 7, color: COLORS.muted, textAlign: "center" },
});

/** Título de sección con una línea de acento debajo — mismo recurso visual en todo el reporte,
 * en vez de un título de texto plano. */
export function TituloSeccion({ children, marginTop }: { children: string; marginTop?: number }) {
  return (
    <View style={marginTop ? { marginTop } : undefined} wrap={false}>
      <Text style={styles.tituloSeccion}>{children}</Text>
      <View style={styles.tituloAcento} />
    </View>
  );
}

export function Footer() {
  return (
    <Text style={styles.footer} fixed>
      Cuerpo Técnico Jorge Bava — GPS, uso interno
    </Text>
  );
}

export function Leyenda() {
  return (
    <View style={styles.leyenda}>
      <View style={styles.leyendaChip}>
        <View style={[styles.leyendaColor, { backgroundColor: COLORS.nivelAlto }]} />
        <Text>{">"} 80% del máximo</Text>
      </View>
      <View style={styles.leyendaChip}>
        <View style={[styles.leyendaColor, { backgroundColor: COLORS.nivelMedioAlto }]} />
        <Text>60-80%</Text>
      </View>
      <View style={styles.leyendaChip}>
        <View style={[styles.leyendaColor, { backgroundColor: COLORS.nivelMedio }]} />
        <Text>40-60%</Text>
      </View>
      <View style={styles.leyendaChip}>
        <View style={[styles.leyendaColor, { backgroundColor: COLORS.nivelBajo }]} />
        <Text>{"<"} 40%</Text>
      </View>
    </View>
  );
}

type FilaVolumenProps = { etiqueta: string; valores: Partial<Record<MetricaVolumen, number | null>>; referencia: Partial<Record<MetricaVolumen, number | null>> };

/** Fila de una tabla de volumen: valor real + celda coloreada según % de una referencia real
 * (nunca un umbral inventado — la referencia se recibe de afuera, calculada de los datos). */
function FilaVolumen({ etiqueta, valores, referencia, par }: FilaVolumenProps & { par?: boolean }) {
  return (
    <View style={[styles.fila, par ? { backgroundColor: COLORS.grayTint } : {}]} wrap={false}>
      <Text style={styles.celdaLabel}>{etiqueta}</Text>
      {METRICAS.map((m) => {
        const valor = valores[m] ?? null;
        const pct = porcentajeDeReferencia(valor, referencia[m] ?? null);
        return (
          <Text key={m} style={[styles.celda, { backgroundColor: colorSemaforo(pct) }]}>
            {valor === null ? "—" : Math.round(valor).toLocaleString("es-UY")}
          </Text>
        );
      })}
    </View>
  );
}

export function TablaVolumen({ titulo, filas }: { titulo?: string; filas: FilaVolumenProps[] }) {
  return (
    <View style={{ marginBottom: 14 }} wrap={false}>
      {titulo && <Text style={styles.subtitulo}>{titulo}</Text>}
      <View style={styles.tablaHeader}>
        <Text style={styles.tablaHeaderTxtLabel}> </Text>
        {METRICAS.map((m) => (
          <Text key={m} style={styles.tablaHeaderTxt}>
            {ETIQUETA_METRICA[m]}
          </Text>
        ))}
      </View>
      {filas.map((f, i) => (
        <FilaVolumen key={f.etiqueta} etiqueta={f.etiqueta} valores={f.valores} referencia={f.referencia} par={i % 2 === 1} />
      ))}
    </View>
  );
}

const barrasStyles = StyleSheet.create({
  fila: { flexDirection: "row", alignItems: "center", marginBottom: 4 },
  etiqueta: { width: 92, fontSize: 6.5, fontWeight: 700, textAlign: "right", paddingRight: 5 },
  pista: { flex: 1, height: 9, justifyContent: "center", position: "relative" },
  barra: { height: 9, borderRadius: 2 },
  pct: { position: "absolute", fontSize: 6, fontWeight: 700, color: COLORS.ink },
  valor: { fontSize: 6.5, fontWeight: 700, marginLeft: 5, width: 44 },
});

/** Barras horizontales por jugador para UNA métrica — mismo estilo que "Carga colectiva por
 * jugador" del módulo web, dibujado a mano porque react-pdf no tiene librería de gráficos.
 * Ordenado de mayor a menor por el valor real; el largo de la barra es relativo al máximo del
 * grupo mostrado, pero el COLOR es semáforo según el % del máximo histórico individual de ESE
 * jugador (mismo dato real que ya colorea la tabla "Volumen por jugador" — nunca un umbral
 * inventado para el gráfico). Ese mismo % se muestra como número chico sobre la barra: adentro,
 * pegado al borde derecho, si la barra tiene lugar; si es muy corta, justo después para que no
 * quede tapado. */
export function GraficoBarrasHorizontal({
  titulo,
  unidad,
  datos,
}: {
  titulo: string;
  unidad: string;
  datos: { etiqueta: string; valor: number; pctIndividual: number | null }[];
}) {
  const ordenados = [...datos].sort((a, b) => b.valor - a.valor);
  const max = Math.max(...ordenados.map((d) => d.valor), 1);
  return (
    <View style={{ marginBottom: 18 }} wrap={false}>
      <Text style={styles.subtitulo}>
        {titulo} {unidad ? `(${unidad})` : ""}
      </Text>
      {ordenados.map((d) => {
        const anchoBarra = Math.max(2, (d.valor / max) * 100);
        const etiquetaPct = d.pctIndividual === null ? "—" : `${d.pctIndividual}%`;
        const cabeDentro = anchoBarra >= 14;
        return (
          <View key={d.etiqueta} style={barrasStyles.fila}>
            <Text style={barrasStyles.etiqueta}>{d.etiqueta}</Text>
            <View style={barrasStyles.pista}>
              <View style={[barrasStyles.barra, { width: `${anchoBarra}%`, backgroundColor: colorSemaforo(d.pctIndividual) }]} />
              <Text style={[barrasStyles.pct, cabeDentro ? { right: `${100 - anchoBarra}%`, marginRight: 3 } : { left: `${anchoBarra}%`, marginLeft: 3 }]}>
                {etiquetaPct}
              </Text>
            </View>
            <Text style={barrasStyles.valor}>{Math.round(d.valor).toLocaleString("es-UY")}</Text>
          </View>
        );
      })}
    </View>
  );
}

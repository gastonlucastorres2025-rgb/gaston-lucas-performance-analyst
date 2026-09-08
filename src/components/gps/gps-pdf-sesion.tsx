import { Document, Image, Page, Text, View } from "@react-pdf/renderer";
import { COLORS, registerPdfFonts } from "@/lib/pdf-theme";
import { colorSemaforo, porcentajeDeReferencia } from "@/lib/gps-pdf-helpers";
import { formatearNombreJugador } from "@/lib/gps-nombres";
import { ETIQUETA_METRICA, Footer, GraficoBarrasHorizontal, Leyenda, METRICAS, TablaVolumen, TituloSeccion, styles } from "@/components/gps/gps-pdf-shared";
import type { DatosPdfSesion, MetricaVolumen, VolumenTotal } from "@/lib/gps-actions";
import type { GpsRegistro } from "@/lib/gps-data";

const TURNO_LABEL: Record<string, string> = { M: "Matutino", V: "Vespertino" };

export function GpsPdfSesionDocument({ data }: { data: DatosPdfSesion }) {
  registerPdfFonts();
  const { sesion, volumenTotal, maximoTemporada, maximosPorJugador } = data;
  const fechaTexto = new Date(`${sesion.fecha}T00:00:00`).toLocaleDateString("es-UY", { weekday: "long", day: "2-digit", month: "long", year: "numeric" });

  const n = sesion.registros.length;
  const promedioPlantel: VolumenTotal = {} as VolumenTotal;
  for (const m of METRICAS) promedioPlantel[m] = n > 0 && volumenTotal[m] !== null ? (volumenTotal[m] as number) / n : null;

  /** Datos de un gráfico de barras: valor real + % del máximo histórico de ESE jugador en esa
   * métrica (mismo dato real que colorea la tabla "Volumen por jugador", ahora también el color
   * de la barra — nunca un umbral inventado para el gráfico). */
  const datosBarra = (clave: MetricaVolumen, valor: (r: GpsRegistro) => number | null) =>
    sesion.registros.map((r) => ({
      etiqueta: formatearNombreJugador(r.nombre),
      valor: valor(r) ?? 0,
      pctIndividual: porcentajeDeReferencia(valor(r), maximosPorJugador[r.nombre]?.[clave] ?? null),
    }));

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* eslint-disable-next-line jsx-a11y/alt-text -- Image de @react-pdf/renderer, no es <img> de HTML */}
        <Image src="/escudo-nacional.png" style={styles.escudo} />
        <View style={styles.tarjeta}>
          <View style={styles.resultadoFila}>
            <Text style={[styles.resultadoEquipo, { textTransform: "capitalize" }]}>{fechaTexto}</Text>
          </View>
        </View>

        <View style={styles.infoFila}>
          <View style={styles.infoCaja}>
            <Text style={styles.infoEtiqueta}>Tipo</Text>
            <Text style={styles.infoValor}>Entrenamiento</Text>
          </View>
          <View style={styles.infoCaja}>
            <Text style={styles.infoEtiqueta}>Turno</Text>
            <Text style={styles.infoValor}>{sesion.turno ? (TURNO_LABEL[sesion.turno] ?? sesion.turno) : "—"}</Text>
          </View>
          <View style={styles.infoCaja}>
            <Text style={styles.infoEtiqueta}>MD</Text>
            <Text style={styles.infoValor}>{sesion.md ? (sesion.md === "MD" ? "Partido" : sesion.md.replace("MD", "M")) : "—"}</Text>
          </View>
          <View style={styles.infoCaja}>
            <Text style={styles.infoEtiqueta}>Jugadores con GPS</Text>
            <Text style={styles.infoValor}>{sesion.cantidadJugadores}</Text>
          </View>
        </View>

        {sesion.registros.length === 0 ? (
          <Text style={{ textAlign: "center", color: COLORS.muted, marginTop: 20 }}>No hay registros de GPS en esta sesión.</Text>
        ) : (
          <>
            <TituloSeccion>VOLUMEN DEL ENTRENAMIENTO</TituloSeccion>
            <Text style={styles.nota}>El color de cada celda es el % del máximo real del equipo en un entrenamiento esta temporada.</Text>
            <TablaVolumen
              filas={[
                { etiqueta: "Total de la sesión", valores: volumenTotal, referencia: maximoTemporada },
                { etiqueta: "Promedio por jugador", valores: promedioPlantel, referencia: maximoTemporada },
              ]}
            />
            <Leyenda />

            <TituloSeccion marginTop={20}>VOLUMEN POR JUGADOR</TituloSeccion>
            <Text style={styles.nota}>El color de cada celda es el % del máximo histórico real de ESE jugador en esa métrica (entrenamientos + partidos).</Text>
            <View style={styles.tablaHeader}>
              <Text style={styles.tablaHeaderTxtLabel}>Jugador</Text>
              <Text style={styles.tablaHeaderTxt}>Min</Text>
              {METRICAS.map((m) => (
                <Text key={m} style={styles.tablaHeaderTxt}>
                  {ETIQUETA_METRICA[m]}
                </Text>
              ))}
            </View>
            {sesion.registros.map((r, i) => (
              <FilaJugador key={r.id} registro={r} maximoPersonal={maximosPorJugador[r.nombre]} par={i % 2 === 1} />
            ))}
            <Leyenda />
          </>
        )}
        <Footer />
      </Page>

      {sesion.registros.length > 0 && (
        <>
          <Page size="A4" style={styles.page}>
            <TituloSeccion marginTop={0}>CARGA COLECTIVA POR JUGADOR</TituloSeccion>
            <Text style={styles.nota}>El color de cada barra es el % del máximo histórico real de ESE jugador en esa métrica.</Text>
            <GraficoBarrasHorizontal titulo="Distancia" unidad="m" datos={datosBarra("distanciaTotalM", (r) => r.distanciaTotalM)} />
            <GraficoBarrasHorizontal titulo="HSR" unidad="m" datos={datosBarra("distAltaVelocidadM", (r) => r.distAltaVelocidadM)} />
            <GraficoBarrasHorizontal titulo="D. Sprint (zona 6)" unidad="m" datos={datosBarra("distMuyAltaVelocidadM", (r) => r.distMuyAltaVelocidadM)} />
            <Leyenda />
            <Footer />
          </Page>
          <Page size="A4" style={styles.page}>
            <TituloSeccion marginTop={0}>CARGA COLECTIVA POR JUGADOR (CONT.)</TituloSeccion>
            <Text style={styles.nota}>El color de cada barra es el % del máximo histórico real de ESE jugador en esa métrica.</Text>
            <GraficoBarrasHorizontal titulo="Entradas a sprint" unidad="" datos={datosBarra("sprintsCant", (r) => r.sprintEntradasCant)} />
            <GraficoBarrasHorizontal titulo="Aceleraciones" unidad="" datos={datosBarra("aceleracionesCant", (r) => r.aceleracionesCant)} />
            <GraficoBarrasHorizontal titulo="Desaceleraciones" unidad="" datos={datosBarra("desaceleracionesCant", (r) => r.desaceleracionesCant)} />
            <Leyenda />
            <Footer />
          </Page>
        </>
      )}
    </Document>
  );
}

function FilaJugador({ registro, maximoPersonal, par }: { registro: GpsRegistro; maximoPersonal?: VolumenTotal; par?: boolean }) {
  const celda = (clave: MetricaVolumen, valor: number | null) => {
    const pct = porcentajeDeReferencia(valor, maximoPersonal?.[clave] ?? null);
    return <Text style={[styles.celda, { backgroundColor: colorSemaforo(pct) }]}>{valor === null ? "—" : Math.round(valor).toLocaleString("es-UY")}</Text>;
  };
  return (
    <View style={[styles.fila, par ? { backgroundColor: COLORS.grayTint } : {}]} wrap={false}>
      <Text style={styles.celdaLabel}>{formatearNombreJugador(registro.nombre)}</Text>
      <Text style={styles.celda}>{registro.duracionMin ? Math.round(registro.duracionMin) : "—"}</Text>
      {celda("distanciaTotalM", registro.distanciaTotalM)}
      {celda("distAltaVelocidadM", registro.distAltaVelocidadM)}
      {celda("distMuyAltaVelocidadM", registro.distMuyAltaVelocidadM)}
      {celda("sprintsCant", registro.sprintEntradasCant)}
      {celda("aceleracionesCant", registro.aceleracionesCant)}
      {celda("desaceleracionesCant", registro.desaceleracionesCant)}
    </View>
  );
}

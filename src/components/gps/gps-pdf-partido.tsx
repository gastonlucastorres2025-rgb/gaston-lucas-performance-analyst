import { Document, Image, Page, Text, View } from "@react-pdf/renderer";
import { COLORS, registerPdfFonts } from "@/lib/pdf-theme";
import { colorSemaforo, porcentajeDeReferencia } from "@/lib/gps-pdf-helpers";
import { formatearNombreJugador } from "@/lib/gps-nombres";
import { ETIQUETA_METRICA, Footer, GraficoBarrasHorizontal, Leyenda, METRICAS, TablaVolumen, TituloSeccion, styles } from "@/components/gps/gps-pdf-shared";
import type { CargaPartidoJugador } from "@/lib/gps-partidos";
import type { DatosPdfPartido, MetricaVolumen, VolumenTotal } from "@/lib/gps-actions";

export function GpsPdfPartidoDocument({ data }: { data: DatosPdfPartido }) {
  registerPdfFonts();
  const { partido, jugadores, volumenTotal, volumenPrimerTiempo, volumenSegundoTiempo, maximoTemporada } = data;
  const local = partido.condicion === "local";
  const fechaTexto = new Date(`${partido.fecha}T00:00:00`).toLocaleDateString("es-UY", { day: "2-digit", month: "2-digit", year: "numeric" });

  const maxEntrePeriodos: Partial<Record<MetricaVolumen, number | null>> = {};
  for (const m of METRICAS) maxEntrePeriodos[m] = Math.max(volumenPrimerTiempo[m] ?? 0, volumenSegundoTiempo[m] ?? 0) || null;

  const n = jugadores.length;
  const promedioEquipo: VolumenTotal = {} as VolumenTotal;
  for (const m of METRICAS) promedioEquipo[m] = n > 0 && volumenTotal[m] !== null ? (volumenTotal[m] as number) / n : null;

  /** Datos de un gráfico de barras: valor real + % del máximo histórico de ESE jugador en esa
   * métrica (mismo dato real que colorea la tabla "Volumen por jugador", ahora también el color
   * de la barra — nunca un umbral inventado para el gráfico). */
  const datosBarra = (clave: MetricaVolumen, valor: (j: CargaPartidoJugador) => number | null) =>
    jugadores.map((j) => ({
      etiqueta: formatearNombreJugador(j.nombre),
      valor: valor(j) ?? 0,
      pctIndividual: porcentajeDeReferencia(valor(j), data.maximosPorJugador[j.nombre]?.[clave] ?? null),
    }));

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* eslint-disable-next-line jsx-a11y/alt-text -- Image de @react-pdf/renderer, no es <img> de HTML */}
        <Image src="/escudo-nacional.png" style={styles.escudo} />
        <View style={styles.tarjeta}>
          <View style={styles.resultadoFila}>
            <Text style={styles.resultadoEquipo}>{local ? "Nacional" : partido.rival}</Text>
            <Text style={styles.resultadoMarcador}>
              {local ? `${partido.golesFavor} - ${partido.golesContra}` : `${partido.golesContra} - ${partido.golesFavor}`}
            </Text>
            <Text style={styles.resultadoEquipo}>{local ? partido.rival : "Nacional"}</Text>
          </View>
        </View>

        <View style={styles.infoFila}>
          <View style={styles.infoCaja}>
            <Text style={styles.infoEtiqueta}>Fecha</Text>
            <Text style={styles.infoValor}>{fechaTexto}</Text>
          </View>
          <View style={styles.infoCaja}>
            <Text style={styles.infoEtiqueta}>Competencia</Text>
            <Text style={styles.infoValor}>{partido.competencia}</Text>
          </View>
          <View style={styles.infoCaja}>
            <Text style={styles.infoEtiqueta}>Condición</Text>
            <Text style={styles.infoValor}>{local ? "Local" : "Visitante"}</Text>
          </View>
          <View style={styles.infoCaja}>
            <Text style={styles.infoEtiqueta}>Jugadores con GPS</Text>
            <Text style={styles.infoValor}>{jugadores.length}</Text>
          </View>
        </View>

        {jugadores.length === 0 ? (
          <Text style={{ textAlign: "center", color: COLORS.muted, marginTop: 20 }}>
            No hay archivo GPS de este partido — el proveedor no trackeó este día en particular.
          </Text>
        ) : (
          <>
            <TituloSeccion>VOLUMEN TOTAL DEL EQUIPO</TituloSeccion>
            <Text style={styles.nota}>El color de cada celda es el % del máximo real alcanzado por el equipo en un partido esta temporada.</Text>
            <TablaVolumen
              filas={[
                { etiqueta: "Total del partido", valores: volumenTotal, referencia: maximoTemporada },
                { etiqueta: "Promedio por jugador", valores: promedioEquipo, referencia: maximoTemporada },
              ]}
            />
            <Leyenda />

            <TituloSeccion marginTop={24}>CARGA POR PERÍODO</TituloSeccion>
            <Text style={styles.nota}>El color de cada celda es el % contra el período más exigido de este mismo partido (1er vs. 2do tiempo).</Text>
            <TablaVolumen
              filas={[
                { etiqueta: "Primer Tiempo", valores: volumenPrimerTiempo, referencia: maxEntrePeriodos },
                { etiqueta: "Segundo Tiempo", valores: volumenSegundoTiempo, referencia: maxEntrePeriodos },
              ]}
            />
            <Leyenda />
          </>
        )}
        <Footer />
      </Page>

      {jugadores.length > 0 && (
        <Page size="A4" style={styles.page}>
          <TituloSeccion marginTop={0}>VOLUMEN POR JUGADOR</TituloSeccion>
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
          {jugadores.map((j, i) => (
            <FilaJugador key={j.nombre} jugador={j} maximoPersonal={data.maximosPorJugador[j.nombre]} par={i % 2 === 1} />
          ))}
          <Leyenda />
          <Footer />
        </Page>
      )}

      {jugadores.length > 0 && (
        <>
          <Page size="A4" style={styles.page}>
            <TituloSeccion marginTop={0}>CARGA COLECTIVA POR JUGADOR</TituloSeccion>
            <Text style={styles.nota}>El color de cada barra es el % del máximo histórico real de ESE jugador en esa métrica.</Text>
            <GraficoBarrasHorizontal titulo="Distancia" unidad="m" datos={datosBarra("distanciaTotalM", (j) => j.distanciaTotalM)} />
            <GraficoBarrasHorizontal titulo="HSR" unidad="m" datos={datosBarra("distAltaVelocidadM", (j) => j.distAltaVelocidadM)} />
            <GraficoBarrasHorizontal titulo="D. Sprint (zona 6)" unidad="m" datos={datosBarra("distMuyAltaVelocidadM", (j) => j.distMuyAltaVelocidadM)} />
            <Leyenda />
            <Footer />
          </Page>
          <Page size="A4" style={styles.page}>
            <TituloSeccion marginTop={0}>CARGA COLECTIVA POR JUGADOR (CONT.)</TituloSeccion>
            <Text style={styles.nota}>El color de cada barra es el % del máximo histórico real de ESE jugador en esa métrica.</Text>
            <GraficoBarrasHorizontal titulo="Entradas a sprint" unidad="" datos={datosBarra("sprintsCant", (j) => j.sprintsCant)} />
            <GraficoBarrasHorizontal titulo="Aceleraciones" unidad="" datos={datosBarra("aceleracionesCant", (j) => j.aceleracionesCant)} />
            <GraficoBarrasHorizontal titulo="Desaceleraciones" unidad="" datos={datosBarra("desaceleracionesCant", (j) => j.desaceleracionesCant)} />
            <Leyenda />
            <Footer />
          </Page>
        </>
      )}
    </Document>
  );
}

function FilaJugador({ jugador, maximoPersonal, par }: { jugador: CargaPartidoJugador; maximoPersonal?: VolumenTotal; par?: boolean }) {
  const celda = (clave: MetricaVolumen, valor: number | null) => {
    const pct = porcentajeDeReferencia(valor, maximoPersonal?.[clave] ?? null);
    return <Text style={[styles.celda, { backgroundColor: colorSemaforo(pct) }]}>{valor === null ? "—" : Math.round(valor).toLocaleString("es-UY")}</Text>;
  };
  return (
    <View style={[styles.fila, par ? { backgroundColor: COLORS.grayTint } : {}]} wrap={false}>
      <Text style={styles.celdaLabel}>{formatearNombreJugador(jugador.nombre)}</Text>
      <Text style={styles.celda}>{jugador.duracionMin ? Math.round(jugador.duracionMin) : "—"}</Text>
      {celda("distanciaTotalM", jugador.distanciaTotalM)}
      {celda("distAltaVelocidadM", jugador.distAltaVelocidadM)}
      {celda("distMuyAltaVelocidadM", jugador.distMuyAltaVelocidadM)}
      {celda("sprintsCant", jugador.sprintsCant)}
      {celda("aceleracionesCant", jugador.aceleracionesCant)}
      {celda("desaceleracionesCant", jugador.desaceleracionesCant)}
    </View>
  );
}

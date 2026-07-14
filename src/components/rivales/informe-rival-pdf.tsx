import { Document, Image, Link, Page, StyleSheet, Text, View } from "@react-pdf/renderer";
import { COLORS, registerPdfFonts } from "@/lib/pdf-theme";

registerPdfFonts();

const styles = StyleSheet.create({
  page: { padding: 36, fontSize: 10, fontFamily: "Inter", color: COLORS.ink },

  caratula: { alignItems: "center", justifyContent: "center", paddingTop: 80, paddingBottom: 30 },
  crest: { width: 60, height: 60, marginBottom: 16 },
  clubName: { fontSize: 11, fontWeight: 600, color: COLORS.muted, textTransform: "uppercase", letterSpacing: 1 },
  tituloDoc: { fontSize: 16, fontWeight: 700, color: COLORS.blueDark, marginTop: 10 },
  rivalNombre: { fontSize: 28, fontWeight: 700, color: COLORS.blue, marginTop: 18, textAlign: "center" },
  metaLinea: { fontSize: 11, color: COLORS.muted, marginTop: 6 },

  indice: { marginTop: 26, width: "100%", maxWidth: 320 },
  indiceItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    border: `1 solid ${COLORS.border}`,
    borderRadius: 6,
    padding: 8,
    marginBottom: 6,
  },
  indiceDot: { width: 6, height: 6, borderRadius: 3 },
  indiceTexto: { fontSize: 10, flex: 1 },

  firma: { marginTop: 30, paddingTop: 14, borderTop: `1 solid ${COLORS.border}`, alignItems: "center" },
  firmaTitulo: { fontSize: 10.5, fontWeight: 700, color: COLORS.ink },
  firmaSub: { fontSize: 9, color: COLORS.muted, marginTop: 2 },

  seccionTitulo: { fontSize: 14, fontWeight: 700, color: COLORS.blueDark, marginBottom: 10 },
  sectionCard: { borderRadius: 6, border: `1 solid ${COLORS.border}`, overflow: "hidden", marginBottom: 10 },
  sectionHeader: { paddingVertical: 6, paddingHorizontal: 10 },
  sectionHeaderTitle: { fontSize: 9.5, fontWeight: 700, color: "#fff" },
  sectionBody: { padding: 9 },
  bodyText: { fontSize: 9, lineHeight: 1.5 },

  partidoCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    border: `1 solid ${COLORS.border}`,
    borderRadius: 6,
    padding: 9,
    marginBottom: 6,
  },
  partidoTexto: { fontSize: 9.5 },
  partidoMeta: { fontSize: 8.5, color: COLORS.muted, marginTop: 2 },
  resultado: { fontSize: 9.5, fontWeight: 700, backgroundColor: COLORS.grayTint, padding: 4, borderRadius: 4 },

  faseCard: { flexDirection: "row", alignItems: "center", border: `1 solid ${COLORS.border}`, borderRadius: 6, padding: 9, marginBottom: 6 },
  faseNumero: { width: 18, height: 18, borderRadius: 9, backgroundColor: COLORS.amber, color: "#fff", fontSize: 8, fontWeight: 700, textAlign: "center", paddingTop: 4, marginRight: 8 },
  faseNombre: { fontSize: 9.5, fontWeight: 700 },
  faseLink: { fontSize: 7.5, color: COLORS.blue, textDecoration: "underline" },

  footer: {
    position: "absolute",
    bottom: 22,
    left: 36,
    right: 36,
    fontSize: 8,
    color: "#999",
    textAlign: "center",
    borderTop: `1 solid ${COLORS.border}`,
    paddingTop: 8,
  },
});

type Plan = {
  id: string;
  fecha: string | null;
  cancha: string;
  tipo_partido: string;
  fase_ofensiva: { conclusion: string };
  transiciones_ofensivas: { conclusion: string };
  transiciones_defensivas: { conclusion: string };
  presion_zona3: { conclusion: string };
  zona21: { conclusion: string };
  patrones: { etiqueta: string; descripcion: string; implicancia: string }[];
  abp_ofensivas: { conclusion: string };
  abp_defensivas: { conclusion: string };
  claves: string[];
};

type Partido = {
  id: string;
  fecha: string;
  condicion: string | null;
  goles_favor: number | null;
  goles_contra: number | null;
  competencia: string | null;
  youtube_video_id: string;
};

type Carpeta = { id: string; ronda: string; competencia: string; fases: { nombre: string; link: string }[] };

type Evaluacion = "" | "si" | "no" | "parcial";
const EVALUACION_LABEL: Record<Evaluacion, string> = { "": "Sin definir", si: "Sí", no: "No", parcial: "Parcialmente" };

type InformePostPartido = {
  id: string;
  fecha: string | null;
  resultado: string;
  plan_funciono: Evaluacion;
  plan_comentario: string;
  analisis_acertado: Evaluacion;
  analisis_comentario: string;
  conclusiones_generales: string;
};

export type InformeRivalPdfData = {
  rival: { nombre: string; escudoUrl: string | null };
  planes: Plan[];
  partidos: Partido[];
  carpetas: Carpeta[];
  informes: InformePostPartido[];
  crestUrl: string;
};

function SeccionSimple({ titulo, conclusion, color }: { titulo: string; conclusion: string; color: string }) {
  if (!conclusion?.trim()) return null;
  return (
    <View style={styles.sectionCard} wrap={false}>
      <View style={[styles.sectionHeader, { backgroundColor: color }]}>
        <Text style={styles.sectionHeaderTitle}>{titulo}</Text>
      </View>
      <View style={styles.sectionBody}>
        <Text style={styles.bodyText}>{conclusion}</Text>
      </View>
    </View>
  );
}

export function InformeRivalPdfDocument({ data }: { data: InformeRivalPdfData }) {
  const metaLinea = [data.planes[0]?.tipo_partido, data.partidos[0]?.competencia, data.carpetas[0]?.competencia].find(
    Boolean,
  );

  const items = [
    data.planes.length > 0 && { label: "Plan de partido", color: COLORS.blue },
    data.partidos.length > 0 && { label: `Videoanálisis — ${data.partidos.length} partido(s)`, color: COLORS.green },
    data.carpetas.length > 0 && {
      label: `Fases del rival — ${data.carpetas.reduce((n, c) => n + c.fases.length, 0)} link(s) de video`,
      color: COLORS.amber,
    },
    data.informes.length > 0 && { label: `Informe post partido — ${data.informes.length} informe(s)`, color: COLORS.red },
  ].filter((x): x is { label: string; color: string } => !!x);

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.caratula}>
          {/* eslint-disable-next-line jsx-a11y/alt-text -- react-pdf Image, not an HTML img */}
          <Image src={data.crestUrl} style={styles.crest} />
          <Text style={styles.clubName}>Club Nacional de Football</Text>
          <Text style={styles.tituloDoc}>Informe de Rival</Text>
          <Text style={styles.rivalNombre}>{data.rival.nombre}</Text>
          {metaLinea && <Text style={styles.metaLinea}>{metaLinea}</Text>}

          <View style={styles.indice}>
            {items.map((item, i) => (
              <View key={i} style={styles.indiceItem}>
                <View style={[styles.indiceDot, { backgroundColor: item.color }]} />
                <Text style={styles.indiceTexto}>{item.label}</Text>
              </View>
            ))}
          </View>

          <View style={styles.firma}>
            <Text style={styles.firmaTitulo}>Cuerpo Técnico Jorge Bava</Text>
            <Text style={styles.firmaSub}>Analista de Rendimiento: Gastón Lucas Torres</Text>
          </View>
        </View>

        {data.planes.map((plan) => (
          <View key={plan.id} break>
            <Text style={styles.seccionTitulo}>Plan de partido{plan.fecha ? ` — ${plan.fecha}` : ""}</Text>
            <SeccionSimple titulo="Fase ofensiva" conclusion={plan.fase_ofensiva.conclusion} color={COLORS.blue} />
            <SeccionSimple
              titulo="Transiciones ofensivas"
              conclusion={plan.transiciones_ofensivas.conclusion}
              color={COLORS.green}
            />
            <SeccionSimple
              titulo="Transiciones defensivas"
              conclusion={plan.transiciones_defensivas.conclusion}
              color={COLORS.amber}
            />
            <SeccionSimple titulo="Presión zona 3" conclusion={plan.presion_zona3.conclusion} color={COLORS.red} />
            <SeccionSimple titulo="Zona 2 / Zona 1" conclusion={plan.zona21.conclusion} color={COLORS.gray} />

            {plan.patrones.filter((p) => p.etiqueta || p.descripcion).length > 0 && (
              <View style={styles.sectionCard} wrap={false}>
                <View style={[styles.sectionHeader, { backgroundColor: COLORS.blueDark }]}>
                  <Text style={styles.sectionHeaderTitle}>Patrones puntuales</Text>
                </View>
                <View style={styles.sectionBody}>
                  {plan.patrones
                    .filter((p) => p.etiqueta || p.descripcion)
                    .map((p, i) => (
                      <Text key={i} style={[styles.bodyText, { marginBottom: 4 }]}>
                        [{p.etiqueta || "PATRÓN"}] {p.descripcion} {p.implicancia ? `— Implicancia: ${p.implicancia}` : ""}
                      </Text>
                    ))}
                </View>
              </View>
            )}

            <SeccionSimple titulo="ABP ofensivas" conclusion={plan.abp_ofensivas.conclusion} color={COLORS.blue} />
            <SeccionSimple titulo="ABP defensivas" conclusion={plan.abp_defensivas.conclusion} color={COLORS.amber} />

            {plan.claves.filter((c) => c.trim()).length > 0 && (
              <View style={styles.sectionCard} wrap={false}>
                <View style={[styles.sectionHeader, { backgroundColor: COLORS.red }]}>
                  <Text style={styles.sectionHeaderTitle}>Claves del partido</Text>
                </View>
                <View style={styles.sectionBody}>
                  {plan.claves
                    .filter((c) => c.trim())
                    .map((c, i) => (
                      <Text key={i} style={[styles.bodyText, { marginBottom: 3 }]}>
                        {i + 1}. {c}
                      </Text>
                    ))}
                </View>
              </View>
            )}
          </View>
        ))}

        {data.partidos.length > 0 && (
          <View break>
            <Text style={styles.seccionTitulo}>Videoanálisis</Text>
            {data.partidos.map((p) => {
              const tieneResultado = p.goles_favor != null && p.goles_contra != null;
              return (
                <View key={p.id} style={styles.partidoCard} wrap={false}>
                  <View>
                    <Text style={styles.partidoTexto}>
                      {p.condicion === "visitante"
                        ? `${data.rival.nombre} vs Nacional`
                        : `Nacional vs ${data.rival.nombre}`}
                    </Text>
                    <Text style={styles.partidoMeta}>
                      {p.fecha} {p.competencia ? `· ${p.competencia}` : ""}
                    </Text>
                    <Link src={`https://www.youtube.com/watch?v=${p.youtube_video_id}`}>
                      <Text style={[styles.partidoMeta, { color: COLORS.blue, textDecoration: "underline" }]}>
                        Ver video
                      </Text>
                    </Link>
                  </View>
                  {tieneResultado && (
                    <Text style={styles.resultado}>
                      {p.goles_favor}-{p.goles_contra}
                    </Text>
                  )}
                </View>
              );
            })}
          </View>
        )}

        {data.carpetas.length > 0 && (
          <View break>
            <Text style={styles.seccionTitulo}>Fases del rival</Text>
            {data.carpetas.map((c) => (
              <View key={c.id} style={{ marginBottom: 12 }}>
                <Text style={[styles.bodyText, { fontWeight: 700, marginBottom: 6 }]}>
                  {[data.rival.nombre, c.ronda].filter(Boolean).join(" - ")}
                </Text>
                {c.fases.map((f, i) => (
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
            ))}
          </View>
        )}

        {data.informes.length > 0 && (
          <View break>
            <Text style={styles.seccionTitulo}>Informe post partido</Text>
            {data.informes.map((i) => (
              <View key={i.id} style={{ marginBottom: 12 }}>
                <Text style={[styles.bodyText, { fontWeight: 700, marginBottom: 6 }]}>
                  {[i.fecha, i.resultado].filter(Boolean).join(" · ") || "Sin datos"}
                </Text>
                {(i.plan_funciono || i.plan_comentario) && (
                  <View style={styles.sectionCard} wrap={false}>
                    <View style={[styles.sectionHeader, { backgroundColor: COLORS.blue }]}>
                      <Text style={styles.sectionHeaderTitle}>
                        ¿Salió el plan? {i.plan_funciono ? `— ${EVALUACION_LABEL[i.plan_funciono]}` : ""}
                      </Text>
                    </View>
                    {i.plan_comentario && (
                      <View style={styles.sectionBody}>
                        <Text style={styles.bodyText}>{i.plan_comentario}</Text>
                      </View>
                    )}
                  </View>
                )}
                {(i.analisis_acertado || i.analisis_comentario) && (
                  <View style={styles.sectionCard} wrap={false}>
                    <View style={[styles.sectionHeader, { backgroundColor: COLORS.amber }]}>
                      <Text style={styles.sectionHeaderTitle}>
                        ¿El análisis fue acertado? {i.analisis_acertado ? `— ${EVALUACION_LABEL[i.analisis_acertado]}` : ""}
                      </Text>
                    </View>
                    {i.analisis_comentario && (
                      <View style={styles.sectionBody}>
                        <Text style={styles.bodyText}>{i.analisis_comentario}</Text>
                      </View>
                    )}
                  </View>
                )}
                {i.conclusiones_generales && (
                  <View style={styles.sectionCard} wrap={false}>
                    <View style={[styles.sectionHeader, { backgroundColor: COLORS.red }]}>
                      <Text style={styles.sectionHeaderTitle}>Conclusiones generales</Text>
                    </View>
                    <View style={styles.sectionBody}>
                      <Text style={styles.bodyText}>{i.conclusiones_generales}</Text>
                    </View>
                  </View>
                )}
              </View>
            ))}
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

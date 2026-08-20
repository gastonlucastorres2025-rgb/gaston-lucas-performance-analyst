export type Evaluacion = "" | "si" | "no" | "parcial";

export const EVALUACION_LABEL: Record<Evaluacion, string> = {
  "": "Sin definir",
  si: "Sí",
  no: "No",
  parcial: "Parcialmente",
};

export type PreguntaFase = { key: string; texto: string };
export type FaseInforme = { key: string; label: string; preguntas: PreguntaFase[] };

// Catálogo fijo de fases y preguntas del cuestionario post partido, acordado con el
// cuerpo técnico. Vive en código (no en la base) para que agregar/editar preguntas no
// requiera tocar datos ya cargados — las respuestas se guardan en informes_post_partido.fases
// (jsonb) indexadas por fase.key -> pregunta.key.
export const FASES_INFORME: FaseInforme[] = [
  {
    key: "presion_zona_3",
    label: "Presión zona 3",
    preguntas: [
      { key: "presion_alta_planificada", texto: "¿Logramos presionar en zona alta como estaba planificado?" },
      { key: "recuperaciones_campo_rival", texto: "¿La presión generó recuperaciones en campo rival?" },
    ],
  },
  {
    key: "fase_ofensiva",
    label: "Fase ofensiva",
    preguntas: [
      { key: "situaciones_gol_esperadas", texto: "¿Generamos las situaciones de gol esperadas?" },
      { key: "circulacion_planificada", texto: "¿La circulación de pelota fue la planificada?" },
      { key: "estructura_ataque_organizado", texto: "¿Logramos la estructura de ataque organizado?" },
    ],
  },
  {
    key: "fase_defensiva",
    label: "Fase defensiva",
    preguntas: [
      { key: "linea_defensiva_ordenada", texto: "¿La línea defensiva se mantuvo ordenada?" },
      { key: "evitamos_situaciones_buscadas", texto: "¿Concedimos las situaciones que buscábamos evitar?" },
      { key: "rival_ocasiones_claras", texto: "¿El rival tuvo ocasiones claras de gol?" },
      { key: "posicionamiento_esperado", texto: "¿Logramos el posicionamiento esperado?" },
    ],
  },
  {
    key: "transiciones",
    label: "Transiciones",
    preguntas: [
      { key: "aprovechamos_transicion_ofensiva", texto: "¿Aprovechamos bien las transiciones ofensivas?" },
      { key: "expuestos_transicion_defensiva", texto: "¿Nos expusimos en las transiciones defensivas?" },
    ],
  },
  {
    key: "balon_parado",
    label: "Balón parado",
    preguntas: [
      { key: "jugadas_ensayadas_funcionaron", texto: "¿Funcionaron las jugadas ensayadas (córner/tiro libre)?" },
      { key: "concedimos_gol_abp", texto: "¿Concedimos goles o situaciones claras de balón parado?" },
      { key: "situaciones_claras_corner", texto: "¿Generamos situaciones claras con córner?" },
      { key: "situaciones_claras_tiro_libre", texto: "¿Generamos situaciones claras con tiros libres?" },
      { key: "abp_en_contra", texto: "¿Nos generaron situaciones claras de ABP en contra?" },
    ],
  },
];

export type RespuestasFase = { respuestas: Record<string, Evaluacion>; comentario: string };

export type InformePostPartidoData = {
  rival: string;
  fecha: string | null;
  resultado: string;
  competencia: string;
  fases: Record<string, RespuestasFase>;
  otras_observaciones: string;
};

export function informePostPartidoVacio(): InformePostPartidoData {
  const fases: Record<string, RespuestasFase> = {};
  for (const fase of FASES_INFORME) {
    fases[fase.key] = { respuestas: {}, comentario: "" };
  }
  return { rival: "", fecha: null, resultado: "", competencia: "", fases, otras_observaciones: "" };
}

// Cuántas de las preguntas del catálogo tienen una respuesta cargada — se usa para
// mostrar un indicador de avance sin traer todo el informe (ej. en la tarjeta de listado).
export function contarProgreso(fases: Record<string, RespuestasFase> | null | undefined): {
  respondidas: number;
  total: number;
} {
  let total = 0;
  let respondidas = 0;
  for (const fase of FASES_INFORME) {
    for (const pregunta of fase.preguntas) {
      total++;
      if (fases?.[fase.key]?.respuestas?.[pregunta.key]) respondidas++;
    }
  }
  return { respondidas, total };
}

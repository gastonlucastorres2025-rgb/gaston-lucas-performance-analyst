// Notas tácticas manuales del cuerpo técnico — a diferencia del resto del informe, este contenido
// NO se deriva de datos de StatsBomb: es la apreciación del analista/cuerpo técnico sobre patrones
// observados en video/directo. Se muestra siempre etiquetado como tal (nunca mezclado con datos
// reales) para no romper la garantía de "no inventar" del resto del informe.

export type NotaTacticaId =
  | "informacionGeneralEntrenador"
  | "iniciosReinicios"
  | "construccionZona2"
  | "zonaFinalizacion"
  | "defensivaZona3Zona2"
  | "defensivaZona1"
  | "transicionesOfensivas"
  | "transicionesDefensivas";

export type NotasTacticas = Partial<Record<NotaTacticaId, string>>;

/** URLs de imágenes (opcionales, más de una por nota) que ilustran esa nota táctica puntual. */
export type NotasTacticasImagenes = Partial<Record<NotaTacticaId, string[]>>;

/** Enlaces a video (opcionales, más de uno por nota) — típicamente clips de YouTube/Drive que ilustran esa nota
 * táctica puntual. Se muestran en el PDF como una tarjeta clickeable (escudo del rival + nombre de la nota) que
 * lleva directo al video, no como texto plano. */
export type NotasTacticasLinks = Partial<Record<NotaTacticaId, string[]>>;

export type NotaTacticaDef = {
  id: NotaTacticaId;
  label: string;
  placeholder: string;
  /** Fase del informe (misma taxonomía que FASES en opponent-report-pdf.tsx) debajo de la cual se muestra esta nota. */
  fase: "identidad" | "ofensiva" | "defensiva" | "transiciones";
};

export const NOTAS_TACTICAS_DEF: NotaTacticaDef[] = [
  {
    id: "informacionGeneralEntrenador",
    label: "Información general del entrenador",
    placeholder: "Trayectoria, estilo e idea de juego del DT rival...",
    fase: "identidad",
  },
  {
    id: "iniciosReinicios",
    label: "Inicios y reinicios",
    placeholder: "Patrones del rival en salida de arco, saques de meta y reanudaciones...",
    fase: "ofensiva",
  },
  {
    id: "construccionZona2",
    label: "Construcción zona 2",
    placeholder: "Cómo arma el rival la salida en la zona media...",
    fase: "ofensiva",
  },
  {
    id: "zonaFinalizacion",
    label: "Zona de finalización",
    placeholder: "Patrones de ataque en el último tercio...",
    fase: "ofensiva",
  },
  {
    id: "defensivaZona3Zona2",
    label: "Fase defensiva zona 3 / zona 2",
    placeholder: "Cómo presiona/marca el rival en zona 3 y zona 2...",
    fase: "defensiva",
  },
  {
    id: "defensivaZona1",
    label: "Fase defensiva zona 1",
    placeholder: "Cómo defiende el rival cerca de su propia área...",
    fase: "defensiva",
  },
  {
    id: "transicionesOfensivas",
    label: "Transiciones ofensivas",
    placeholder: "Qué hace el rival apenas recupera la pelota...",
    fase: "transiciones",
  },
  {
    id: "transicionesDefensivas",
    label: "Transiciones defensivas",
    placeholder: "Qué hace el rival apenas pierde la pelota...",
    fase: "transiciones",
  },
];

export function notasVacias(): NotasTacticas {
  return {};
}

export function imagenesVacias(): NotasTacticasImagenes {
  return {};
}

export function linksVacios(): NotasTacticasLinks {
  return {};
}

/** Notas (con contenido real, no vacío) que corresponden a una fase del informe, en el orden del catálogo. */
export function notasParaFase(
  fase: NotaTacticaDef["fase"],
  notas: NotasTacticas,
  imagenes?: NotasTacticasImagenes,
  links?: NotasTacticasLinks,
): { id: NotaTacticaId; label: string; texto: string; imagenes: string[]; links: string[] }[] {
  return NOTAS_TACTICAS_DEF.filter((def) => def.fase === fase && notas[def.id]?.trim()).map((def) => ({
    id: def.id,
    label: def.label,
    texto: notas[def.id]!.trim(),
    imagenes: imagenes?.[def.id] ?? [],
    links: links?.[def.id] ?? [],
  }));
}

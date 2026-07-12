export const ROLES = ["G", "LI", "CI", "CD", "LD", "INT", "MC", "EX", "DEL"] as const;
export type Rol = (typeof ROLES)[number];

export type PartidoAnalizado = { fecha: string; rival: string; resultado: string };

export type FaseEstructura = {
  nombre: string;
  formacion: string;
  roles: Record<Rol, string>;
  aereo: string;
  fuente: string;
};

export type SeccionSimple = { fuente: string; conclusion: string };

export type Patron = { etiqueta: string; descripcion: string; referencia: string; implicancia: string };

export type AnalisisRivalData = {
  rival: string;
  fecha: string | null;
  cancha: string;
  tipo_partido: string;
  analista: string;
  partidos_analizados: PartidoAnalizado[];
  fuentes_globales: string;
  estructura_base: FaseEstructura[];
  fase_ofensiva: SeccionSimple;
  transiciones_ofensivas: SeccionSimple;
  transiciones_defensivas: SeccionSimple;
  presion_zona3: SeccionSimple;
  zona21: SeccionSimple;
  patrones: Patron[];
  abp_ofensivas: SeccionSimple;
  abp_defensivas: SeccionSimple;
  claves: string[];
};

export function faseVacia(nombre = ""): FaseEstructura {
  return {
    nombre,
    formacion: "",
    roles: { G: "", LI: "", CI: "", CD: "", LD: "", INT: "", MC: "", EX: "", DEL: "" },
    aereo: "",
    fuente: "",
  };
}

export function patronVacio(): Patron {
  return { etiqueta: "", descripcion: "", referencia: "", implicancia: "" };
}

export function seccionSimpleVacia(): SeccionSimple {
  return { fuente: "", conclusion: "" };
}

export function analisisRivalVacio(): AnalisisRivalData {
  return {
    rival: "",
    fecha: null,
    cancha: "",
    tipo_partido: "",
    analista: "",
    partidos_analizados: [{ fecha: "", rival: "", resultado: "" }],
    fuentes_globales: "",
    estructura_base: [faseVacia("Presión alta")],
    fase_ofensiva: seccionSimpleVacia(),
    transiciones_ofensivas: seccionSimpleVacia(),
    transiciones_defensivas: seccionSimpleVacia(),
    presion_zona3: seccionSimpleVacia(),
    zona21: seccionSimpleVacia(),
    patrones: [patronVacio()],
    abp_ofensivas: seccionSimpleVacia(),
    abp_defensivas: seccionSimpleVacia(),
    claves: ["", "", ""],
  };
}

export type SeccionSimpleId =
  | "fase_ofensiva"
  | "transiciones_ofensivas"
  | "transiciones_defensivas"
  | "presion_zona3"
  | "zona21"
  | "abp_ofensivas"
  | "abp_defensivas";

export const SECCIONES_SIMPLES: { id: SeccionSimpleId; titulo: string; preguntas: string[] }[] = [
  {
    id: "fase_ofensiva",
    titulo: "Fase ofensiva",
    preguntas: [
      "¿Cuál es el patrón de salida/circulación habitual?",
      "¿Quién arma el juego (nombre y dorsal)?",
      "¿Cómo generan superioridad numérica o posicional?",
    ],
  },
  {
    id: "transiciones_ofensivas",
    titulo: "Transiciones ofensivas",
    preguntas: [
      "¿Qué hace el rival apenas recupera la pelota: directo o conserva?",
      "¿Quién ataca la transición (nombre y dorsal)?",
      "¿Hacia qué zona del campo suelen dirigir la transición?",
    ],
  },
  {
    id: "transiciones_defensivas",
    titulo: "Transiciones defensivas",
    preguntas: [
      "¿Contrapresión inmediata o repliegue ordenado?",
      "¿Quién presiona primero y con qué intensidad?",
      "¿Qué espacios deja libres al perder la pelota?",
    ],
  },
  {
    id: "presion_zona3",
    titulo: "Presión zona 3",
    preguntas: [
      "¿Cuáles son los disparadores de la presión alta (pase atrás, pase lateral, control orientado, etc.)?",
      "¿Orientan la presión hacia la banda o hacia el centro?",
      "¿Qué riesgo/espacio genera esa presión para nosotros?",
    ],
  },
  {
    id: "zona21",
    titulo: "Zona 2 / Zona 1",
    preguntas: [
      "¿Cómo se comportan en bloque medio-bajo?",
      "¿Quién corta las líneas de pase interiores?",
      "¿Dejan espacios entre líneas o por fuera?",
    ],
  },
  {
    id: "abp_ofensivas",
    titulo: "ABP ofensivas",
    preguntas: ["¿Qué variantes de córner/tiro libre usan?", "¿Quién remata habitualmente?", "¿Usan bloqueos o pantallas?"],
  },
  {
    id: "abp_defensivas",
    titulo: "ABP defensivas",
    preguntas: [
      "¿Marca zonal, individual o mixta?",
      "¿Quién ataca el primer palo / segundo palo?",
      "¿Qué puntos débiles se observan?",
    ],
  },
];

export const FUENTE_HELP = "Pegar acá lo relevante de Wyscout (eventos/volumen), SICS (clips tageados) y video (minutos de referencia).";

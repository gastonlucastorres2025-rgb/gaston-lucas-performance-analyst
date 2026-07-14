export type Evaluacion = "" | "si" | "no" | "parcial";

export const EVALUACION_LABEL: Record<Evaluacion, string> = {
  "": "Sin definir",
  si: "Sí",
  no: "No",
  parcial: "Parcialmente",
};

export type InformePostPartidoData = {
  rival: string;
  fecha: string | null;
  resultado: string;
  competencia: string;
  plan_funciono: Evaluacion;
  plan_comentario: string;
  analisis_acertado: Evaluacion;
  analisis_comentario: string;
  conclusiones_generales: string;
};

export function informePostPartidoVacio(): InformePostPartidoData {
  return {
    rival: "",
    fecha: null,
    resultado: "",
    competencia: "",
    plan_funciono: "",
    plan_comentario: "",
    analisis_acertado: "",
    analisis_comentario: "",
    conclusiones_generales: "",
  };
}

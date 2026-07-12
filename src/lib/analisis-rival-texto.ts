import type { AnalisisRivalData } from "@/lib/analisis-rival-types";

const SIMPLES_TEXTO: { id: keyof AnalisisRivalData; titulo: string }[] = [
  { id: "fase_ofensiva", titulo: "FASE OFENSIVA" },
  { id: "transiciones_ofensivas", titulo: "TRANSICIONES OFENSIVAS" },
  { id: "transiciones_defensivas", titulo: "TRANSICIONES DEFENSIVAS" },
  { id: "presion_zona3", titulo: "PRESIÓN ZONA 3" },
  { id: "zona21", titulo: "ZONA 2 / ZONA 1" },
];

const ABP_TEXTO: { id: keyof AnalisisRivalData; titulo: string }[] = [
  { id: "abp_ofensivas", titulo: "ABP OFENSIVAS" },
  { id: "abp_defensivas", titulo: "ABP DEFENSIVAS" },
];

export function generarTextoPlan(plan: AnalisisRivalData): string {
  let t = "";
  t += `PLAN DE PARTIDO${plan.rival ? " — " + plan.rival : ""}\n`;
  const meta = [plan.tipo_partido, plan.fecha, plan.cancha].filter(Boolean);
  if (meta.length) t += meta.join(" · ") + "\n";
  if (plan.analista) t += `Analista: ${plan.analista}\n`;

  const partidos = plan.partidos_analizados.filter((p) => p.fecha || p.rival);
  if (partidos.length) {
    t += `\nPARTIDOS ANALIZADOS\n`;
    partidos.forEach((p) => {
      t += `- ${p.fecha} — ${p.rival} — ${p.resultado}\n`;
    });
  }

  const fases = plan.estructura_base.filter((f) => f.nombre || f.formacion);
  if (fases.length) {
    t += `\nESTRUCTURA BASE\n`;
    fases.forEach((f) => {
      t += `\n${f.nombre || "Fase"} (${f.formacion})\n`;
      const rolesTxt = Object.entries(f.roles)
        .filter(([, v]) => v)
        .map(([k, v]) => `${k}: ${v}`)
        .join(" | ");
      if (rolesTxt) t += rolesTxt + "\n";
      if (f.aereo) t += `Duelos aéreos: ${f.aereo}\n`;
    });
  }

  SIMPLES_TEXTO.forEach(({ id, titulo }) => {
    const d = plan[id] as { conclusion: string };
    if (d.conclusion) t += `\n${titulo}\n${d.conclusion}\n`;
  });

  const patrones = plan.patrones.filter((p) => p.etiqueta || p.descripcion);
  if (patrones.length) {
    t += `\nPATRONES PUNTUALES RECURRENTES\n`;
    patrones.forEach((p) => {
      t += `\n[${p.etiqueta || "PATRÓN"}]\n${p.descripcion}\n`;
      if (p.referencia) t += `Ref: ${p.referencia}\n`;
      if (p.implicancia) t += `Implicancia: ${p.implicancia}\n`;
    });
  }

  ABP_TEXTO.forEach(({ id, titulo }) => {
    const d = plan[id] as { conclusion: string };
    if (d.conclusion) t += `\n${titulo}\n${d.conclusion}\n`;
  });

  const claves = plan.claves.filter((c) => c.trim());
  if (claves.length) {
    t += `\nCLAVES DEL PARTIDO\n`;
    claves.forEach((c, i) => {
      t += `${i + 1}. ${c}\n`;
    });
  }

  return t;
}

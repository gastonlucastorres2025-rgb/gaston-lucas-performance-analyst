// Separado de usuarios-actions.ts porque ese archivo es "use server": solo puede exportar funciones
// async, no valores como este array (Next.js rompe el build si un archivo "use server" exporta algo
// que no sea una función).
export type Rol = "admin" | "entrenador" | "asistente_tecnico" | "preparador_fisico" | "medico" | "analista_scouting" | "utilero";

export const ROLES: { value: Rol; label: string }[] = [
  { value: "admin", label: "Admin" },
  { value: "entrenador", label: "Entrenador" },
  { value: "asistente_tecnico", label: "Asistente técnico" },
  { value: "preparador_fisico", label: "Preparador físico" },
  { value: "medico", label: "Médico" },
  { value: "analista_scouting", label: "Analista de scouting" },
  { value: "utilero", label: "Utilero" },
];

/**
 * Nombre reservado en `va_competencia_logos` para el logo genérico de la Liga AUF Uruguaya —
 * se usa como fallback cuando un partido tiene una competencia sin logo propio cargado (ej.
 * "Torneo Clausura" recién importado desde el Sheet, que nunca pasa por el paso de subir logo).
 * Decisión explícita del usuario (2026-08-10): un partido sin logo específico de su competencia
 * debe mostrar el de Liga AUF en vez de quedar sin logo.
 */
export const LOGO_COMPETENCIA_DEFAULT_NOMBRE = "Liga AUF Uruguaya";

/** Logo de la competencia de un partido: el propio si existe, si no el genérico de Liga AUF, si no null. */
export function resolverLogoCompetencia(
  competencia: string | null,
  logosPorCompetencia: Map<string, string | null>,
): string | null {
  if (competencia) {
    const propio = logosPorCompetencia.get(competencia);
    if (propio) return propio;
  }
  return logosPorCompetencia.get(LOGO_COMPETENCIA_DEFAULT_NOMBRE) ?? null;
}

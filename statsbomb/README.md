# Módulo StatsBomb — Informe de próximo rival

Este módulo automatiza la generación de informes de próximo rival a partir de
datos de StatsBomb, dentro de la plataforma de Cuerpo Técnico de Nacional.

**Estado actual: Fase 1-2 completas + primer informe real generado (2026-07-14).**
Credenciales reales cargadas en `.env.local`, los 5 endpoints (competitions,
matches, team-stats, events, lineups) probados contra la cuenta real del
club. Mapeo guardado en Supabase (`statsbomb_connections`,
`statsbomb_team_mapping`, `statsbomb_competition_mapping`). Ver
[STATSBOMB_SETUP.md](./STATSBOMB_SETUP.md) para el detalle completo.

Página funcional en `/statsbomb`: escribís el nombre de un rival y genera un
PDF real (comparación de indicadores, jugadores clave, historial reciente,
muestra de partidos) con datos en vivo de StatsBomb. Probado end-to-end con
Montevideo Wanderers — próximo rival real de Nacional (2026-07-17).

## Documentos

- [IMPLEMENTATION_PLAN.md](./IMPLEMENTATION_PLAN.md) — auditoría del proyecto, decisiones de adaptación, plan por fases.
- [ARCHITECTURE.md](./ARCHITECTURE.md) — dónde vive cada pieza y por qué.
- [METRICS.md](./METRICS.md) — catálogo de métricas y su fuente verificada.
- [STATSBOMB_SETUP.md](./STATSBOMB_SETUP.md) — qué credenciales/documentación faltan y cómo configurar cuando estén disponibles.

## Código

- `src/lib/statsbomb/env.ts` — validación de variables de entorno (sin loguear secretos).
- `src/lib/statsbomb/types.ts` — contratos tipados de las respuestas de StatsBomb, basados en los PDFs oficiales leídos.
- `src/lib/statsbomb/connector.ts` — interfaz `StatsBombConnector` + fábrica real/mock.
- `src/lib/statsbomb/real-connector.ts` — cliente HTTP real (Basic Auth, verificado contra la cuenta real).
- `src/lib/statsbomb/mock-connector.ts` — sirve fixtures anonimizados de `statsbomb/fixtures/`.
- `src/lib/statsbomb/report-data.ts` — motor de datos: últimos `SAMPLE_SIZE` (6) partidos por equipo, agregación por partido, catálogo de métricas, jugadores clave, historial reciente.
- `src/lib/statsbomb-actions.ts` — server action `generarInformeRival`, persiste en `opponent_reports`.
- `src/components/statsbomb/opponent-report-pdf.tsx` — template de PDF fijo (mismo formato para cualquier rival), colores de Nacional, escudos de ambos equipos.
- `src/components/statsbomb/generar-informe-form.tsx` + `src/app/(dashboard)/statsbomb/page.tsx` — UI (nombre del rival → informe → descarga PDF).

## Datos y configuración (no código)

- `statsbomb/fixtures/` — datos simulados anonimizados, estructuralmente fieles a los PDFs oficiales.
- `statsbomb/config/metric_definitions.json` — catálogo de métricas versionado.
- `supabase/migrations/20260716000000_statsbomb.sql` — modelos internos (mapeos, informes, jobs). **Ya aplicada** en Supabase.

## Scripts

- `scripts/verify-statsbomb.mjs` — repite la prueba de conexión real (`getCompetitions`) sin imprimir credenciales.
- `scripts/setup-statsbomb-mapping.mjs` — guarda/actualiza el mapeo de equipo y competencia en Supabase a partir de `.env.local`.

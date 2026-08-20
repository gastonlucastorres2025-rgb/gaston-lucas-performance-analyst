# Plan de implementación — Módulo StatsBomb

## 1. Auditoría del proyecto (hecha)

Stack real de la plataforma (no se reinventa nada de esto):

- Next.js 16 App Router + TypeScript, Server Actions (`"use server"`) en `src/lib/<modulo>-actions.ts`, tipos en `src/lib/<modulo>-types.ts`.
- Supabase Postgres con RLS vía `current_team_id()`; cada tabla tiene `team_id`.
- `staff_users.rol` ya existe como enum: `admin, asistente_tecnico, preparador_fisico, medico, analista_scouting, utilero`. **No hay** un enum genérico "read-only/analyst/admin" como pedía la especificación original — se reutiliza el `rol` existente en vez de crear un segundo sistema de permisos paralelo (ver decisión en la sección 3).
- No existe infraestructura de colas (no hay Redis/BullMQ/similar). Los procesos largos actuales (ej. sync de Team Stats) son scripts Node ejecutados manualmente, no jobs en background dentro de la app.
- PDFs: `@react-pdf/renderer` + `src/lib/pdf-theme.ts`.
- Ningún módulo previo llama a una API externa con credenciales de usuario final — los externos (API-Football, Google service account, Anthropic) usan claves de servidor en `.env.local`, nunca expuestas al cliente. El módulo StatsBomb sigue el mismo patrón.
- El módulo más cercano en propósito es `Análisis de Rival` (`analisis_rival` + `analisis-rival-actions.ts`): un wizard editable con autosave y export a PDF. `Informes Post Partido` es más simple (evaluación de plan de partido). Ninguno de los dos tiene componentes de fetching automático de una API externa de datos — ese es el elemento nuevo real que aporta este módulo.

## 2. Preguntas críticas — resueltas (2026-07-14)

1. **¿Licencia cubre Primera División Uruguay?** Sí, confirmado por el club.
2. **Autenticación**: confirmada como HTTP Basic Auth con usuario/contraseña
   (`videoanalisisnacional@gmail.com`), verificada con una llamada real a
   `GET /api/v4/competitions` (200 OK, 14 competencias visibles).
3. **Dominio real**: `https://data.statsbomb.com` (ninguno de los dos
   dominios que aparecían en los PDFs oficiales resultó ser exactamente
   ese, aunque coincide con el usado en el PDF de Lineups v5).
4. **IDs reales obtenidos**: Primera División Uruguay 2026 =
   `competition_id 111`, `season_id 316`. Nacional dentro de StatsBomb =
   `team_id 1985`. Guardados en `statsbomb_team_mapping` /
   `statsbomb_competition_mapping` vía `scripts/setup-statsbomb-mapping.mjs`.
5. **Detección de "próximo rival oficial"**: StatsBomb sigue sin servir para
   esto (es histórico, no fixtures en vivo). Ya existe
   `fetchProximoRivalEnLiga` en `src/lib/api-football.ts` para esa función —
   el módulo StatsBomb debe *recibir* el rival ya identificado, no intentar
   detectarlo por sí mismo.

Los 5 endpoints están verificados contra datos reales (partido Torque vs.
Nacional, 2026-03-28, `match_id 4054064`): `getCompetitions` (200),
`getMatches` (200), `getTeamMatchStats` (200, 2 filas — una por equipo),
`getEvents` (200, 2803 eventos) y `getLineups` (200, 2 filas). No queda
ninguna pregunta abierta de Fase 1 sin resolver.

## 3. Decisiones de adaptación respecto de la especificación original

La especificación pedida (carpetas `connectors/`, `analytics/`,
`visualizations/`, colas asíncronas con 10 estados, RBAC de 4 roles nuevos,
22 secciones de informe, 15 visualizaciones obligatorias, 7 documentos) está
dimensionada para un equipo de datos con infraestructura de nivel
enterprise. Esta plataforma es una app Next.js/Supabase de un solo desarrollador
para un cuerpo técnico. Adaptaciones concretas:

- **Carpetas**: código en `src/lib/statsbomb/` (convención real del repo),
  no un árbol `StatsBomb/connectors/adapters/...` paralelo. Datos/config/docs
  no-código sí viven en `statsbomb/` en la raíz (fixtures, metric_definitions.json, docs).
- **RBAC**: se reutiliza `staff_users.rol`. `admin` = puede configurar
  StatsBomb y eliminar informes (políticas RLS en la migración ya lo
  aplican). El resto de roles puede generar/ver informes. No se creó un
  segundo enum de permisos.
- **Colas asíncronas**: sin infraestructura de colas real, se modela el
  pipeline como una fila de estados en Postgres (`opponent_reports.estado`,
  tabla `opponent_report_jobs`) que un Server Action recorre de forma
  síncrona (o un cron/Edge Function más adelante). Esto dejará una
  abstracción (`estado` con los mismos nombres pedidos:
  queued/validating/fetching/processing/analyzing/visualizing/rendering/completed/failed/cancelled)
  lista para conectarse a una cola real si en el futuro se necesita, sin
  bloquear el desarrollo actual por no tener Redis.
- **22 secciones / 15 visualizaciones**: no se construyen todas en Fase 1.
  Se prioriza lo que es construible con datos *verificados* (Team Match
  Stats + Events): comparación de indicadores, xG, mapas de tiros, mapas de
  presión/recuperación. Secciones que dependen de datos no leídos aún
  (jugadores clave, HOPS) esperan a leer Player Match/Season Stats.

## 4. Fases

- **Fase 1 (esta entrega)**: auditoría, estructura, `.env.local.example`,
  validación de env, contratos tipados, conector real+mock, fixtures,
  catálogo de métricas inicial, migración SQL (no aplicada), documentación.
- **Fase 2** (pendiente, requiere resolver preguntas de la sección 2 o
  decidir seguir solo con mock): normalización de eventos, control de
  calidad de muestra, cache de respuestas StatsBomb.
- **Fase 3**: motor de métricas por partido/rango, selección de muestra de
  próximo rival (una vez identificado por `api-football.ts`).
- **Fase 4**: visualizaciones (SVG/recharts, reutilizando patrones de
  `Métricas de Rendimiento`), plantilla de informe, export PDF con
  `pdf-theme.ts`.
- **Fase 5**: UI (nueva ruta `(dashboard)/statsbomb`), historial, estados de
  job, permisos en la UI.
- **Fase 6**: tests, revisión de seguridad, flujo mock end-to-end completo.

No se avanza a Fase 2 con conexión real hasta que el usuario confirme
licencia + autenticación. Se puede avanzar Fase 2-4 en modo mock (fixtures)
sin esa confirmación, si se prefiere validar el pipeline completo primero.

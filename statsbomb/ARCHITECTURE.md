# Arquitectura — Módulo StatsBomb

```
src/lib/statsbomb/
  env.ts              validación de variables de entorno, sin loguear secretos
  types.ts            contratos tipados (Competitions, Matches, Team Match Stats,
                       Events, Lineups) basados en los PDFs oficiales leídos
  connector.ts         interfaz StatsBombConnector + fábrica real/mock
  real-connector.ts     cliente HTTP real (fetch + Basic Auth / Bearer)
  mock-connector.ts     sirve fixtures anonimizados

statsbomb/
  fixtures/            datos simulados (competitions.json, matches.json,
                       team-match-stats.json, events.json, lineups.json)
  config/
    metric_definitions.json   catálogo de métricas versionado
  README.md, IMPLEMENTATION_PLAN.md, ARCHITECTURE.md, METRICS.md, STATSBOMB_SETUP.md

supabase/migrations/
  20260716000000_statsbomb.sql   statsbomb_connections, statsbomb_team_mapping,
                                  statsbomb_competition_mapping, opponent_reports,
                                  opponent_report_jobs
```

## Flujo de datos

```
UI / Server Action
      │
      ▼
getStatsBombConnector()  ──┐
      │                    │ si faltan env vars → mock-connector (fixtures)
      │                    │ si están completas  → real-connector (HTTP real)
      ▼                    │
StatsBombConnector  ◄──────┘
      │
      ▼
(Fase 3) analytics engine — calcula metric_definitions.json a partir de
Team Match Stats + Events del rango de partidos elegido
      │
      ▼
(Fase 4) visualizaciones + plantilla de informe
      │
      ▼
opponent_reports (Postgres, RLS por team_id) + PDF en Storage
```

## Por qué el conector es una interfaz

`getStatsBombConnector()` es el único punto donde el resto del módulo decide
entre datos reales y datos simulados. Ningún código de analytics/reports debe
importar `real-connector.ts` o `mock-connector.ts` directamente — así, el día
que se confirme la licencia/autenticación real, solo cambia `.env.local` y
nada más en el código.

## Seguridad

- Credenciales solo en variables de entorno de servidor (`STATSBOMB_API_*`),
  nunca en el bundle de cliente (todo el módulo corre en Server
  Components/Actions).
- `real-connector.ts` nunca incluye headers/credenciales en mensajes de
  error (`StatsBomb API respondió 404 para /api/...`, sin más detalle).
- `statsbomb_connections` guarda solo `configurado: boolean` y
  `ultimo_error: text` — nunca el valor de las credenciales.
- Configurar StatsBomb (mapear equipo/competencia) y eliminar informes está
  restringido por RLS a `staff_users.rol = 'admin'`.
- `.gitignore` ya excluye todo `.env*`; no se necesitó ninguna regla nueva.

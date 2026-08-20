# Configuración de StatsBomb

## Estado actual

**Conexión real verificada (2026-07-14).** Con las credenciales provistas
por el club (`videoanalisisnacional@gmail.com`), `GET /api/v4/competitions`
contra `https://data.statsbomb.com` respondió 200 con 14 competencias
visibles, incluyendo la Primera División de Uruguay. Datos confirmados:

- Dominio real: `https://data.statsbomb.com` (no los que aparecían en los
  PDFs oficiales — ver más abajo).
- Autenticación real: HTTP Basic Auth con usuario/contraseña. Confirmado
  funcionando, no es una suposición.
- Primera División Uruguay 2026: `competition_id=111`, `season_id=316`.
- Nacional dentro de StatsBomb: `team_id=1985`.
- Este mapeo ya está guardado en `statsbomb_connections` /
  `statsbomb_team_mapping` / `statsbomb_competition_mapping` (ver
  `scripts/setup-statsbomb-mapping.mjs`).

Sin las variables de entorno de abajo, el módulo sigue cayendo
automáticamente al conector mock (`src/lib/statsbomb/mock-connector.ts`)
con fixtures de `statsbomb/fixtures/` — eso ya no aplica en este entorno
porque `.env.local` tiene las credenciales reales cargadas.

Los 5 endpoints ya están probados contra un `match_id` real (Torque vs.
Nacional, 2026-03-28, `match_id 4054064`): `getTeamMatchStats` (2 filas),
`getEvents` (2803 eventos), `getLineups` (2 filas), además de
`getCompetitions` y `getMatches`.

## Resolución de las 3 preguntas abiertas de la auditoría original

1. **Licencia**: confirmada por el club — incluye Primera División Uruguay.
2. **Autenticación**: Basic Auth confirmado, no era una suposición sin
   verificar.
3. **Dominio**: ninguno de los dos dominios de los PDFs
   (`data.statsbombservices.com` / `data.statsbom.com`) es el real para esta
   cuenta — el real es `data.statsbomb.com` (coincide con el dominio del
   PDF de Lineups v5, que resultó ser el correcto).

## Variables de entorno

Copiar de `.env.local.example` a `.env.local` (nunca commitear `.env.local`
con valores reales — ya está en `.gitignore`):

```
STATSBOMB_API_BASE_URL=
STATSBOMB_API_USERNAME=
STATSBOMB_API_PASSWORD=
STATSBOMB_API_TOKEN=
STATSBOMB_COMPETITION_ID=
STATSBOMB_SEASON_ID=
STATSBOMB_OUR_TEAM_ID=
STATSBOMB_OUR_TEAM_NAME=
```

- Si se usa Bearer token: completar `STATSBOMB_API_TOKEN` y dejar
  usuario/contraseña vacíos — `real-connector.ts` prioriza el token si
  está presente.
- `STATSBOMB_COMPETITION_ID` / `STATSBOMB_SEASON_ID`: IDs numéricos que
  devuelve `GET /api/v4/competitions` para la competencia de Nacional.
- `STATSBOMB_OUR_TEAM_ID` / `STATSBOMB_OUR_TEAM_NAME`: el `team_id`/nombre
  de Nacional dentro de StatsBomb (se obtiene de cualquier partido en
  `GET /api/v6/competitions/{id}/seasons/{id}/matches`).

## Cómo verificar que quedó bien configurado

Con las variables completas, `getStatsBombConnector()` devuelve el
conector real (`mode: "real"`). Correr `node scripts/verify-statsbomb.mjs`
(con el node de nvm: `/Users/carloslucas/.nvm/versions/node/v24.18.0/bin/node`)
para repetir la prueba de `getCompetitions()` en cualquier momento — nunca
imprime credenciales, solo el status HTTP y las competencias visibles.

## Nunca hacer

- No pegar credenciales reales en este archivo, en `.env.local.example`, ni
  en ningún archivo versionado.
- No loguear el valor de `STATSBOMB_API_TOKEN`/`PASSWORD` en consola ni en
  `opponent_report_jobs.log`.
- No incluir credenciales en mensajes de error devueltos al usuario (ver
  `request()` en `real-connector.ts`).

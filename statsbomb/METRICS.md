# Catálogo de métricas

Fuente única: [`config/metric_definitions.json`](./config/metric_definitions.json).
Cada métrica cita el campo exacto de la documentación oficial de StatsBomb
que la respalda (`Team Match Stats v3`). No hay métricas inventadas: si una
métrica del pedido original (ej. HOPS por jugador, xG en ABP desglosado) no
tiene un campo confirmado en los documentos leídos hasta ahora, queda listada
en la clave `"pendientes"` del JSON en vez de simularse.

## Documentos StatsBomb ya leídos (fuente de verdad)

- API Competitions v4.0.0
- API Matches v6.0.0
- API Team Match Stats v3.0.0
- API Events v10.0.0
- API Lineups v5.0.0

## Documentos pendientes de lectura antes de ampliar el catálogo

- API Player Match Stats v7.0.0 — necesario para métricas por jugador.
- API Team Season Stats v3.0.0 — necesario para agregados de temporada (vs. por partido).
- API Player Mapping v1.0.0
- API Player Season Stats v6.0.0

## Métricas derivadas de Events (no precalculadas por StatsBomb)

Mapas de tiros, redes de pase, mapas de progresión, zonas de recuperación y
pérdida peligrosa, acciones de presión, ataques de transición y ABP se
construyen evento por evento a partir de `getEvents()` en el analytics
engine de Fase 3 — no son un campo directo de Team Match Stats. Se
documentará ahí la lógica exacta (tipo de evento, `play_pattern`,
coordenadas) citando la sección del PDF de Events v10 usada, para no
inventar la definición de "transición" o "pérdida peligrosa".

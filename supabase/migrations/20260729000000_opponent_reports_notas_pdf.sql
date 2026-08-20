-- Notas tácticas manuales del cuerpo técnico (una por fase táctica: inicios y reinicios,
-- construcción zona 2, zona de finalización, fase defensiva zona 3/2, fase defensiva zona 1,
-- transiciones ofensivas, transiciones defensivas) y guardado del PDF real generado, para tener
-- un historial descargable de los informes de rival — no solo los datos crudos que ya se
-- guardaban en `contenido`.
alter table opponent_reports add column if not exists notas_tacticas jsonb not null default '{}'::jsonb;

-- `pdf_url` ya existía (siempre null hasta ahora, ninguna ruta la completaba). Pasa a guardar el
-- path dentro del bucket privado `opponent-reports-pdf` (no una URL pública) — el archivo se sirve
-- server-side vía /api/statsbomb/informes/[id]/pdf, mismo patrón que gps-snapshots.
comment on column opponent_reports.pdf_url is 'Path dentro del bucket privado opponent-reports-pdf (no una URL pública). Null si el informe se generó pero nunca se descargó/guardó como PDF.';

insert into storage.buckets (id, name, public)
values ('opponent-reports-pdf', 'opponent-reports-pdf', false)
on conflict (id) do nothing;

-- Permite adjuntar el Keynote (u otro archivo de plan de partido: PDF, PPTX) preparado
-- para el rival, directamente en su ficha (rivales) — visible en la tarjeta "Plan de
-- partido" de la página del rival sin pasar por el cuestionario de Análisis de Rival.

alter table rivales
  add column if not exists keynote_url text,
  add column if not exists keynote_nombre text;

insert into storage.buckets (id, name, public)
values ('rivales-keynote', 'rivales-keynote', true)
on conflict (id) do nothing;

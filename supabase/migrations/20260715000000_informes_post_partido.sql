-- Informe Post Partido: cuestionario por fases (presión zona 3, fase ofensiva,
-- fase defensiva, transiciones, balón parado) con preguntas cerradas
-- (Sí/Parcialmente/No) + comentario por fase, más observaciones generales al
-- final. El catálogo de fases/preguntas vive en código
-- (informes-post-partido-types.ts) — acá sólo se guardan las respuestas, por
-- eso "fases" es jsonb y no columnas fijas por pregunta. No se conecta con
-- Videoanálisis (ahí no hay nada del rival).

create table informes_post_partido (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references teams (id) on delete cascade,
  rival_id uuid references rivales (id) on delete set null,

  rival text not null default '',
  fecha date,
  resultado text not null default '',
  competencia text not null default '',

  fases jsonb not null default '{}'::jsonb,
  otras_observaciones text not null default '',

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table informes_post_partido enable row level security;

create policy "staff gestiona informes_post_partido de su equipo" on informes_post_partido
  for all using (team_id = current_team_id()) with check (team_id = current_team_id());

-- Análisis de Rival / Plan de Partido: estructura basada en
-- PROMPT_Analisis_Rival.md (Portada, Estructura base, Fase ofensiva,
-- Transiciones, Presión, Zona 2/1, Patrones puntuales, ABP, Claves).

create table analisis_rival (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references teams (id) on delete cascade,

  rival text not null default '',
  fecha date,
  cancha text not null default '',
  tipo_partido text not null default '',
  analista text not null default '',
  partidos_analizados jsonb not null default '[]'::jsonb,

  fuentes_globales text not null default '',

  estructura_base jsonb not null default '[]'::jsonb,
  fase_ofensiva jsonb not null default '{"fuente":"","conclusion":""}'::jsonb,
  transiciones_ofensivas jsonb not null default '{"fuente":"","conclusion":""}'::jsonb,
  transiciones_defensivas jsonb not null default '{"fuente":"","conclusion":""}'::jsonb,
  presion_zona3 jsonb not null default '{"fuente":"","conclusion":""}'::jsonb,
  zona21 jsonb not null default '{"fuente":"","conclusion":""}'::jsonb,
  patrones jsonb not null default '[]'::jsonb,
  abp_ofensivas jsonb not null default '{"fuente":"","conclusion":""}'::jsonb,
  abp_defensivas jsonb not null default '{"fuente":"","conclusion":""}'::jsonb,
  claves jsonb not null default '[]'::jsonb,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table analisis_rival enable row level security;

create policy "staff gestiona analisis_rival de su equipo" on analisis_rival
  for all using (team_id = current_team_id()) with check (team_id = current_team_id());

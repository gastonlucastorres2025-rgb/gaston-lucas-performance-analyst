-- Fases del Rival: conecta con una carpeta de Google Drive (una carpeta por
-- rival/ronda, un video por fase adentro) y guarda los links para armar un
-- PDF prolijo con carátula.

create table fases_rival (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references teams (id) on delete cascade,

  carpeta_url text not null,
  carpeta_id text not null,
  rival text not null default '',
  ronda text not null default '',
  competencia text not null default '',
  fases jsonb not null default '[]'::jsonb,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table fases_rival enable row level security;

create policy "staff gestiona fases_rival de su equipo" on fases_rival
  for all using (team_id = current_team_id()) with check (team_id = current_team_id());

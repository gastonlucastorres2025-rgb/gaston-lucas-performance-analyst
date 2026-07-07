-- Partidos y eventos de calendario (viajes, etc.)

create table matches (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references teams (id) on delete cascade,
  fecha date not null,
  tipo text not null default 'partido' check (tipo in ('partido', 'viaje', 'evento')),
  competencia text,
  ronda text,
  rival text,
  escudo_rival_url text,
  estadio text,
  condicion text check (condicion in ('local', 'visitante')),
  resultado_propio int,
  resultado_rival int,
  notas text,
  created_at timestamptz not null default now()
);

alter table matches enable row level security;

create policy "staff gestiona partidos de su equipo" on matches
  for all
  using (team_id = current_team_id())
  with check (team_id = current_team_id());

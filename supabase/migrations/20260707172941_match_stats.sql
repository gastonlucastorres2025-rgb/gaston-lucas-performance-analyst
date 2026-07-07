-- Metricas de rendimiento: estadisticas de equipo por partido (fuente: export tipo Wyscout)

create table match_stats (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references teams (id) on delete cascade,
  match_id uuid references matches (id) on delete set null,
  fecha date not null,
  rival text not null,
  competencia text,
  condicion text check (condicion in ('local', 'visitante')),
  duracion int,
  escudo_rival_url text,
  goles_favor int,
  goles_contra int,
  xg_favor numeric,
  xg_contra numeric,
  posesion numeric,
  stats_nacional jsonb not null,
  stats_rival jsonb not null,
  created_at timestamptz not null default now()
);

alter table match_stats enable row level security;

create policy "staff gestiona metricas de su equipo" on match_stats
  for all
  using (team_id = current_team_id())
  with check (team_id = current_team_id());

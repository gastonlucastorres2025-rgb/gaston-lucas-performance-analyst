-- Valor real de cada equipo de la liga por métrica (mismo criterio de muestra
-- que statsbomb_league_baseline: últimos 6 partidos disponibles). Permite
-- graficar scatter plots reales con todos los equipos de la competencia,
-- no solo el promedio/desvío agregado.

create table statsbomb_league_team_values (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references teams (id) on delete cascade,
  competition_id int not null,
  season_id int not null,
  metric_id text not null,
  statsbomb_team_id int not null,
  statsbomb_team_name text not null,
  valor numeric not null,
  computed_at timestamptz not null default now(),
  unique (team_id, competition_id, season_id, metric_id, statsbomb_team_id)
);

alter table statsbomb_league_team_values enable row level security;

create policy "staff ve valores de equipos de liga de su equipo" on statsbomb_league_team_values
  for select using (team_id = current_team_id());

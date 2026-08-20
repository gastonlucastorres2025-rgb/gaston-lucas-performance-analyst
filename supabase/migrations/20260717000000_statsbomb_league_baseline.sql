-- Baseline de liga para comparaciones "promedio de liga" y "percentil" en los
-- informes de rival. Se calcula periódicamente con
-- scripts/compute-statsbomb-league-baseline.mjs (no en cada generación de
-- informe, porque implica ~16 equipos x 6 partidos de llamadas a StatsBomb).

create table statsbomb_league_baseline (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references teams (id) on delete cascade,
  competition_id int not null,
  season_id int not null,
  metric_id text not null,
  promedio numeric not null,
  desvio_estandar numeric not null,
  minimo numeric not null,
  maximo numeric not null,
  equipos_muestreados int not null,
  computed_at timestamptz not null default now(),
  unique (team_id, competition_id, season_id, metric_id)
);

alter table statsbomb_league_baseline enable row level security;

create policy "staff ve baseline de liga de su equipo" on statsbomb_league_baseline
  for select using (team_id = current_team_id());

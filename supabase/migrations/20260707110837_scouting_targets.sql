-- Scouting: jugadores externos en seguimiento (fuente: planilla de scouting)

create table scouting_targets (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references teams (id) on delete cascade,
  nombre text not null,
  apellido text not null,
  equipo_actual text,
  liga text,
  pais_liga text,
  fecha_nacimiento date,
  nacionalidad text,
  posicion text,
  club_formativo text,
  proceso_seleccion boolean,
  experiencia_altura boolean,
  categoria text check (categoria in ('A', 'B+', 'B', 'C')),
  etiqueta text,
  observaciones text,
  created_at timestamptz not null default now()
);

alter table scouting_targets enable row level security;

create policy "staff gestiona scouting de su equipo" on scouting_targets
  for all
  using (team_id = current_team_id())
  with check (team_id = current_team_id());

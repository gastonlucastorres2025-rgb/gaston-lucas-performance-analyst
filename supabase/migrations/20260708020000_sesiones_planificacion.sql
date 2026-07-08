-- Planificacion de sesiones de entrenamiento: contenido de la sesion,
-- disponibilidad de jugadores y equipos armados para el dia.

create table sesiones (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references teams (id) on delete cascade,
  fecha date not null,
  lugar text,
  activacion text,
  introductorio text,
  principal text,
  objetivos_tarea text,
  objetivos_fisicos text,
  jugadores_estado jsonb not null default '{}'::jsonb,
  equipos jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (team_id, fecha)
);

alter table sesiones enable row level security;

create policy "staff gestiona sesiones de su equipo" on sesiones
  for all
  using (team_id = current_team_id())
  with check (team_id = current_team_id());

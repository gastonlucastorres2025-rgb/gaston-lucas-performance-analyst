-- Informes: documentos subidos por el cuerpo tecnico (informe de rival, plan de partido, etc.)

create table informes (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references teams (id) on delete cascade,
  tipo text not null check (tipo in ('informe_rival', 'plan_partido', 'post_partido')),
  titulo text not null,
  rival text,
  match_id uuid references matches (id) on delete set null,
  fecha date,
  storage_path text not null,
  tamano_bytes bigint,
  created_at timestamptz not null default now()
);

alter table informes enable row level security;

create policy "staff gestiona informes de su equipo" on informes
  for all
  using (team_id = current_team_id())
  with check (team_id = current_team_id());

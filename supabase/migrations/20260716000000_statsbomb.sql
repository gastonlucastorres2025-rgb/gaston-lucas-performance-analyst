-- Modulo StatsBomb: mapeos de equipo/competencia e informes de proximo rival.
-- No se guardan credenciales acá (esas viven solo en variables de entorno,
-- ver src/lib/statsbomb/env.ts). Esta tabla guarda únicamente metadatos no
-- sensibles sobre el estado de la configuración.

create table statsbomb_connections (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references teams (id) on delete cascade,
  configurado boolean not null default false,
  ultima_verificacion timestamptz,
  ultimo_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table statsbomb_team_mapping (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references teams (id) on delete cascade,
  statsbomb_team_id int not null,
  statsbomb_team_name text not null,
  created_at timestamptz not null default now(),
  unique (team_id, statsbomb_team_id)
);

create table statsbomb_competition_mapping (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references teams (id) on delete cascade,
  statsbomb_competition_id int not null,
  statsbomb_season_id int not null,
  nombre text not null,
  created_at timestamptz not null default now(),
  unique (team_id, statsbomb_competition_id, statsbomb_season_id)
);

create table opponent_reports (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references teams (id) on delete cascade,
  rival text not null,
  rival_statsbomb_team_id int,
  estado text not null default 'queued' check (
    estado in ('queued', 'validating', 'fetching', 'processing', 'analyzing', 'visualizing', 'rendering', 'completed', 'failed', 'cancelled')
  ),
  error text,
  -- Contenido del informe (métricas, hallazgos, comparaciones, plan de partido)
  -- como jsonb, siguiendo el mismo patrón que analisis_rival e informes_post_partido.
  contenido jsonb not null default '{}'::jsonb,
  partidos_analizados jsonb not null default '[]'::jsonb,
  pdf_url text,
  creado_por uuid references staff_users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table opponent_report_jobs (
  id uuid primary key default gen_random_uuid(),
  opponent_report_id uuid not null references opponent_reports (id) on delete cascade,
  estado text not null default 'queued' check (
    estado in ('queued', 'validating', 'fetching', 'processing', 'analyzing', 'visualizing', 'rendering', 'completed', 'failed', 'cancelled')
  ),
  correlation_id uuid not null default gen_random_uuid(),
  log jsonb not null default '[]'::jsonb,
  started_at timestamptz,
  finished_at timestamptz,
  created_at timestamptz not null default now()
);

alter table statsbomb_connections enable row level security;
alter table statsbomb_team_mapping enable row level security;
alter table statsbomb_competition_mapping enable row level security;
alter table opponent_reports enable row level security;
alter table opponent_report_jobs enable row level security;

create policy "staff ve conexion statsbomb de su equipo" on statsbomb_connections
  for select using (team_id = current_team_id());
create policy "admin gestiona conexion statsbomb" on statsbomb_connections
  for all using (
    team_id = current_team_id()
    and exists (select 1 from staff_users where id = auth.uid() and rol = 'admin')
  )
  with check (
    team_id = current_team_id()
    and exists (select 1 from staff_users where id = auth.uid() and rol = 'admin')
  );

create policy "staff ve mapeos statsbomb de su equipo" on statsbomb_team_mapping
  for select using (team_id = current_team_id());
create policy "admin gestiona mapeos de equipo" on statsbomb_team_mapping
  for all using (
    team_id = current_team_id()
    and exists (select 1 from staff_users where id = auth.uid() and rol = 'admin')
  )
  with check (
    team_id = current_team_id()
    and exists (select 1 from staff_users where id = auth.uid() and rol = 'admin')
  );

create policy "staff ve mapeos de competencia de su equipo" on statsbomb_competition_mapping
  for select using (team_id = current_team_id());
create policy "admin gestiona mapeos de competencia" on statsbomb_competition_mapping
  for all using (
    team_id = current_team_id()
    and exists (select 1 from staff_users where id = auth.uid() and rol = 'admin')
  )
  with check (
    team_id = current_team_id()
    and exists (select 1 from staff_users where id = auth.uid() and rol = 'admin')
  );

create policy "staff ve informes de rival de su equipo" on opponent_reports
  for select using (team_id = current_team_id());
create policy "staff gestiona informes de rival de su equipo" on opponent_reports
  for insert with check (team_id = current_team_id());
create policy "staff actualiza informes de rival de su equipo" on opponent_reports
  for update using (team_id = current_team_id()) with check (team_id = current_team_id());
create policy "admin elimina informes de rival" on opponent_reports
  for delete using (
    team_id = current_team_id()
    and exists (select 1 from staff_users where id = auth.uid() and rol = 'admin')
  );

create policy "staff ve jobs de informes de su equipo" on opponent_report_jobs
  for select using (
    exists (
      select 1 from opponent_reports r
      where r.id = opponent_report_jobs.opponent_report_id and r.team_id = current_team_id()
    )
  );

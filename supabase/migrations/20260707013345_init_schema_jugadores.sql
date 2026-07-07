-- Fase 1: equipos, staff del cuerpo tecnico, jugadores y datos fisicos

create extension if not exists pgcrypto;

create table teams (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  categoria text,
  temporada text,
  created_at timestamptz not null default now()
);

create table staff_users (
  id uuid primary key references auth.users (id) on delete cascade,
  team_id uuid not null references teams (id) on delete cascade,
  nombre text not null,
  rol text not null check (
    rol in (
      'admin',
      'asistente_tecnico',
      'preparador_fisico',
      'medico',
      'analista_scouting',
      'utilero'
    )
  ),
  email text not null,
  created_at timestamptz not null default now()
);

create table players (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references teams (id) on delete cascade,
  nombre text not null,
  apellido text not null,
  fecha_nacimiento date,
  posicion_principal text,
  posiciones_secundarias text[] not null default '{}',
  dorsal int,
  pie_habil text check (pie_habil in ('izquierdo', 'derecho', 'ambidiestro')),
  nacionalidad text,
  foto_url text,
  estado text not null default 'activo' check (estado in ('activo', 'cedido', 'baja')),
  created_at timestamptz not null default now()
);

create table player_physical_data (
  id uuid primary key default gen_random_uuid(),
  player_id uuid not null references players (id) on delete cascade,
  fecha date not null default current_date,
  peso numeric,
  altura numeric,
  grasa_corporal numeric,
  velocidad numeric,
  vo2max numeric,
  notas text,
  created_at timestamptz not null default now()
);

-- Devuelve el team_id del staff logueado; security definer evita
-- recursion infinita al usarla dentro de las policies de staff_users.
create or replace function current_team_id()
returns uuid
language sql
security definer
stable
as $$
  select team_id from staff_users where id = auth.uid()
$$;

alter table teams enable row level security;
alter table staff_users enable row level security;
alter table players enable row level security;
alter table player_physical_data enable row level security;

create policy "staff ve su propio equipo" on teams
  for select using (id = current_team_id());

create policy "staff ve companeros de su equipo" on staff_users
  for select using (team_id = current_team_id());

create policy "staff gestiona jugadores de su equipo" on players
  for all
  using (team_id = current_team_id())
  with check (team_id = current_team_id());

create policy "staff gestiona datos fisicos de su equipo" on player_physical_data
  for all
  using (player_id in (select id from players where team_id = current_team_id()))
  with check (player_id in (select id from players where team_id = current_team_id()));

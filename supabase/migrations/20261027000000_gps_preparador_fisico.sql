-- Módulo GPS, rediseño con la lógica del preparador físico (plantilla "Asistente de Preparador Físico").
--
-- Fase 1: plantel con posiciones (códigos propios del preparador) y registro de lesiones/molestias.
-- La carga (gps_sesiones / gps_registros) no cambia: es la misma que ya llena el importador.
--
-- Quién edita: el preparador físico y el admin. Se resuelve por ROL (no por `solo_lectura`) a
-- propósito: el preparador físico tiene `solo_lectura = true` en el resto de la plataforma y eso no
-- se toca — su permiso de escritura vale únicamente para las tablas gps_* de este archivo. Todos
-- los usuarios del equipo, incluidos los solo-lectura, pueden ver (SELECT).

create or replace function puede_editar_gps()
returns boolean
language sql
security definer
stable
as $$
  select coalesce((select rol in ('admin', 'preparador_fisico') from staff_users where id = auth.uid()), false)
$$;

-- Plantel del módulo GPS. Se identifica por el nombre tal cual lo manda el proveedor GPS
-- (mismo valor que gps_registros.nombre_proveedor_crudo): el módulo GPS no depende de la tabla
-- `players`, así el historial de carga sobrevive a un cambio de club.
create table gps_jugadores (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references teams (id) on delete cascade,
  nombre text not null,
  posicion text not null default 'N/D' check (posicion in ('2.CEN', '3.LAT', '4.MC', '5.INT', '6.EXT', '8.PUNT', 'N/D')),
  activo boolean not null default true,
  created_at timestamptz not null default now(),
  unique (team_id, nombre)
);

create table gps_lesiones (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references teams (id) on delete cascade,
  jugador text not null,
  fecha date not null,
  tipo text not null default 'Molestia' check (tipo in ('Molestia', 'Lesión')),
  zona text not null default '',
  estado text not null default 'Activa' check (estado in ('Activa', 'En recuperación', 'Alta')),
  notas text not null default '',
  fecha_alta date,
  created_at timestamptz not null default now()
);

create index gps_lesiones_team_fecha_idx on gps_lesiones (team_id, fecha desc);

alter table gps_jugadores enable row level security;
alter table gps_lesiones enable row level security;

create policy "staff ve plantel gps de su equipo" on gps_jugadores
  for select using (team_id = current_team_id());
create policy "preparador crea plantel gps" on gps_jugadores
  for insert with check (team_id = current_team_id() and puede_editar_gps());
create policy "preparador actualiza plantel gps" on gps_jugadores
  for update using (team_id = current_team_id() and puede_editar_gps())
  with check (team_id = current_team_id() and puede_editar_gps());
create policy "preparador elimina plantel gps" on gps_jugadores
  for delete using (team_id = current_team_id() and puede_editar_gps());

create policy "staff ve lesiones gps de su equipo" on gps_lesiones
  for select using (team_id = current_team_id());
create policy "preparador crea lesiones gps" on gps_lesiones
  for insert with check (team_id = current_team_id() and puede_editar_gps());
create policy "preparador actualiza lesiones gps" on gps_lesiones
  for update using (team_id = current_team_id() and puede_editar_gps())
  with check (team_id = current_team_id() and puede_editar_gps());
create policy "preparador elimina lesiones gps" on gps_lesiones
  for delete using (team_id = current_team_id() and puede_editar_gps());

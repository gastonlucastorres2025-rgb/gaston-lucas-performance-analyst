-- Modulo GPS, primer recorte: solo lo necesario para poder recibir e importar
-- los CSV reales (ver docs/gps-modulo-diseno.md seccion 5). Las tablas de
-- umbrales/alertas/observaciones/preferencias de rol se suman en una
-- migracion posterior, una vez que tengamos la estructura real del archivo
-- del proveedor y hayamos construido el dashboard sobre datos reales.

create table gps_metricas_catalogo (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references teams (id) on delete cascade,
  clave text not null,
  nombre_simple text,
  nombres_por_rol jsonb not null default '{}'::jsonb,
  unidad text,
  activa boolean not null default true,
  primera_vez_visto date not null default current_date,
  ultima_vez_visto date not null default current_date,
  unique (team_id, clave)
);

create table gps_archivos_snapshot (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references teams (id) on delete cascade,
  storage_path text not null,
  nombre_original text not null,
  hash_contenido text not null,
  filas int not null,
  columnas text[] not null,
  created_at timestamptz not null default now()
);

create table gps_importaciones (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references teams (id) on delete cascade,
  snapshot_id uuid references gps_archivos_snapshot (id),
  origen text not null default 'apps_script' check (origen in ('apps_script', 'manual')),
  estado text not null default 'procesando' check (estado in ('procesando', 'ok', 'ok_con_avisos', 'error', 'sin_mapear')),
  filas_nuevas int not null default 0,
  filas_actualizadas int not null default 0,
  filas_en_cuarentena int not null default 0,
  columnas_nuevas text[] not null default '{}',
  columnas_faltantes text[] not null default '{}',
  detalle jsonb,
  started_at timestamptz not null default now(),
  finished_at timestamptz
);

create table gps_alias (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references teams (id) on delete cascade,
  nombre_proveedor text not null,
  player_id uuid references players (id) on delete set null,
  confirmado boolean not null default false,
  created_at timestamptz not null default now(),
  unique (team_id, nombre_proveedor)
);

create table gps_sesiones (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references teams (id) on delete cascade,
  fecha date not null,
  tipo text not null default 'entrenamiento' check (tipo in ('entrenamiento', 'partido', 'individual')),
  modalidad text not null default 'colectiva' check (modalidad in ('colectiva', 'individual')),
  turno text check (turno in ('M', 'V')),
  md_relativo text,
  sesion_id uuid references sesiones (id) on delete set null,
  match_id uuid references matches (id) on delete set null,
  nombre_bloque text,
  created_at timestamptz not null default now(),
  unique (team_id, fecha, turno, modalidad, nombre_bloque)
);

create table gps_registros (
  id uuid primary key default gen_random_uuid(),
  gps_sesion_id uuid not null references gps_sesiones (id) on delete cascade,
  player_id uuid references players (id) on delete cascade,
  importacion_id uuid not null references gps_importaciones (id),
  nombre_proveedor_crudo text,
  duracion_min numeric,
  distancia_total_m numeric,
  distancia_por_min numeric,
  velocidad_maxima_kmh numeric,
  porcentaje_vmax_individual numeric,
  dist_alta_velocidad_m numeric,
  dist_muy_alta_velocidad_m numeric,
  sprint_distancia_m numeric,
  sprints_cant int,
  aceleraciones_cant int,
  desaceleraciones_cant int,
  aceleraciones_intensas_cant int,
  desaceleraciones_intensas_cant int,
  player_load numeric,
  metricas_extra jsonb not null default '{}'::jsonb,
  estado_calidad text not null default 'ok' check (estado_calidad in ('ok', 'sospechoso', 'incompleto', 'sin_dispositivo', 'sin_mapear')),
  created_at timestamptz not null default now()
);

create unique index gps_registros_sesion_player_idx on gps_registros (gps_sesion_id, player_id)
  where player_id is not null;

alter table gps_metricas_catalogo enable row level security;
alter table gps_archivos_snapshot enable row level security;
alter table gps_importaciones enable row level security;
alter table gps_alias enable row level security;
alter table gps_sesiones enable row level security;
alter table gps_registros enable row level security;

create policy "staff gestiona gps de su equipo" on gps_metricas_catalogo
  for all using (team_id = current_team_id()) with check (team_id = current_team_id());
create policy "staff gestiona gps de su equipo" on gps_archivos_snapshot
  for all using (team_id = current_team_id()) with check (team_id = current_team_id());
create policy "staff gestiona gps de su equipo" on gps_importaciones
  for all using (team_id = current_team_id()) with check (team_id = current_team_id());
create policy "staff gestiona gps de su equipo" on gps_alias
  for all using (team_id = current_team_id()) with check (team_id = current_team_id());
create policy "staff gestiona gps de su equipo" on gps_sesiones
  for all using (team_id = current_team_id()) with check (team_id = current_team_id());
create policy "staff gestiona registros gps de su equipo" on gps_registros
  for all
  using (gps_sesion_id in (select id from gps_sesiones where team_id = current_team_id()))
  with check (gps_sesion_id in (select id from gps_sesiones where team_id = current_team_id()));

insert into storage.buckets (id, name, public)
values ('gps-snapshots', 'gps-snapshots', false)
on conflict (id) do nothing;

-- La plataforma corre en local, así que el Apps Script (fuera de nuestra red) no puede
-- pegarle a un endpoint nuestro: en cambio sube los CSV directo a este bucket usando la
-- clave publica (anon), y la app local los procesa cuando alguien la abre (ver
-- src/app/api/gps/sync/route.ts). Insert-only, acotado a este bucket puntual.
create policy "apps script sube csv gps" on storage.objects
  for insert
  to anon
  with check (bucket_id = 'gps-snapshots');

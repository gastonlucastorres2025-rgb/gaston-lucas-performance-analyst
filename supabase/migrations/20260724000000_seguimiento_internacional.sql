-- Seguimiento Internacional, primer recorte: lo necesario para importar jugadores
-- rivales reales desde Drive (Sheets + PDF) y consolidarlos en perfiles unicos,
-- sin duplicados (ver docs/seguimiento-internacional-diseno.md seccion 4).
-- Se difieren a una migracion posterior (una vez validado el flujo con datos
-- reales): si_club_historial, si_observacion_categorias, si_campos_extraidos,
-- si_notas, si_listas/si_lista_jugadores, si_informes, si_fusiones.
--
-- Independiente de "players" (plantel propio) y de "scouting_targets" (lista de
-- prospectos, sin relacion con este modulo, por decision explicita del usuario).

create table si_jugadores (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references teams (id) on delete cascade,
  full_name text not null,
  normalized_name text not null,
  first_name text,
  last_name text,
  birth_date date,
  nationality text,
  country text,
  height numeric,
  preferred_foot text check (preferred_foot in ('izquierdo', 'derecho', 'ambidiestro')),
  primary_position text,
  secondary_positions text[] not null default '{}',
  current_club text,
  photo_url text,
  tracking_status text not null default 'detectado' check (
    tracking_status in (
      'detectado', 'primera_observacion', 'en_seguimiento', 'seguimiento_prioritario',
      'requiere_nueva_observacion', 'perfil_consolidado', 'pausado', 'descartado', 'archivado'
    )
  ),
  priority text check (priority in ('baja', 'media', 'alta')),
  profile_state text not null default 'incompleto' check (profile_state in ('incompleto', 'completo', 'pendiente_revision')),
  responsable_id uuid references staff_users (id),
  proxima_accion text,
  fecha_revision date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index si_jugadores_normalized_name_idx on si_jugadores (team_id, normalized_name);

create table si_documentos_fuente (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references teams (id) on delete cascade,
  drive_file_id text not null,
  file_name text not null,
  file_type text not null check (file_type in ('google_sheet', 'pdf')),
  drive_url text,
  folder_id text,
  checksum text not null,
  version int not null default 1,
  processing_status text not null default 'detectado' check (
    processing_status in ('detectado', 'pendiente', 'procesando', 'procesado', 'procesado_con_observaciones', 'requiere_revision', 'error', 'archivado', 'ignorado')
  ),
  imported_at timestamptz,
  last_modified_at timestamptz,
  original_metadata jsonb,
  extraction_confidence numeric,
  revisado_por uuid references staff_users (id),
  created_at timestamptz not null default now(),
  unique (team_id, drive_file_id, version)
);

create table si_observaciones (
  id uuid primary key default gen_random_uuid(),
  player_id uuid not null references si_jugadores (id) on delete cascade,
  observation_date date not null default current_date,
  author_id uuid references staff_users (id),
  tactical_text text,
  technical_text text,
  physical_text text,
  general_summary text,
  strengths text[] not null default '{}',
  improvement_areas text[] not null default '{}',
  position_observed text,
  club_at_time text,
  opponent text,
  competition text,
  match_date date,
  shirt_number_at_time text,
  source_document_id uuid references si_documentos_fuente (id) on delete set null,
  validation_status text not null default 'pendiente' check (validation_status in ('pendiente', 'validado', 'rechazado')),
  confidence_score numeric,
  created_at timestamptz not null default now()
);

create table si_importaciones (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references teams (id) on delete cascade,
  origen text not null check (origen in ('drive_auto', 'drive_manual')),
  iniciada_por uuid references staff_users (id),
  estado text not null check (estado in ('procesando', 'ok', 'ok_con_avisos', 'error')),
  documentos_procesados int not null default 0,
  jugadores_creados int not null default 0,
  jugadores_actualizados int not null default 0,
  enviados_a_revision int not null default 0,
  detalle jsonb,
  started_at timestamptz not null default now(),
  finished_at timestamptz
);

create table si_revisiones (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references teams (id) on delete cascade,
  tipo text not null check (
    tipo in (
      'posible_duplicado', 'jugador_no_identificado', 'datos_contradictorios', 'campos_faltantes',
      'pdf_baja_confianza', 'seccion_no_clasificada', 'documento_multiples_jugadores',
      'cambio_club', 'cambio_posicion', 'diferencia_altura', 'diferencia_pie', 'registro_incompleto', 'error_importacion'
    )
  ),
  player_id uuid references si_jugadores (id) on delete cascade,
  player_candidato_id uuid references si_jugadores (id) on delete cascade,
  source_document_id uuid references si_documentos_fuente (id) on delete cascade,
  score_confianza numeric,
  detalle jsonb,
  estado text not null default 'pendiente' check (estado in ('pendiente', 'resuelta', 'ignorada')),
  resuelta_por uuid references staff_users (id),
  resuelta_at timestamptz,
  created_at timestamptz not null default now()
);

create table si_jugador_etiquetas (
  player_id uuid not null references si_jugadores (id) on delete cascade,
  etiqueta text not null,
  primary key (player_id, etiqueta)
);

create table si_cambios_historial (
  id uuid primary key default gen_random_uuid(),
  player_id uuid not null references si_jugadores (id) on delete cascade,
  campo text not null,
  valor_anterior text,
  valor_nuevo text,
  origen text not null check (origen in ('manual', 'importacion_sheet', 'importacion_pdf', 'fusion')),
  autor_id uuid references staff_users (id),
  source_document_id uuid references si_documentos_fuente (id),
  created_at timestamptz not null default now()
);

alter table si_jugadores enable row level security;
alter table si_documentos_fuente enable row level security;
alter table si_observaciones enable row level security;
alter table si_importaciones enable row level security;
alter table si_revisiones enable row level security;
alter table si_jugador_etiquetas enable row level security;
alter table si_cambios_historial enable row level security;

create policy "staff gestiona si de su equipo" on si_jugadores
  for all using (team_id = current_team_id()) with check (team_id = current_team_id());
create policy "staff gestiona si de su equipo" on si_documentos_fuente
  for all using (team_id = current_team_id()) with check (team_id = current_team_id());
create policy "staff gestiona si de su equipo" on si_importaciones
  for all using (team_id = current_team_id()) with check (team_id = current_team_id());
create policy "staff gestiona si de su equipo" on si_revisiones
  for all using (team_id = current_team_id()) with check (team_id = current_team_id());
create policy "staff gestiona observaciones si de su equipo" on si_observaciones
  for all
  using (player_id in (select id from si_jugadores where team_id = current_team_id()))
  with check (player_id in (select id from si_jugadores where team_id = current_team_id()));
create policy "staff gestiona etiquetas si de su equipo" on si_jugador_etiquetas
  for all
  using (player_id in (select id from si_jugadores where team_id = current_team_id()))
  with check (player_id in (select id from si_jugadores where team_id = current_team_id()));
create policy "staff gestiona cambios si de su equipo" on si_cambios_historial
  for all
  using (player_id in (select id from si_jugadores where team_id = current_team_id()))
  with check (player_id in (select id from si_jugadores where team_id = current_team_id()));

insert into storage.buckets (id, name, public)
values ('seguimiento-internacional', 'seguimiento-internacional', false)
on conflict (id) do nothing;

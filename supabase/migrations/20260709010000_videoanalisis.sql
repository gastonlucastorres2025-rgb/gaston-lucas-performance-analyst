-- Videoanalisis: partidos con video de YouTube + XML de etiquetado (Nacsport)

create table partidos_va (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references teams (id) on delete cascade,
  fecha date not null,
  rival text not null,
  competencia text,
  categoria text,
  condicion text check (condicion in ('local', 'visitante')),
  goles_favor int,
  goles_contra int,
  youtube_video_id text not null,
  offset_segundos int not null default 0,
  xml_storage_path text,
  xml_procesado_en timestamptz,
  created_at timestamptz not null default now()
);

create table va_categorias (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references teams (id) on delete cascade,
  partido_id uuid not null references partidos_va (id) on delete cascade,
  codigo text not null,
  color_hex text,
  unique (partido_id, codigo)
);

create table va_acciones (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references teams (id) on delete cascade,
  partido_id uuid not null references partidos_va (id) on delete cascade,
  codigo text not null,
  inicio_seg numeric not null,
  fin_seg numeric not null,
  duracion_seg numeric generated always as (fin_seg - inicio_seg) stored,
  etiquetas jsonb,
  created_at timestamptz not null default now()
);
create index on va_acciones (partido_id, codigo);

alter table partidos_va enable row level security;
alter table va_categorias enable row level security;
alter table va_acciones enable row level security;

create policy "staff gestiona partidos_va de su equipo" on partidos_va
  for all using (team_id = current_team_id()) with check (team_id = current_team_id());

create policy "staff gestiona va_categorias de su equipo" on va_categorias
  for all using (team_id = current_team_id()) with check (team_id = current_team_id());

create policy "staff gestiona va_acciones de su equipo" on va_acciones
  for all using (team_id = current_team_id()) with check (team_id = current_team_id());

insert into storage.buckets (id, name, public)
values ('videoanalisis-xml', 'videoanalisis-xml', false)
on conflict (id) do nothing;

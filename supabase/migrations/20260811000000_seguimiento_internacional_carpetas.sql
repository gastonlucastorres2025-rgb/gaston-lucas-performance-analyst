-- Carpetas de Seguimiento Internacional: documentos que el cuerpo técnico arma a mano para enviarles a
-- los propios jugadores, con información puntual de jugadores rivales — nombre, características (texto
-- libre) y links a video (Google Drive u otro) de cada uno. El jugador de la carpeta es texto libre: no
-- depende de si_jugadores, no hace falta que esté cargado en la base de Seguimiento Internacional.

create table si_carpetas (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references teams (id) on delete cascade,
  nombre text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table si_carpeta_jugadores (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references teams (id) on delete cascade,
  carpeta_id uuid not null references si_carpetas (id) on delete cascade,
  nombre_jugador text not null default '',
  notas text not null default '',
  -- Links a video (Drive u otro), en el orden en que se cargaron. Texto libre: no se valida el dominio.
  video_links text[] not null default '{}',
  orden int not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index on si_carpeta_jugadores (carpeta_id, orden);

alter table si_carpetas enable row level security;
alter table si_carpeta_jugadores enable row level security;

create policy "staff gestiona carpetas de seguimiento de su equipo" on si_carpetas
  for all using (team_id = current_team_id()) with check (team_id = current_team_id());

create policy "staff gestiona jugadores de carpeta de seguimiento de su equipo" on si_carpeta_jugadores
  for all using (team_id = current_team_id()) with check (team_id = current_team_id());

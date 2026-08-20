-- Playlists de cortes de Videoanálisis: el cuerpo técnico arma compilados propios (ej. "Errores en
-- salida" o "Presión alta positiva") juntando cortes de partidos DISTINTOS en una sola lista
-- reproducible de punta a punta. Cada item referencia un corte real ya existente en va_acciones
-- (nunca duplica inicio/fin/etiqueta) — si el corte original se borra, el item se borra en cascada.

create table va_playlists (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references teams (id) on delete cascade,
  nombre text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table va_playlist_items (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references teams (id) on delete cascade,
  playlist_id uuid not null references va_playlists (id) on delete cascade,
  accion_id uuid not null references va_acciones (id) on delete cascade,
  orden int not null,
  created_at timestamptz not null default now(),
  unique (playlist_id, accion_id)
);
create index on va_playlist_items (playlist_id, orden);

alter table va_playlists enable row level security;
alter table va_playlist_items enable row level security;

create policy "staff gestiona playlists de su equipo" on va_playlists
  for all using (team_id = current_team_id()) with check (team_id = current_team_id());

create policy "staff gestiona items de playlist de su equipo" on va_playlist_items
  for all using (team_id = current_team_id()) with check (team_id = current_team_id());

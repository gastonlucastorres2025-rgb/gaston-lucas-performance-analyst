-- Biblioteca de videos: título, etiquetas y notas que el cuerpo técnico le agrega a cada video de las
-- carpetas de la computadora. Los videos NO se guardan en la base ni en la nube: se leen de las
-- carpetas configuradas en BIBLIOTECA_CARPETAS (cada una con su nombre, ej. "Jorge Bava"); acá solo
-- vive lo que se escribe sobre ellos, atado a (carpeta, nombre de archivo) — así no hace falta
-- renombrar ni tocar los archivos originales.
--
-- Ver = todo el equipo (incluidos los solo-lectura). Editar = quien no sea solo-lectura, igual que
-- el resto de la plataforma (es_viewer()).

create table biblioteca_videos (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references teams (id) on delete cascade,
  carpeta text not null,
  archivo text not null,
  titulo text not null default '',
  etiquetas text[] not null default '{}',
  notas text not null default '',
  updated_at timestamptz not null default now(),
  unique (team_id, carpeta, archivo)
);

alter table biblioteca_videos enable row level security;

create policy "staff ve biblioteca de su equipo" on biblioteca_videos
  for select using (team_id = current_team_id());
create policy "staff crea biblioteca de su equipo" on biblioteca_videos
  for insert with check (team_id = current_team_id() and not es_viewer());
create policy "staff actualiza biblioteca de su equipo" on biblioteca_videos
  for update using (team_id = current_team_id() and not es_viewer())
  with check (team_id = current_team_id() and not es_viewer());
create policy "staff elimina biblioteca de su equipo" on biblioteca_videos
  for delete using (team_id = current_team_id() and not es_viewer());

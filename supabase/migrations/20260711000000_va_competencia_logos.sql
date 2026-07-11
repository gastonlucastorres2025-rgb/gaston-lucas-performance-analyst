-- Biblioteca de logos de competencia para Videoanálisis: se sube una vez por
-- nombre de competencia y se reutiliza en todos los partidos con ese nombre.

create table va_competencia_logos (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references teams (id) on delete cascade,
  nombre text not null,
  logo_url text not null,
  created_at timestamptz not null default now(),
  unique (team_id, nombre)
);

alter table va_competencia_logos enable row level security;

create policy "staff gestiona va_competencia_logos de su equipo" on va_competencia_logos
  for all using (team_id = current_team_id()) with check (team_id = current_team_id());

insert into storage.buckets (id, name, public)
values ('videoanalisis-logos', 'videoanalisis-logos', true)
on conflict (id) do nothing;

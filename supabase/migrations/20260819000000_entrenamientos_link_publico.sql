-- Link público de solo lectura para el calendario de Entrenamientos: el cuerpo técnico lo genera y
-- comparte a mano con quien quiera (colegas externos, sin login) — quien lo tenga puede navegar el
-- calendario y el detalle de cada sesión, pero no puede modificar nada (las páginas públicas que usan
-- este token son de solo lectura, sin ningún formulario). No da acceso a ningún otro módulo de la
-- plataforma. El cuerpo técnico controla el acceso generando o desactivando el token cuando quiera —
-- desactivarlo/regenerarlo corta el acceso a quien tenga el link viejo.

create table entrenamientos_link_publico (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references teams (id) on delete cascade unique,
  token text not null unique,
  activo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table entrenamientos_link_publico enable row level security;

create policy "staff gestiona el link publico de entrenamientos de su equipo" on entrenamientos_link_publico
  for all using (team_id = current_team_id()) with check (team_id = current_team_id());

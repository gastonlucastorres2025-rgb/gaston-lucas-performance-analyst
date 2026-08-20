-- Historial de fusiones de perfiles duplicados, siempre reversible: guarda un snapshot
-- completo del jugador origen (y su conteo de observaciones) antes de borrarlo.
create table si_fusiones (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references teams (id) on delete cascade,
  origen_player_id uuid not null,
  destino_player_id uuid not null references si_jugadores (id) on delete cascade,
  fusionado_por uuid references staff_users (id),
  motivo text,
  datos_revertir jsonb not null,
  fusionado_at timestamptz not null default now(),
  revertido boolean not null default false,
  revertido_at timestamptz
);

alter table si_fusiones enable row level security;

create policy "staff gestiona fusiones si de su equipo" on si_fusiones
  for all using (team_id = current_team_id()) with check (team_id = current_team_id());

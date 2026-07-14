-- Rivales: entidad compartida entre Análisis de Rival, Videoanálisis y
-- Fases del Rival, para tener una ficha única por rival en vez de que
-- cada módulo guarde el nombre como texto libre desconectado.

create table rivales (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references teams (id) on delete cascade,
  nombre text not null,
  escudo_url text,
  created_at timestamptz not null default now()
);

alter table rivales enable row level security;

create policy "staff gestiona rivales de su equipo" on rivales
  for all using (team_id = current_team_id()) with check (team_id = current_team_id());

create unique index rivales_team_nombre_lower_idx on rivales (team_id, lower(nombre));

alter table analisis_rival add column rival_id uuid references rivales (id) on delete set null;
alter table partidos_va add column rival_id uuid references rivales (id) on delete set null;
alter table fases_rival add column rival_id uuid references rivales (id) on delete set null;

-- Backfill: un rivales por cada nombre distinto (sin distinguir mayúsculas)
-- ya usado en los 3 módulos, y enlazar las filas existentes.
insert into rivales (team_id, nombre)
select distinct on (team_id, lower(trim(rival))) team_id, trim(rival)
from (
  select team_id, rival from analisis_rival where trim(rival) <> ''
  union all
  select team_id, rival from partidos_va where trim(rival) <> ''
  union all
  select team_id, rival from fases_rival where trim(rival) <> ''
) todos
order by team_id, lower(trim(rival)), rival;

update analisis_rival ar set rival_id = r.id
from rivales r where r.team_id = ar.team_id and lower(r.nombre) = lower(trim(ar.rival));

update partidos_va pv set rival_id = r.id
from rivales r where r.team_id = pv.team_id and lower(r.nombre) = lower(trim(pv.rival));

update fases_rival fr set rival_id = r.id
from rivales r where r.team_id = fr.team_id and lower(r.nombre) = lower(trim(fr.rival));

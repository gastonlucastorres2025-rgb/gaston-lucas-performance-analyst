-- Informe Post Partido: reflexión después de jugar contra un rival —
-- si salió el plan, si el análisis previo fue acertado, y conclusiones
-- generales. No se conecta con Videoanálisis (ahí no hay nada del rival).

create table informes_post_partido (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references teams (id) on delete cascade,
  rival_id uuid references rivales (id) on delete set null,

  rival text not null default '',
  fecha date,
  resultado text not null default '',
  competencia text not null default '',

  plan_funciono text not null default '',
  plan_comentario text not null default '',
  analisis_acertado text not null default '',
  analisis_comentario text not null default '',
  conclusiones_generales text not null default '',

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table informes_post_partido enable row level security;

create policy "staff gestiona informes_post_partido de su equipo" on informes_post_partido
  for all using (team_id = current_team_id()) with check (team_id = current_team_id());

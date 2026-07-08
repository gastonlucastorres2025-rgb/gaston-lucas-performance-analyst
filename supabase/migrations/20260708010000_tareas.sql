-- Tareas personales del cuerpo tecnico, con dia/hora y aviso por notificacion

create table tareas (
  id uuid primary key default gen_random_uuid(),
  staff_id uuid not null references staff_users (id) on delete cascade,
  titulo text not null,
  descripcion text,
  fecha date not null,
  hora time not null default '09:00',
  completada boolean not null default false,
  notificado boolean not null default false,
  created_at timestamptz not null default now()
);

alter table tareas enable row level security;

create policy "staff gestiona sus propias tareas" on tareas
  for all
  using (staff_id = auth.uid())
  with check (staff_id = auth.uid());

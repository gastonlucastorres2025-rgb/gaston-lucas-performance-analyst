-- Agrega "entrenador" a los roles funcionales válidos de staff_users — faltaba (el DT no encajaba en
-- ninguno de los roles existentes). Solo es una etiqueta descriptiva: no cambia permisos (eso lo maneja
-- la columna solo_lectura, separada).
do $$
declare
  nombre_constraint text;
begin
  select conname into nombre_constraint
  from pg_constraint
  where conrelid = 'staff_users'::regclass
    and contype = 'c'
    and pg_get_constraintdef(oid) like '%rol%';
  if nombre_constraint is not null then
    execute format('alter table staff_users drop constraint %I', nombre_constraint);
  end if;
end $$;

alter table staff_users add constraint staff_users_rol_check check (
  rol in ('admin', 'entrenador', 'asistente_tecnico', 'preparador_fisico', 'medico', 'analista_scouting', 'utilero')
);

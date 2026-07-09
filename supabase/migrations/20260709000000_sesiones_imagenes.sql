-- Imagenes tacticas (ejercicios) para las secciones de la planificacion de sesion

alter table sesiones
  add column activacion_imagen_url text,
  add column introductorio_imagen_url text,
  add column principal_imagen_url text;

insert into storage.buckets (id, name, public)
values ('sesion-imagenes', 'sesion-imagenes', true)
on conflict (id) do nothing;

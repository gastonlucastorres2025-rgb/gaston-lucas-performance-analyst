-- El enfoque y el espacio varían por cada parte de la sesión (activación, introductorio,
-- principal), no son un dato único para todo el entrenamiento. Se reemplazan los campos
-- generales "enfoque"/"espacio" por uno de cada uno por tarea.

alter table sesiones drop column if exists enfoque;
alter table sesiones drop column if exists espacio;

alter table sesiones
  add column activacion_enfoque text,
  add column activacion_espacio text check (activacion_espacio in ('chico', 'mediano', 'grande')),
  add column introductorio_enfoque text,
  add column introductorio_espacio text check (introductorio_espacio in ('chico', 'mediano', 'grande')),
  add column principal_enfoque text,
  add column principal_espacio text check (principal_espacio in ('chico', 'mediano', 'grande'));

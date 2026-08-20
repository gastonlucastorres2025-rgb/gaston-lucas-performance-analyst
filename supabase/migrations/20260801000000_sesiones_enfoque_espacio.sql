-- Planificacion de sesiones: agrega "enfoque" (texto libre) y "espacio" (chico/mediano/grande).

alter table sesiones add column enfoque text;
alter table sesiones add column espacio text check (espacio in ('chico', 'mediano', 'grande'));

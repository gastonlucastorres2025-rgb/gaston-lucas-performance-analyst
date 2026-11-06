-- GPS por club: los datos de un club anterior (Nacional) se conservan aparte y se ven con un filtro,
-- sin mezclarse con los del club actual (Junior). Plantel (posiciones / bajas) y lesiones también
-- son por club: un mismo nombre en dos clubes son dos jugadores distintos para este módulo.
--
-- Las tablas están vacías al aplicar esto; el valor por defecto 'Junior' es el club actual y es lo que
-- usa la carga automática. La carga de un club anterior indica su club a mano (--club Nacional).

alter table gps_sesiones add column club text not null default 'Junior';
create index gps_sesiones_club_fecha_idx on gps_sesiones (team_id, club, fecha);

alter table gps_jugadores add column club text not null default 'Junior';
alter table gps_jugadores drop constraint gps_jugadores_team_id_nombre_key;
alter table gps_jugadores add constraint gps_jugadores_team_club_nombre_key unique (team_id, club, nombre);

alter table gps_lesiones add column club text not null default 'Junior';
drop index gps_lesiones_team_fecha_idx;
create index gps_lesiones_team_club_fecha_idx on gps_lesiones (team_id, club, fecha desc);

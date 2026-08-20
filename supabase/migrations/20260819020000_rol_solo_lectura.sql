-- Rol "solo lectura": cuentas reales (con login) que pueden navegar y ver todos los módulos de la
-- plataforma, pero no pueden crear, editar ni borrar nada en ningún lado. Pedido explícito del cuerpo
-- técnico para dar acceso a colegas de confianza sin que puedan modificar datos por error o a propósito.
--
-- Enfoque: se agrega una columna `solo_lectura` en staff_users (ortogonal al `rol` funcional que ya
-- existía) y una función `es_viewer()` (mismo estilo que `current_team_id()`). Después, TODA política
-- "for all" que antes daba lectura+escritura junta se separa en una política de SELECT (abierta a todo
-- el equipo, incluidos los solo-lectura) y políticas de INSERT/UPDATE/DELETE que excluyen a quien tenga
-- `solo_lectura = true`. Las tablas que ya estaban gateadas a admin (statsbomb_connections,
-- statsbomb_team_mapping, statsbomb_competition_mapping) y opponent_reports (ya separada en 4 políticas)
-- se tocan solo en sus políticas de escritura, agregando el mismo chequeo por las dudas.
--
-- Quedan afuera a propósito: `teams` y `staff_users` (select-only, sin política de escritura porque las
-- únicas escrituras hoy pasan por el cliente admin/service-role en el código de la app, que no usa RLS),
-- y `tareas` (personal, scopeada por `staff_id = auth.uid()`, no por equipo — es una lista de tareas
-- propia de cada usuario, no datos compartidos del equipo).

alter table staff_users add column solo_lectura boolean not null default false;

create or replace function es_viewer()
returns boolean
language sql
security definer
stable
as $$
  select coalesce((select solo_lectura from staff_users where id = auth.uid()), false)
$$;

-- staff_users: alta/baja de cuentas ya pasa por el cliente admin en el código (crearUsuario/eliminarUsuario
-- verifican a mano que quien llama sea admin, porque ese cliente no respeta RLS). Lo único que falta acá
-- es la actualización de permisos (actualizarPermisosUsuario), que sí usa el cliente normal.
create policy "admin actualiza staff de su equipo" on staff_users
  for update
  using (
    team_id = current_team_id()
    and exists (select 1 from staff_users su where su.id = auth.uid() and su.rol = 'admin')
  )
  with check (
    team_id = current_team_id()
    and exists (select 1 from staff_users su where su.id = auth.uid() and su.rol = 'admin')
  );

-- ============================================================
-- Tablas con team_id directo y política única "for all"
-- ============================================================

drop policy "staff gestiona jugadores de su equipo" on players;
create policy "staff ve jugadores de su equipo" on players for select using (team_id = current_team_id());
create policy "staff crea jugadores de su equipo" on players for insert with check (team_id = current_team_id() and not es_viewer());
create policy "staff actualiza jugadores de su equipo" on players for update using (team_id = current_team_id() and not es_viewer()) with check (team_id = current_team_id() and not es_viewer());
create policy "staff elimina jugadores de su equipo" on players for delete using (team_id = current_team_id() and not es_viewer());

drop policy "staff gestiona scouting de su equipo" on scouting_targets;
create policy "staff ve scouting de su equipo" on scouting_targets for select using (team_id = current_team_id());
create policy "staff crea scouting de su equipo" on scouting_targets for insert with check (team_id = current_team_id() and not es_viewer());
create policy "staff actualiza scouting de su equipo" on scouting_targets for update using (team_id = current_team_id() and not es_viewer()) with check (team_id = current_team_id() and not es_viewer());
create policy "staff elimina scouting de su equipo" on scouting_targets for delete using (team_id = current_team_id() and not es_viewer());

drop policy "staff gestiona partidos de su equipo" on matches;
create policy "staff ve partidos de su equipo" on matches for select using (team_id = current_team_id());
create policy "staff crea partidos de su equipo" on matches for insert with check (team_id = current_team_id() and not es_viewer());
create policy "staff actualiza partidos de su equipo" on matches for update using (team_id = current_team_id() and not es_viewer()) with check (team_id = current_team_id() and not es_viewer());
create policy "staff elimina partidos de su equipo" on matches for delete using (team_id = current_team_id() and not es_viewer());

drop policy "staff gestiona metricas de su equipo" on match_stats;
create policy "staff ve metricas de su equipo" on match_stats for select using (team_id = current_team_id());
create policy "staff crea metricas de su equipo" on match_stats for insert with check (team_id = current_team_id() and not es_viewer());
create policy "staff actualiza metricas de su equipo" on match_stats for update using (team_id = current_team_id() and not es_viewer()) with check (team_id = current_team_id() and not es_viewer());
create policy "staff elimina metricas de su equipo" on match_stats for delete using (team_id = current_team_id() and not es_viewer());

drop policy "staff gestiona sesiones de su equipo" on sesiones;
create policy "staff ve sesiones de su equipo" on sesiones for select using (team_id = current_team_id());
create policy "staff crea sesiones de su equipo" on sesiones for insert with check (team_id = current_team_id() and not es_viewer());
create policy "staff actualiza sesiones de su equipo" on sesiones for update using (team_id = current_team_id() and not es_viewer()) with check (team_id = current_team_id() and not es_viewer());
create policy "staff elimina sesiones de su equipo" on sesiones for delete using (team_id = current_team_id() and not es_viewer());

drop policy "staff gestiona partidos_va de su equipo" on partidos_va;
create policy "staff ve partidos_va de su equipo" on partidos_va for select using (team_id = current_team_id());
create policy "staff crea partidos_va de su equipo" on partidos_va for insert with check (team_id = current_team_id() and not es_viewer());
create policy "staff actualiza partidos_va de su equipo" on partidos_va for update using (team_id = current_team_id() and not es_viewer()) with check (team_id = current_team_id() and not es_viewer());
create policy "staff elimina partidos_va de su equipo" on partidos_va for delete using (team_id = current_team_id() and not es_viewer());

drop policy "staff gestiona va_categorias de su equipo" on va_categorias;
create policy "staff ve va_categorias de su equipo" on va_categorias for select using (team_id = current_team_id());
create policy "staff crea va_categorias de su equipo" on va_categorias for insert with check (team_id = current_team_id() and not es_viewer());
create policy "staff actualiza va_categorias de su equipo" on va_categorias for update using (team_id = current_team_id() and not es_viewer()) with check (team_id = current_team_id() and not es_viewer());
create policy "staff elimina va_categorias de su equipo" on va_categorias for delete using (team_id = current_team_id() and not es_viewer());

drop policy "staff gestiona va_acciones de su equipo" on va_acciones;
create policy "staff ve va_acciones de su equipo" on va_acciones for select using (team_id = current_team_id());
create policy "staff crea va_acciones de su equipo" on va_acciones for insert with check (team_id = current_team_id() and not es_viewer());
create policy "staff actualiza va_acciones de su equipo" on va_acciones for update using (team_id = current_team_id() and not es_viewer()) with check (team_id = current_team_id() and not es_viewer());
create policy "staff elimina va_acciones de su equipo" on va_acciones for delete using (team_id = current_team_id() and not es_viewer());

drop policy "staff gestiona va_competencia_logos de su equipo" on va_competencia_logos;
create policy "staff ve va_competencia_logos de su equipo" on va_competencia_logos for select using (team_id = current_team_id());
create policy "staff crea va_competencia_logos de su equipo" on va_competencia_logos for insert with check (team_id = current_team_id() and not es_viewer());
create policy "staff actualiza va_competencia_logos de su equipo" on va_competencia_logos for update using (team_id = current_team_id() and not es_viewer()) with check (team_id = current_team_id() and not es_viewer());
create policy "staff elimina va_competencia_logos de su equipo" on va_competencia_logos for delete using (team_id = current_team_id() and not es_viewer());

drop policy "staff gestiona analisis_rival de su equipo" on analisis_rival;
create policy "staff ve analisis_rival de su equipo" on analisis_rival for select using (team_id = current_team_id());
create policy "staff crea analisis_rival de su equipo" on analisis_rival for insert with check (team_id = current_team_id() and not es_viewer());
create policy "staff actualiza analisis_rival de su equipo" on analisis_rival for update using (team_id = current_team_id() and not es_viewer()) with check (team_id = current_team_id() and not es_viewer());
create policy "staff elimina analisis_rival de su equipo" on analisis_rival for delete using (team_id = current_team_id() and not es_viewer());

drop policy "staff gestiona fases_rival de su equipo" on fases_rival;
create policy "staff ve fases_rival de su equipo" on fases_rival for select using (team_id = current_team_id());
create policy "staff crea fases_rival de su equipo" on fases_rival for insert with check (team_id = current_team_id() and not es_viewer());
create policy "staff actualiza fases_rival de su equipo" on fases_rival for update using (team_id = current_team_id() and not es_viewer()) with check (team_id = current_team_id() and not es_viewer());
create policy "staff elimina fases_rival de su equipo" on fases_rival for delete using (team_id = current_team_id() and not es_viewer());

drop policy "staff gestiona rivales de su equipo" on rivales;
create policy "staff ve rivales de su equipo" on rivales for select using (team_id = current_team_id());
create policy "staff crea rivales de su equipo" on rivales for insert with check (team_id = current_team_id() and not es_viewer());
create policy "staff actualiza rivales de su equipo" on rivales for update using (team_id = current_team_id() and not es_viewer()) with check (team_id = current_team_id() and not es_viewer());
create policy "staff elimina rivales de su equipo" on rivales for delete using (team_id = current_team_id() and not es_viewer());

drop policy "staff gestiona informes_post_partido de su equipo" on informes_post_partido;
create policy "staff ve informes_post_partido de su equipo" on informes_post_partido for select using (team_id = current_team_id());
create policy "staff crea informes_post_partido de su equipo" on informes_post_partido for insert with check (team_id = current_team_id() and not es_viewer());
create policy "staff actualiza informes_post_partido de su equipo" on informes_post_partido for update using (team_id = current_team_id() and not es_viewer()) with check (team_id = current_team_id() and not es_viewer());
create policy "staff elimina informes_post_partido de su equipo" on informes_post_partido for delete using (team_id = current_team_id() and not es_viewer());

-- gps_* (5 tablas comparten el mismo nombre de política original, hay que dropearla en cada una)
drop policy "staff gestiona gps de su equipo" on gps_metricas_catalogo;
create policy "staff ve gps_metricas_catalogo de su equipo" on gps_metricas_catalogo for select using (team_id = current_team_id());
create policy "staff crea gps_metricas_catalogo de su equipo" on gps_metricas_catalogo for insert with check (team_id = current_team_id() and not es_viewer());
create policy "staff actualiza gps_metricas_catalogo de su equipo" on gps_metricas_catalogo for update using (team_id = current_team_id() and not es_viewer()) with check (team_id = current_team_id() and not es_viewer());
create policy "staff elimina gps_metricas_catalogo de su equipo" on gps_metricas_catalogo for delete using (team_id = current_team_id() and not es_viewer());

drop policy "staff gestiona gps de su equipo" on gps_archivos_snapshot;
create policy "staff ve gps_archivos_snapshot de su equipo" on gps_archivos_snapshot for select using (team_id = current_team_id());
create policy "staff crea gps_archivos_snapshot de su equipo" on gps_archivos_snapshot for insert with check (team_id = current_team_id() and not es_viewer());
create policy "staff actualiza gps_archivos_snapshot de su equipo" on gps_archivos_snapshot for update using (team_id = current_team_id() and not es_viewer()) with check (team_id = current_team_id() and not es_viewer());
create policy "staff elimina gps_archivos_snapshot de su equipo" on gps_archivos_snapshot for delete using (team_id = current_team_id() and not es_viewer());

drop policy "staff gestiona gps de su equipo" on gps_importaciones;
create policy "staff ve gps_importaciones de su equipo" on gps_importaciones for select using (team_id = current_team_id());
create policy "staff crea gps_importaciones de su equipo" on gps_importaciones for insert with check (team_id = current_team_id() and not es_viewer());
create policy "staff actualiza gps_importaciones de su equipo" on gps_importaciones for update using (team_id = current_team_id() and not es_viewer()) with check (team_id = current_team_id() and not es_viewer());
create policy "staff elimina gps_importaciones de su equipo" on gps_importaciones for delete using (team_id = current_team_id() and not es_viewer());

drop policy "staff gestiona gps de su equipo" on gps_alias;
create policy "staff ve gps_alias de su equipo" on gps_alias for select using (team_id = current_team_id());
create policy "staff crea gps_alias de su equipo" on gps_alias for insert with check (team_id = current_team_id() and not es_viewer());
create policy "staff actualiza gps_alias de su equipo" on gps_alias for update using (team_id = current_team_id() and not es_viewer()) with check (team_id = current_team_id() and not es_viewer());
create policy "staff elimina gps_alias de su equipo" on gps_alias for delete using (team_id = current_team_id() and not es_viewer());

drop policy "staff gestiona gps de su equipo" on gps_sesiones;
create policy "staff ve gps_sesiones de su equipo" on gps_sesiones for select using (team_id = current_team_id());
create policy "staff crea gps_sesiones de su equipo" on gps_sesiones for insert with check (team_id = current_team_id() and not es_viewer());
create policy "staff actualiza gps_sesiones de su equipo" on gps_sesiones for update using (team_id = current_team_id() and not es_viewer()) with check (team_id = current_team_id() and not es_viewer());
create policy "staff elimina gps_sesiones de su equipo" on gps_sesiones for delete using (team_id = current_team_id() and not es_viewer());

-- si_* (4 tablas comparten el mismo nombre de política original, hay que dropearla en cada una)
drop policy "staff gestiona si de su equipo" on si_jugadores;
create policy "staff ve si_jugadores de su equipo" on si_jugadores for select using (team_id = current_team_id());
create policy "staff crea si_jugadores de su equipo" on si_jugadores for insert with check (team_id = current_team_id() and not es_viewer());
create policy "staff actualiza si_jugadores de su equipo" on si_jugadores for update using (team_id = current_team_id() and not es_viewer()) with check (team_id = current_team_id() and not es_viewer());
create policy "staff elimina si_jugadores de su equipo" on si_jugadores for delete using (team_id = current_team_id() and not es_viewer());

drop policy "staff gestiona si de su equipo" on si_documentos_fuente;
create policy "staff ve si_documentos_fuente de su equipo" on si_documentos_fuente for select using (team_id = current_team_id());
create policy "staff crea si_documentos_fuente de su equipo" on si_documentos_fuente for insert with check (team_id = current_team_id() and not es_viewer());
create policy "staff actualiza si_documentos_fuente de su equipo" on si_documentos_fuente for update using (team_id = current_team_id() and not es_viewer()) with check (team_id = current_team_id() and not es_viewer());
create policy "staff elimina si_documentos_fuente de su equipo" on si_documentos_fuente for delete using (team_id = current_team_id() and not es_viewer());

drop policy "staff gestiona si de su equipo" on si_importaciones;
create policy "staff ve si_importaciones de su equipo" on si_importaciones for select using (team_id = current_team_id());
create policy "staff crea si_importaciones de su equipo" on si_importaciones for insert with check (team_id = current_team_id() and not es_viewer());
create policy "staff actualiza si_importaciones de su equipo" on si_importaciones for update using (team_id = current_team_id() and not es_viewer()) with check (team_id = current_team_id() and not es_viewer());
create policy "staff elimina si_importaciones de su equipo" on si_importaciones for delete using (team_id = current_team_id() and not es_viewer());

drop policy "staff gestiona si de su equipo" on si_revisiones;
create policy "staff ve si_revisiones de su equipo" on si_revisiones for select using (team_id = current_team_id());
create policy "staff crea si_revisiones de su equipo" on si_revisiones for insert with check (team_id = current_team_id() and not es_viewer());
create policy "staff actualiza si_revisiones de su equipo" on si_revisiones for update using (team_id = current_team_id() and not es_viewer()) with check (team_id = current_team_id() and not es_viewer());
create policy "staff elimina si_revisiones de su equipo" on si_revisiones for delete using (team_id = current_team_id() and not es_viewer());

drop policy "staff gestiona fusiones si de su equipo" on si_fusiones;
create policy "staff ve si_fusiones de su equipo" on si_fusiones for select using (team_id = current_team_id());
create policy "staff crea si_fusiones de su equipo" on si_fusiones for insert with check (team_id = current_team_id() and not es_viewer());
create policy "staff actualiza si_fusiones de su equipo" on si_fusiones for update using (team_id = current_team_id() and not es_viewer()) with check (team_id = current_team_id() and not es_viewer());
create policy "staff elimina si_fusiones de su equipo" on si_fusiones for delete using (team_id = current_team_id() and not es_viewer());

drop policy "staff gestiona playlists de su equipo" on va_playlists;
create policy "staff ve playlists de su equipo" on va_playlists for select using (team_id = current_team_id());
create policy "staff crea playlists de su equipo" on va_playlists for insert with check (team_id = current_team_id() and not es_viewer());
create policy "staff actualiza playlists de su equipo" on va_playlists for update using (team_id = current_team_id() and not es_viewer()) with check (team_id = current_team_id() and not es_viewer());
create policy "staff elimina playlists de su equipo" on va_playlists for delete using (team_id = current_team_id() and not es_viewer());

drop policy "staff gestiona items de playlist de su equipo" on va_playlist_items;
create policy "staff ve items de playlist de su equipo" on va_playlist_items for select using (team_id = current_team_id());
create policy "staff crea items de playlist de su equipo" on va_playlist_items for insert with check (team_id = current_team_id() and not es_viewer());
create policy "staff actualiza items de playlist de su equipo" on va_playlist_items for update using (team_id = current_team_id() and not es_viewer()) with check (team_id = current_team_id() and not es_viewer());
create policy "staff elimina items de playlist de su equipo" on va_playlist_items for delete using (team_id = current_team_id() and not es_viewer());

drop policy "staff gestiona carpetas de seguimiento de su equipo" on si_carpetas;
create policy "staff ve carpetas de seguimiento de su equipo" on si_carpetas for select using (team_id = current_team_id());
create policy "staff crea carpetas de seguimiento de su equipo" on si_carpetas for insert with check (team_id = current_team_id() and not es_viewer());
create policy "staff actualiza carpetas de seguimiento de su equipo" on si_carpetas for update using (team_id = current_team_id() and not es_viewer()) with check (team_id = current_team_id() and not es_viewer());
create policy "staff elimina carpetas de seguimiento de su equipo" on si_carpetas for delete using (team_id = current_team_id() and not es_viewer());

drop policy "staff gestiona jugadores de carpeta de seguimiento de su equipo" on si_carpeta_jugadores;
create policy "staff ve jugadores de carpeta de seguimiento de su equipo" on si_carpeta_jugadores for select using (team_id = current_team_id());
create policy "staff crea jugadores de carpeta de seguimiento de su equipo" on si_carpeta_jugadores for insert with check (team_id = current_team_id() and not es_viewer());
create policy "staff actualiza jugadores de carpeta de seguimiento de su equipo" on si_carpeta_jugadores for update using (team_id = current_team_id() and not es_viewer()) with check (team_id = current_team_id() and not es_viewer());
create policy "staff elimina jugadores de carpeta de seguimiento de su equipo" on si_carpeta_jugadores for delete using (team_id = current_team_id() and not es_viewer());

-- ============================================================
-- Tablas hijas, scopeadas por join (sin team_id propio)
-- ============================================================

drop policy "staff gestiona datos fisicos de su equipo" on player_physical_data;
create policy "staff ve datos fisicos de su equipo" on player_physical_data
  for select using (player_id in (select id from players where team_id = current_team_id()));
create policy "staff crea datos fisicos de su equipo" on player_physical_data
  for insert with check (player_id in (select id from players where team_id = current_team_id()) and not es_viewer());
create policy "staff actualiza datos fisicos de su equipo" on player_physical_data
  for update
  using (player_id in (select id from players where team_id = current_team_id()) and not es_viewer())
  with check (player_id in (select id from players where team_id = current_team_id()) and not es_viewer());
create policy "staff elimina datos fisicos de su equipo" on player_physical_data
  for delete using (player_id in (select id from players where team_id = current_team_id()) and not es_viewer());

drop policy "staff gestiona observaciones si de su equipo" on si_observaciones;
create policy "staff ve observaciones si de su equipo" on si_observaciones
  for select using (player_id in (select id from si_jugadores where team_id = current_team_id()));
create policy "staff crea observaciones si de su equipo" on si_observaciones
  for insert with check (player_id in (select id from si_jugadores where team_id = current_team_id()) and not es_viewer());
create policy "staff actualiza observaciones si de su equipo" on si_observaciones
  for update
  using (player_id in (select id from si_jugadores where team_id = current_team_id()) and not es_viewer())
  with check (player_id in (select id from si_jugadores where team_id = current_team_id()) and not es_viewer());
create policy "staff elimina observaciones si de su equipo" on si_observaciones
  for delete using (player_id in (select id from si_jugadores where team_id = current_team_id()) and not es_viewer());

drop policy "staff gestiona etiquetas si de su equipo" on si_jugador_etiquetas;
create policy "staff ve etiquetas si de su equipo" on si_jugador_etiquetas
  for select using (player_id in (select id from si_jugadores where team_id = current_team_id()));
create policy "staff crea etiquetas si de su equipo" on si_jugador_etiquetas
  for insert with check (player_id in (select id from si_jugadores where team_id = current_team_id()) and not es_viewer());
create policy "staff actualiza etiquetas si de su equipo" on si_jugador_etiquetas
  for update
  using (player_id in (select id from si_jugadores where team_id = current_team_id()) and not es_viewer())
  with check (player_id in (select id from si_jugadores where team_id = current_team_id()) and not es_viewer());
create policy "staff elimina etiquetas si de su equipo" on si_jugador_etiquetas
  for delete using (player_id in (select id from si_jugadores where team_id = current_team_id()) and not es_viewer());

drop policy "staff gestiona cambios si de su equipo" on si_cambios_historial;
create policy "staff ve cambios si de su equipo" on si_cambios_historial
  for select using (player_id in (select id from si_jugadores where team_id = current_team_id()));
create policy "staff crea cambios si de su equipo" on si_cambios_historial
  for insert with check (player_id in (select id from si_jugadores where team_id = current_team_id()) and not es_viewer());
create policy "staff actualiza cambios si de su equipo" on si_cambios_historial
  for update
  using (player_id in (select id from si_jugadores where team_id = current_team_id()) and not es_viewer())
  with check (player_id in (select id from si_jugadores where team_id = current_team_id()) and not es_viewer());
create policy "staff elimina cambios si de su equipo" on si_cambios_historial
  for delete using (player_id in (select id from si_jugadores where team_id = current_team_id()) and not es_viewer());

drop policy "staff gestiona registros gps de su equipo" on gps_registros;
create policy "staff ve registros gps de su equipo" on gps_registros
  for select using (gps_sesion_id in (select id from gps_sesiones where team_id = current_team_id()));
create policy "staff crea registros gps de su equipo" on gps_registros
  for insert with check (gps_sesion_id in (select id from gps_sesiones where team_id = current_team_id()) and not es_viewer());
create policy "staff actualiza registros gps de su equipo" on gps_registros
  for update
  using (gps_sesion_id in (select id from gps_sesiones where team_id = current_team_id()) and not es_viewer())
  with check (gps_sesion_id in (select id from gps_sesiones where team_id = current_team_id()) and not es_viewer());
create policy "staff elimina registros gps de su equipo" on gps_registros
  for delete using (gps_sesion_id in (select id from gps_sesiones where team_id = current_team_id()) and not es_viewer());

-- ============================================================
-- Tablas ya gateadas a admin (statsbomb) — se agrega "and not es_viewer()" por las dudas de que
-- alguna vez alguien sea admin Y solo-lectura a la vez.
-- ============================================================

drop policy "admin gestiona conexion statsbomb" on statsbomb_connections;
create policy "admin gestiona conexion statsbomb" on statsbomb_connections
  for all
  using (
    team_id = current_team_id()
    and exists (select 1 from staff_users where id = auth.uid() and rol = 'admin')
    and not es_viewer()
  )
  with check (
    team_id = current_team_id()
    and exists (select 1 from staff_users where id = auth.uid() and rol = 'admin')
    and not es_viewer()
  );

drop policy "admin gestiona mapeos de equipo" on statsbomb_team_mapping;
create policy "admin gestiona mapeos de equipo" on statsbomb_team_mapping
  for all
  using (
    team_id = current_team_id()
    and exists (select 1 from staff_users where id = auth.uid() and rol = 'admin')
    and not es_viewer()
  )
  with check (
    team_id = current_team_id()
    and exists (select 1 from staff_users where id = auth.uid() and rol = 'admin')
    and not es_viewer()
  );

drop policy "admin gestiona mapeos de competencia" on statsbomb_competition_mapping;
create policy "admin gestiona mapeos de competencia" on statsbomb_competition_mapping
  for all
  using (
    team_id = current_team_id()
    and exists (select 1 from staff_users where id = auth.uid() and rol = 'admin')
    and not es_viewer()
  )
  with check (
    team_id = current_team_id()
    and exists (select 1 from staff_users where id = auth.uid() and rol = 'admin')
    and not es_viewer()
  );

-- opponent_reports: ya estaba separada en select/insert/update/delete(admin) — se toca solo la
-- escritura, el select queda igual (abierto a todo el equipo, incluidos solo-lectura).
drop policy "staff gestiona informes de rival de su equipo" on opponent_reports;
create policy "staff crea informes de rival de su equipo" on opponent_reports
  for insert with check (team_id = current_team_id() and not es_viewer());

drop policy "staff actualiza informes de rival de su equipo" on opponent_reports;
create policy "staff actualiza informes de rival de su equipo" on opponent_reports
  for update using (team_id = current_team_id() and not es_viewer()) with check (team_id = current_team_id() and not es_viewer());

drop policy "admin elimina informes de rival" on opponent_reports;
create policy "admin elimina informes de rival" on opponent_reports
  for delete using (
    team_id = current_team_id()
    and exists (select 1 from staff_users where id = auth.uid() and rol = 'admin')
    and not es_viewer()
  );

-- Sincronización de partidos_va desde Google Sheets: guarda el ID de fila de
-- la planilla para no duplicar partidos ya importados en corridas futuras.

alter table partidos_va add column sheet_row_id text;

create unique index partidos_va_sheet_row_id_unique
  on partidos_va (team_id, sheet_row_id)
  where sheet_row_id is not null;

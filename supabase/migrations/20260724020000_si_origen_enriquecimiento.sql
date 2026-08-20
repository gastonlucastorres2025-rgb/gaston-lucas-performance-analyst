-- Permite registrar en si_cambios_historial cuando un dato (ej. club actual) se
-- actualiza por enriquecimiento externo (Transfermarkt), no solo por importación manual.
alter table si_cambios_historial drop constraint si_cambios_historial_origen_check;
alter table si_cambios_historial add constraint si_cambios_historial_origen_check
  check (origen in ('manual', 'importacion_sheet', 'importacion_pdf', 'fusion', 'enriquecimiento_externo'));

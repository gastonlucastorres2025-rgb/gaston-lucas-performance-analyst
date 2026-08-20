-- Imágenes opcionales (una o varias) para relacionar con cada nota táctica manual del informe
-- de rival de StatsBomb. Se muestran debajo del texto de la nota correspondiente en el PDF.
insert into storage.buckets (id, name, public)
values ('informe-notas-imagenes', 'informe-notas-imagenes', true)
on conflict (id) do nothing;

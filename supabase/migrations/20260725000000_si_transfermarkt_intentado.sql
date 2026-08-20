-- Sin esto, un jugador sin match en Transfermarkt se reintenta en cada corrida del
-- enriquecimiento (photo_url sigue null), desperdiciando espacio del lote en cada
-- pasada sobre los mismos jugadores que ya sabemos que no tienen match.
alter table si_jugadores add column transfermarkt_intentado boolean not null default false;

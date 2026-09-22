-- Fase 4 del saneamiento del modelo de datos: un bus de la cotización debe tener
-- como máximo un travel_buses asociado. NULL sigue permitido (múltiples NULL no
-- violan UNIQUE en Postgres), así que no molesta a las filas del camino manual viejo.
-- Ver docs/features/pending/plan/data-model-fase4-travel-bus-satelite.md

ALTER TABLE public.travel_buses
  ADD CONSTRAINT travel_buses_quotation_bus_id_key UNIQUE (quotation_bus_id);

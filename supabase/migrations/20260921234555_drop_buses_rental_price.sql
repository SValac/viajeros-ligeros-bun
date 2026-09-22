-- Fase 2 del saneamiento del modelo de datos: el precio no es un atributo del
-- catálogo de autobuses del proveedor, es el resultado de una negociación que
-- ya vive en quotation_buses.total_cost. Ver docs/features/pending/plan/data-model-fase2-catalogo-bus-precio.md

ALTER TABLE public.buses
  DROP COLUMN rental_price;

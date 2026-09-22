-- Fase 3 del saneamiento del modelo de datos: travel_buses.rental_price era una
-- copia literal de quotation_buses.total_cost, sincronizada a mano desde el flujo
-- de cotización. Con esto travel_buses queda sin ninguna columna financiera.
-- Ver docs/features/pending/plan/data-model-fase3-travel-bus-precio.md

ALTER TABLE public.travel_buses
  DROP COLUMN rental_price;

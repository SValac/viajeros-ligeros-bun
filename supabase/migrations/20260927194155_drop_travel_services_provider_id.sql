-- A travel's services are the public list shown on the web ("qué incluye"),
-- edited on their own. A quotation's providers are internal costs. Confirming a
-- quotation used to overwrite the services with its provider list, and
-- provider_id was meant to link them, but the CRM never wrote it (always NULL in
-- every environment). Confirmation no longer touches services, so the column is
-- dropped (its index and foreign key go with it).
--
-- The public web only selects id, name, description and included.
ALTER TABLE public.travel_services DROP COLUMN provider_id;

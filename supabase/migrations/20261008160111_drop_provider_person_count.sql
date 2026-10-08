-- Contract step of 20261008153118_per_person_providers_paid_by_takers.sql. A per-person
-- provider adds its unit cost straight to the seat price and is paid for the travelers
-- that take it, so the person count it used to be quoted for is unused. The CRM stopped
-- capturing it in PR #117 and stops writing it (as NULL) in this PR; the public web never
-- read it.
--
-- Deploy order: ship the CRM from this PR first, then push this migration. The CRM before
-- it still sends person_count on every save and would fail once the column is gone.

-- A value would be a count written by the old CRM; refuse to drop it then.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM public.quotation_providers WHERE person_count IS NOT NULL) THEN
    RAISE EXCEPTION 'quotation_providers.person_count still holds person counts; review them before dropping it';
  END IF;
END;
$$;

-- The cost check mentions person_count, so it's rebuilt without it (dropping the column
-- would drop it entirely).
ALTER TABLE public.quotation_providers
  DROP CONSTRAINT quotation_providers_cost_type_fields_check;

ALTER TABLE public.quotation_providers
  DROP COLUMN person_count;

ALTER TABLE public.quotation_providers
  ADD CONSTRAINT quotation_providers_cost_type_fields_check CHECK (
    (cost_type = 'total' AND unit_cost IS NULL)
    OR (cost_type = 'per_person' AND unit_cost IS NOT NULL AND unit_cost > 0)
  );

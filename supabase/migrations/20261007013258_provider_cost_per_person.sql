-- Some service providers quote per person. The form can now take a unit cost and
-- a person count and works out total_cost from them; these columns keep how the
-- total was captured so editing it shows the per-person inputs again.
--
-- total_cost stays the source of truth for payments, pending balance and the seat
-- price. Additive only: existing rows default to 'total' and need no backfill.

CREATE TYPE public.provider_cost_type AS ENUM ('total', 'per_person');

ALTER TABLE public.quotation_providers
  ADD COLUMN cost_type public.provider_cost_type NOT NULL DEFAULT 'total',
  ADD COLUMN unit_cost numeric,
  ADD COLUMN person_count integer;

-- Per-person rows carry both inputs; total rows carry neither.
ALTER TABLE public.quotation_providers
  ADD CONSTRAINT quotation_providers_cost_type_fields_check CHECK (
    (cost_type = 'total' AND unit_cost IS NULL AND person_count IS NULL)
    OR (cost_type = 'per_person' AND unit_cost > 0 AND person_count > 0)
  );

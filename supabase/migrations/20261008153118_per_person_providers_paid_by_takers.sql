-- A provider that charges per person always charges for the people that actually
-- take the service, so every per-person provider (not only the ones marked
-- optional) is now paid unit_cost × travelers that take it. The is_optional switch
-- goes away. It was added by 20261008143643_optional_provider_services, which ships
-- in the same push, so no remote environment ever held data in it.
--
-- The seat price now adds the unit cost directly, so the person count is no longer
-- captured: person_count becomes optional (existing rows keep theirs). Dropping it
-- is a later contract step.
--
-- Production note: existing per-person providers switch from owing total_cost to
-- owing unit_cost × the travel's travelers (everyone counts until opted out).

-- Payable cost for one provider: per person → unit cost × travelers of the quotation's
-- travel that take it (coordinators left out on a courtesy); total → total_cost.
CREATE FUNCTION private.quotation_provider_payable_cost(
  p_quotation_provider_id uuid,
  p_quotation_id uuid,
  p_cost_type public.provider_cost_type,
  p_coordinators_courtesy boolean,
  p_unit_cost numeric,
  p_total_cost numeric
)
RETURNS numeric
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = ''
AS $$
  SELECT CASE
    WHEN p_cost_type <> 'per_person' THEN p_total_cost
    ELSE COALESCE(p_unit_cost, 0) * (
      SELECT COUNT(*)
      FROM public.quotations q
      JOIN public.travelers t ON t.travel_id = q.travel_id
      WHERE q.id = p_quotation_id
        AND (t.kind = 'traveler' OR NOT p_coordinators_courtesy)
        AND NOT EXISTS (
          SELECT 1 FROM public.quotation_provider_opt_outs o
          WHERE o.quotation_provider_id = p_quotation_provider_id
            AND o.traveler_id = t.id
        )
    )
  END;
$$;

REVOKE ALL ON FUNCTION private.quotation_provider_payable_cost(uuid, uuid, public.provider_cost_type, boolean, numeric, numeric) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION private.quotation_provider_payable_cost(uuid, uuid, public.provider_cost_type, boolean, numeric, numeric) TO authenticated;

CREATE OR REPLACE FUNCTION private.set_quotation_provider_payable_cost()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
BEGIN
  NEW.payable_cost := private.quotation_provider_payable_cost(
    NEW.id, NEW.quotation_id, NEW.cost_type, NEW.coordinators_courtesy,
    NEW.unit_cost, NEW.total_cost
  );
  RETURN NEW;
END;
$$;

-- Travelers added to or removed from a travel change every per-person provider.
CREATE OR REPLACE FUNCTION private.sync_payable_cost_from_travelers()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
BEGIN
  UPDATE public.quotation_providers qp
  SET total_cost = qp.total_cost
  FROM public.quotations q
  WHERE q.id = qp.quotation_id
    AND qp.cost_type = 'per_person'
    AND q.travel_id IN (NEW.travel_id, OLD.travel_id);

  RETURN NULL;
END;
$$;

DROP FUNCTION private.quotation_provider_payable_cost(uuid, uuid, boolean, boolean, numeric, numeric);

ALTER TABLE public.quotation_providers
  DROP CONSTRAINT quotation_providers_optional_per_person_check,
  DROP CONSTRAINT quotation_providers_courtesy_optional_check,
  DROP COLUMN is_optional;

-- The courtesy only means something for a per-person service.
ALTER TABLE public.quotation_providers
  ADD CONSTRAINT quotation_providers_courtesy_per_person_check
    CHECK (NOT coordinators_courtesy OR cost_type = 'per_person');

-- Per-person rows no longer need a person count, but they always need a unit cost:
-- the old check let a NULL unit_cost through (NULL > 0 is NULL, which a CHECK accepts).
ALTER TABLE public.quotation_providers
  DROP CONSTRAINT quotation_providers_cost_type_fields_check,
  ADD CONSTRAINT quotation_providers_cost_type_fields_check CHECK (
    (cost_type = 'total' AND unit_cost IS NULL AND person_count IS NULL)
    OR (
      cost_type = 'per_person'
      AND unit_cost IS NOT NULL AND unit_cost > 0
      AND (person_count IS NULL OR person_count > 0)
    )
  );

-- Recompute every provider with the new rule (the BEFORE trigger does the math).
UPDATE public.quotation_providers qp
SET total_cost = qp.total_cost;

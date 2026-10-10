-- Not every traveler takes every service: of 45 seats maybe only 30 go on the
-- guide's tour, or some eat on their own. The quoted total_cost is still right
-- for the seat price, but what's owed to the provider depends on who takes it.
--
-- A per-person provider can be marked optional. Its payable_cost is then
-- unit_cost × the travel's travelers that take it; everyone takes it unless
-- they're opted out (so new travelers are counted without any extra step).
-- Coordinators count too, unless the provider gives them the service for free
-- (coordinators_courtesy). Non-optional providers keep payable_cost = total_cost.
--
-- payable_cost is what payments and pending balances compare against; the seat
-- price keeps using total_cost. Additive only: existing rows end up with
-- payable_cost = total_cost, so nothing owed changes until a provider is
-- switched to optional.

ALTER TABLE public.quotation_providers
  ADD COLUMN is_optional boolean NOT NULL DEFAULT false,
  ADD COLUMN coordinators_courtesy boolean NOT NULL DEFAULT false,
  ADD COLUMN payable_cost numeric NOT NULL DEFAULT 0;

-- Only a per-person cost can be multiplied by who takes it, and the courtesy
-- only means something for an optional service.
ALTER TABLE public.quotation_providers
  ADD CONSTRAINT quotation_providers_optional_per_person_check
    CHECK (NOT is_optional OR cost_type = 'per_person'),
  ADD CONSTRAINT quotation_providers_courtesy_optional_check
    CHECK (NOT coordinators_courtesy OR is_optional);

-- Travelers that don't take an optional service. travel_id is copied from the
-- traveler so the composite key keeps the row inside the traveler's travel.
CREATE TABLE public.quotation_provider_opt_outs (
  quotation_provider_id uuid NOT NULL
    REFERENCES public.quotation_providers (id) ON DELETE CASCADE,
  traveler_id uuid NOT NULL,
  travel_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT quotation_provider_opt_outs_pkey PRIMARY KEY (quotation_provider_id, traveler_id),
  CONSTRAINT quotation_provider_opt_outs_traveler_fkey
    FOREIGN KEY (traveler_id, travel_id)
    REFERENCES public.travelers (id, travel_id) ON DELETE CASCADE
);

-- quotation_provider_id is covered by the primary key.
CREATE INDEX quotation_provider_opt_outs_traveler_id_idx
  ON public.quotation_provider_opt_outs (traveler_id, travel_id);
CREATE INDEX quotation_provider_opt_outs_travel_id_idx
  ON public.quotation_provider_opt_outs (travel_id);

REVOKE ALL ON public.quotation_provider_opt_outs FROM anon;

ALTER TABLE public.quotation_provider_opt_outs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "quotation_provider_opt_outs_owner" ON public.quotation_provider_opt_outs
  FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.travels t
    WHERE t.id = quotation_provider_opt_outs.travel_id
      AND t.owner_id = (SELECT auth.uid())
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.travels t
    WHERE t.id = quotation_provider_opt_outs.travel_id
      AND t.owner_id = (SELECT auth.uid())
  ));

-- The provider must belong to the quotation of the traveler's travel.
CREATE FUNCTION private.check_opt_out_same_travel()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM public.quotation_providers qp
    JOIN public.quotations q ON q.id = qp.quotation_id
    WHERE qp.id = NEW.quotation_provider_id
      AND q.travel_id = NEW.travel_id
  ) THEN
    RAISE EXCEPTION 'opt_out_travel_mismatch'
      USING ERRCODE = 'check_violation';
  END IF;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION private.check_opt_out_same_travel() FROM PUBLIC;

CREATE TRIGGER quotation_provider_opt_outs_check_travel
  BEFORE INSERT OR UPDATE ON public.quotation_provider_opt_outs
  FOR EACH ROW EXECUTE FUNCTION private.check_opt_out_same_travel();

-- What's owed to one provider. Optional ones: unit cost × travelers of the
-- quotation's travel that take it (coordinators left out when it's a courtesy).
CREATE FUNCTION private.quotation_provider_payable_cost(
  p_quotation_provider_id uuid,
  p_quotation_id uuid,
  p_is_optional boolean,
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
    WHEN NOT p_is_optional THEN p_total_cost
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

REVOKE ALL ON FUNCTION private.quotation_provider_payable_cost(uuid, uuid, boolean, boolean, numeric, numeric) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION private.quotation_provider_payable_cost(uuid, uuid, boolean, boolean, numeric, numeric) TO authenticated;

-- Every write to a provider recomputes payable_cost, whatever the client sent.
-- The triggers below recompute it by touching the row (SET total_cost = total_cost).
CREATE FUNCTION private.set_quotation_provider_payable_cost()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
BEGIN
  NEW.payable_cost := private.quotation_provider_payable_cost(
    NEW.id, NEW.quotation_id, NEW.is_optional, NEW.coordinators_courtesy,
    NEW.unit_cost, NEW.total_cost
  );
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION private.set_quotation_provider_payable_cost() FROM PUBLIC;

CREATE TRIGGER quotation_providers_set_payable_cost
  BEFORE INSERT OR UPDATE ON public.quotation_providers
  FOR EACH ROW EXECUTE FUNCTION private.set_quotation_provider_payable_cost();

-- A traveler opted out of (or back into) a service.
CREATE FUNCTION private.sync_payable_cost_from_opt_outs()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
BEGIN
  UPDATE public.quotation_providers qp
  SET total_cost = qp.total_cost
  WHERE qp.id IN (NEW.quotation_provider_id, OLD.quotation_provider_id);

  RETURN NULL;
END;
$$;

REVOKE ALL ON FUNCTION private.sync_payable_cost_from_opt_outs() FROM PUBLIC;

CREATE TRIGGER quotation_provider_opt_outs_sync_payable_cost
  AFTER INSERT OR DELETE OR UPDATE OF quotation_provider_id, traveler_id
  ON public.quotation_provider_opt_outs
  FOR EACH ROW EXECUTE FUNCTION private.sync_payable_cost_from_opt_outs();

-- A traveler added to or removed from a travel: its optional services change
-- how many take them. Editing a traveler's name or seat doesn't fire it.
CREATE FUNCTION private.sync_payable_cost_from_travelers()
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
    AND qp.is_optional
    AND q.travel_id IN (NEW.travel_id, OLD.travel_id);

  RETURN NULL;
END;
$$;

REVOKE ALL ON FUNCTION private.sync_payable_cost_from_travelers() FROM PUBLIC;

CREATE TRIGGER travelers_sync_provider_payable_cost
  AFTER INSERT OR DELETE OR UPDATE OF travel_id, kind
  ON public.travelers
  FOR EACH ROW EXECUTE FUNCTION private.sync_payable_cost_from_travelers();

-- Existing providers are all non-optional: payable_cost = total_cost.
UPDATE public.quotation_providers qp
SET total_cost = qp.total_cost;

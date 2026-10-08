-- A per-person provider can charge different prices by type of person: a child's
-- ticket is 10% off, a senior's is $50 less, a VIP seat costs more. Each provider gets
-- a list of named adjustments (discount or surcharge, by percent or amount) and, on the
-- travel, each traveler that takes the service pays the base price or one adjustment.
--
-- Only what's owed to the provider changes: payable_cost sums each taker's adjusted
-- price. The seat price keeps adding the base unit cost. Additive only.

CREATE TYPE public.price_adjustment_kind AS ENUM ('discount', 'surcharge');
CREATE TYPE public.price_adjustment_mode AS ENUM ('percent', 'amount');

CREATE TABLE public.quotation_provider_price_adjustments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quotation_provider_id uuid NOT NULL
    REFERENCES public.quotation_providers (id) ON DELETE CASCADE,
  label text NOT NULL,
  kind public.price_adjustment_kind NOT NULL,
  mode public.price_adjustment_mode NOT NULL,
  value numeric NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT quotation_provider_price_adjustments_label_check
    CHECK (btrim(label) <> '' AND char_length(label) <= 60),
  CONSTRAINT quotation_provider_price_adjustments_value_check
    CHECK (value > 0 AND NOT (kind = 'discount' AND mode = 'percent' AND value > 100)),
  -- Target for the composite key below: a traveler's adjustment must be one of the
  -- provider's own.
  CONSTRAINT quotation_provider_price_adjustments_id_provider_key
    UNIQUE (id, quotation_provider_id)
);

CREATE INDEX quotation_provider_price_adjustments_provider_idx
  ON public.quotation_provider_price_adjustments (quotation_provider_id);

REVOKE ALL ON public.quotation_provider_price_adjustments FROM anon;

ALTER TABLE public.quotation_provider_price_adjustments ENABLE ROW LEVEL SECURITY;

-- quotation_provider_price_adjustments → quotation_providers → quotations → travels
CREATE POLICY "quotation_provider_price_adjustments_owner" ON public.quotation_provider_price_adjustments
  FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.quotation_providers qp
    JOIN public.quotations q ON q.id = qp.quotation_id
    JOIN public.travels t ON t.id = q.travel_id
    WHERE qp.id = quotation_provider_price_adjustments.quotation_provider_id
      AND t.owner_id = (SELECT auth.uid())
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.quotation_providers qp
    JOIN public.quotations q ON q.id = qp.quotation_id
    JOIN public.travels t ON t.id = q.travel_id
    WHERE qp.id = quotation_provider_price_adjustments.quotation_provider_id
      AND t.owner_id = (SELECT auth.uid())
  ));

-- The adjustment a traveler pays for a service (none = base price).
CREATE TABLE public.quotation_provider_traveler_adjustments (
  quotation_provider_id uuid NOT NULL,
  traveler_id uuid NOT NULL,
  travel_id uuid NOT NULL,
  adjustment_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT quotation_provider_traveler_adjustments_pkey PRIMARY KEY (quotation_provider_id, traveler_id),
  CONSTRAINT quotation_provider_traveler_adjustments_traveler_fkey
    FOREIGN KEY (traveler_id, travel_id)
    REFERENCES public.travelers (id, travel_id) ON DELETE CASCADE,
  -- Deleting an adjustment sends its travelers back to the base price.
  CONSTRAINT quotation_provider_traveler_adjustments_adjustment_fkey
    FOREIGN KEY (adjustment_id, quotation_provider_id)
    REFERENCES public.quotation_provider_price_adjustments (id, quotation_provider_id) ON DELETE CASCADE
);

CREATE INDEX quotation_provider_traveler_adjustments_traveler_idx
  ON public.quotation_provider_traveler_adjustments (traveler_id, travel_id);
CREATE INDEX quotation_provider_traveler_adjustments_adjustment_idx
  ON public.quotation_provider_traveler_adjustments (adjustment_id, quotation_provider_id);
CREATE INDEX quotation_provider_traveler_adjustments_travel_idx
  ON public.quotation_provider_traveler_adjustments (travel_id);

REVOKE ALL ON public.quotation_provider_traveler_adjustments FROM anon;

ALTER TABLE public.quotation_provider_traveler_adjustments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "quotation_provider_traveler_adjustments_owner" ON public.quotation_provider_traveler_adjustments
  FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.travels t
    WHERE t.id = quotation_provider_traveler_adjustments.travel_id
      AND t.owner_id = (SELECT auth.uid())
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.travels t
    WHERE t.id = quotation_provider_traveler_adjustments.travel_id
      AND t.owner_id = (SELECT auth.uid())
  ));

-- Same rule as the opt-outs: the provider belongs to the quotation of the traveler's travel.
CREATE TRIGGER quotation_provider_traveler_adjustments_check_travel
  BEFORE INSERT OR UPDATE ON public.quotation_provider_traveler_adjustments
  FOR EACH ROW EXECUTE FUNCTION private.check_opt_out_same_travel();

-- Payable cost: per person → each taker's price (base, or base with their adjustment,
-- never below 0), rounded to cents; total → total_cost.
CREATE OR REPLACE FUNCTION private.quotation_provider_payable_cost(
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
    ELSE (
      SELECT COALESCE(SUM(
        ROUND(GREATEST(0,
          COALESCE(p_unit_cost, 0)
          + CASE
              WHEN a.id IS NULL THEN 0
              ELSE (CASE a.kind WHEN 'discount' THEN -1 ELSE 1 END)
                * (CASE a.mode WHEN 'percent' THEN COALESCE(p_unit_cost, 0) * a.value / 100 ELSE a.value END)
            END
        ), 2)
      ), 0)
      FROM public.quotations q
      JOIN public.travelers t ON t.travel_id = q.travel_id
      LEFT JOIN public.quotation_provider_traveler_adjustments ta
        ON ta.quotation_provider_id = p_quotation_provider_id AND ta.traveler_id = t.id
      LEFT JOIN public.quotation_provider_price_adjustments a ON a.id = ta.adjustment_id
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

-- An adjustment added, repriced or removed, or a traveler's choice changed: recompute
-- the provider by touching it, like the opt-outs do.
CREATE FUNCTION private.sync_payable_cost_from_adjustments()
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

REVOKE ALL ON FUNCTION private.sync_payable_cost_from_adjustments() FROM PUBLIC;

CREATE TRIGGER quotation_provider_price_adjustments_sync_payable_cost
  AFTER INSERT OR DELETE OR UPDATE OF kind, mode, value, quotation_provider_id
  ON public.quotation_provider_price_adjustments
  FOR EACH ROW EXECUTE FUNCTION private.sync_payable_cost_from_adjustments();

CREATE TRIGGER quotation_provider_traveler_adjustments_sync_payable_cost
  AFTER INSERT OR DELETE OR UPDATE OF adjustment_id, quotation_provider_id, traveler_id
  ON public.quotation_provider_traveler_adjustments
  FOR EACH ROW EXECUTE FUNCTION private.sync_payable_cost_from_adjustments();

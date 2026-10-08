-- Extra expenses of a quotation that aren't a provider service: advertising, travel
-- allowances, commissions, box lunches... They're defined right on the quotation and,
-- like a total-cost service, split between the minimum seat target or the sellable seats.
--
-- The category is free text: the app suggests a few defaults plus the categories the
-- agency already used, and the user can type a new one. No payments are tracked.
-- Additive only.

CREATE TABLE public.quotation_expenses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quotation_id uuid NOT NULL
    REFERENCES public.quotations (id) ON DELETE CASCADE,
  category text NOT NULL,
  description text,
  cost_type public.provider_cost_type NOT NULL DEFAULT 'total',
  unit_cost numeric,
  person_count integer,
  total_cost numeric NOT NULL,
  split_type public.cost_split_type NOT NULL DEFAULT 'minimum',
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT quotation_expenses_category_check
    CHECK (btrim(category) <> '' AND char_length(category) <= 40),
  CONSTRAINT quotation_expenses_description_check
    CHECK (description IS NULL OR char_length(description) <= 200),
  CONSTRAINT quotation_expenses_total_cost_check
    CHECK (total_cost > 0),
  -- Per person keeps the price and the people it was captured with (total = both);
  -- a total cost has neither.
  CONSTRAINT quotation_expenses_cost_type_fields_check CHECK (
    (cost_type = 'total' AND unit_cost IS NULL AND person_count IS NULL)
    OR (cost_type = 'per_person' AND unit_cost > 0 AND person_count > 0)
  )
);

CREATE INDEX quotation_expenses_quotation_id_idx
  ON public.quotation_expenses (quotation_id);

REVOKE ALL ON public.quotation_expenses FROM anon;

ALTER TABLE public.quotation_expenses ENABLE ROW LEVEL SECURITY;

-- quotation_expenses → quotations → travels
CREATE POLICY "quotation_expenses_owner" ON public.quotation_expenses
  FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.quotations q
    JOIN public.travels t ON t.id = q.travel_id
    WHERE q.id = quotation_expenses.quotation_id
      AND t.owner_id = (SELECT auth.uid())
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.quotations q
    JOIN public.travels t ON t.id = q.travel_id
    WHERE q.id = quotation_expenses.quotation_id
      AND t.owner_id = (SELECT auth.uid())
  ));

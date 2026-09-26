-- travels.price was a hand-typed "desde" price for the public site. It
-- duplicated the quotation's public prices and drifted from them, so the
-- "desde" price is now derived: the cheapest public price of the travel.
--
-- Step 1 of 2 (expand): add the derived value and stop requiring price.
-- Step 2 drops travels.price once the public web no longer selects it.

-- PostgREST computed field: select it like a column, e.g.
--   travels?select=id,label,from_price
-- NULL when the travel has no public prices yet ("Precio por confirmar").
--
-- SECURITY DEFINER because anon has no SELECT on quotations or
-- quotation_public_prices. The status check reads the real row by id instead of
-- trusting the argument, so a crafted row passed through /rpc/from_price
-- can't reveal prices of unpublished travels.
--
-- Cross-repo contract: the public web reads this. Coordinate before renaming.
CREATE OR REPLACE FUNCTION public.from_price(t public.travels)
RETURNS numeric
LANGUAGE sql
SECURITY DEFINER
SET search_path = ''
STABLE
AS $$
  SELECT MIN(pp.price_per_person)
  FROM public.quotation_public_prices pp
  JOIN public.quotations q ON q.id = pp.quotation_id
  JOIN public.travels tr ON tr.id = q.travel_id
  WHERE q.travel_id = t.id
    AND tr.status = 'published';
$$;

REVOKE ALL ON FUNCTION public.from_price(public.travels) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.from_price(public.travels) TO anon;
GRANT EXECUTE ON FUNCTION public.from_price(public.travels) TO authenticated;
GRANT EXECUTE ON FUNCTION public.from_price(public.travels) TO service_role;

-- The CRM no longer writes price. Dropped in step 2.
ALTER TABLE public.travels ALTER COLUMN price DROP NOT NULL;

-- Public-site support: expose a travel's public prices (the "Precios al
-- público" section of its quotation) without granting anon direct SELECT on
-- quotations/quotation_public_prices. quotations holds internal figures
-- (seat_price, bus_capacity, minimum_seat_target) and quotation_public_prices.notes
-- is internal, so neither is returned. Only returns rows when the travel is
-- published, whatever the quotation status is.
--
-- Cross-repo contract: the public web reads this shape. Coordinate before
-- renaming, dropping or reordering columns.

CREATE OR REPLACE FUNCTION public.get_travel_public_prices(p_travel_id uuid)
RETURNS TABLE (
  id uuid,
  price_type text,
  description text,
  price_per_person numeric,
  room_type text,
  age_group text
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = ''
STABLE
AS $$
  SELECT
    pp.id,
    pp.price_type,
    pp.description,
    pp.price_per_person,
    pp.room_type,
    pp.age_group
  FROM public.quotation_public_prices pp
  JOIN public.quotations q ON q.id = pp.quotation_id
  JOIN public.travels t ON t.id = q.travel_id
  WHERE q.travel_id = p_travel_id
    AND t.status = 'published'
  ORDER BY pp.created_at, pp.id;
$$;

REVOKE ALL ON FUNCTION public.get_travel_public_prices(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_travel_public_prices(uuid) TO anon;
GRANT EXECUTE ON FUNCTION public.get_travel_public_prices(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_travel_public_prices(uuid) TO service_role;

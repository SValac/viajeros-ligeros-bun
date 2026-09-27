-- The public web groups a travel's prices into one tab per room occupancy
-- ("1 persona", "2 personas", ...). Until now the only occupancy signal was the
-- text of price_type ("Habitación para 2 personas", written by the CRM's
-- "Usar como plantilla"), which breaks as soon as a name is written by hand.
--
-- NULL = not tied to a room occupancy (a hand-written price, or a package
-- without a room); the web shows those under "Otras tarifas". The CRM fills it
-- from the reference price when a public price is created from a template, and
-- doesn't let users edit it.
ALTER TABLE public.quotation_public_prices
  ADD COLUMN max_occupancy smallint
  CONSTRAINT quotation_public_prices_max_occupancy_check CHECK (max_occupancy > 0);

-- Backfill prices created from a template: their occupancy is in the name the
-- template wrote. Anything else stays NULL.
UPDATE public.quotation_public_prices
SET max_occupancy = substring(price_type FROM '^Habitaci[oó]n para ([0-9]+) persona')::smallint
WHERE price_type ~ '^Habitaci[oó]n para [0-9]+ persona';

-- Adding an output column changes the return type, which CREATE OR REPLACE
-- can't do, so the function is recreated with the same grants. max_occupancy is
-- appended last; the other columns, the published-only rule and the two
-- room-details switches are unchanged, and so is the row order.
--
-- Cross-repo contract: the public web reads this shape. Coordinate before
-- renaming, dropping or reordering columns.
DROP FUNCTION public.get_travel_public_prices(uuid);

CREATE FUNCTION public.get_travel_public_prices(p_travel_id uuid)
RETURNS TABLE (
  id uuid,
  price_type text,
  description text,
  price_per_person numeric,
  room_type text,
  age_group text,
  max_occupancy integer
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = ''
STABLE
AS $$
  SELECT
    pp.id,
    pp.price_type,
    CASE WHEN q.show_public_description THEN pp.description END,
    pp.price_per_person,
    CASE WHEN q.show_public_room_type THEN pp.room_type END,
    pp.age_group,
    pp.max_occupancy
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

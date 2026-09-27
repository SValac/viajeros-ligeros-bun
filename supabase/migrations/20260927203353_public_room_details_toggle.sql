-- Lets an agency hide what each room is like on the public site, to accommodate
-- travelers internally without them knowing the room beforehand. Two switches
-- per quotation, each applying to all of its public prices: one for the room
-- type (beds) and one for the description. Both default to showing, so existing
-- travels don't change.
ALTER TABLE public.quotations
  ADD COLUMN show_public_room_type boolean NOT NULL DEFAULT true,
  ADD COLUMN show_public_description boolean NOT NULL DEFAULT true;

-- Same shape, grants and published-only rule as before. room_type and
-- description come back NULL when their switch is off. It's done here, not in
-- the web, so calling the RPC directly doesn't reveal them either (anon has no
-- SELECT on quotation_public_prices).
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
    CASE WHEN q.show_public_description THEN pp.description END,
    pp.price_per_person,
    CASE WHEN q.show_public_room_type THEN pp.room_type END,
    pp.age_group
  FROM public.quotation_public_prices pp
  JOIN public.quotations q ON q.id = pp.quotation_id
  JOIN public.travels t ON t.id = q.travel_id
  WHERE q.travel_id = p_travel_id
    AND t.status = 'published'
  ORDER BY pp.created_at, pp.id;
$$;

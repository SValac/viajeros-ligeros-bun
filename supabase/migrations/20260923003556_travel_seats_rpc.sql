-- Public-site support: expose available seat counts for a travel without
-- granting anon direct SELECT on travel_buses/travelers (those hold PII:
-- traveler names, phones, boarding points). Only returns a row when the
-- travel is published, so it can't be used to probe seat capacity of
-- draft/unpublished travels.

CREATE OR REPLACE FUNCTION public.get_travel_seats(p_travel_id uuid)
RETURNS TABLE (seats_total integer, seats_left integer)
LANGUAGE sql
SECURITY DEFINER
SET search_path = ''
STABLE
AS $$
  SELECT
    COALESCE((SELECT SUM(seat_count) FROM public.travel_buses WHERE travel_id = p_travel_id), 0)::int AS seats_total,
    GREATEST(
      COALESCE((SELECT SUM(seat_count) FROM public.travel_buses WHERE travel_id = p_travel_id), 0)
      - (SELECT COUNT(*) FROM public.travelers WHERE travel_id = p_travel_id),
      0
    )::int AS seats_left
  WHERE EXISTS (
    SELECT 1 FROM public.travels WHERE id = p_travel_id AND status = 'published'
  );
$$;

REVOKE ALL ON FUNCTION public.get_travel_seats(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_travel_seats(uuid) TO anon;
GRANT EXECUTE ON FUNCTION public.get_travel_seats(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_travel_seats(uuid) TO service_role;

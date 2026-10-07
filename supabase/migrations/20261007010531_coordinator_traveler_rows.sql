-- Every coordinator of a travel gets exactly one travelers row (kind =
-- 'coordinator', no seat yet) as soon as they're linked to the travel, so the
-- seat map and the room assignment page can place them like anyone else.
-- Unlinking them deletes the row through travelers_travel_coordinator_fkey.
--
-- Deploy order: the app reads kind with a 'traveler' fallback, so ship the code
-- first and push this afterwards; older code would list these rows as travelers.

CREATE FUNCTION private.create_coordinator_traveler()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.travelers
    (travel_id, kind, coordinator_id, first_name, last_name, phone, boarding_point, is_representative)
  SELECT NEW.travel_id, 'coordinator', c.id, c.name, '', c.phone, '', false
  FROM public.coordinators c
  WHERE c.id = NEW.coordinator_id
  ON CONFLICT (travel_id, coordinator_id) DO NOTHING;

  RETURN NULL;
END;
$$;

REVOKE ALL ON FUNCTION private.create_coordinator_traveler() FROM PUBLIC;

CREATE TRIGGER travel_coordinators_create_traveler
  AFTER INSERT ON public.travel_coordinators
  FOR EACH ROW EXECUTE FUNCTION private.create_coordinator_traveler();

-- Coordinators already linked to a travel.
INSERT INTO public.travelers
  (travel_id, kind, coordinator_id, first_name, last_name, phone, boarding_point, is_representative)
SELECT tc.travel_id, 'coordinator', c.id, c.name, '', c.phone, '', false
FROM public.travel_coordinators tc
JOIN public.coordinators c ON c.id = tc.coordinator_id
ON CONFLICT (travel_id, coordinator_id) DO NOTHING;

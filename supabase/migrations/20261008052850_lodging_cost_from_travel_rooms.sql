-- How many rooms a travel needs isn't known when it's quoted (4 doubles can turn into 7
-- once more people sign up), so the room count moves from the quotation to the travel:
-- the quotation only picks the hotel and its room types (enough for public prices) and
-- the rooms page adds or removes travel_accommodations rows until the trip leaves.
--
-- quotation_accommodations.total_cost (what's owed to the hotel, compared against its
-- payments) is now always the travel's rooms of each quoted type × that type's
-- price per night × nights, kept by triggers so it can't drift from the rooms.
--
-- Expand step: quotation_accommodation_details.quantity is no longer written by the
-- CRM, so it gets a default. The deployed CRM still writes it and still creates one
-- room per unit of quantity, which gives the same total_cost. Dropping the column is
-- a later contract migration.

ALTER TABLE public.quotation_accommodation_details
  ALTER COLUMN quantity SET DEFAULT 0;

-- Cost of one quotation hotel from the travel's rooms. Rooms are matched to a quoted
-- type by (travel, hotel, room type); rooms of a type the quotation doesn't list cost 0.
CREATE FUNCTION private.quotation_accommodation_rooms_cost(
  p_quotation_accommodation_id uuid,
  p_quotation_id uuid,
  p_provider_id uuid,
  p_night_count integer
)
RETURNS numeric
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = ''
AS $$
  SELECT COALESCE(SUM(d.price_per_night * p_night_count * rooms.room_count), 0)
  FROM public.quotation_accommodation_details d
  JOIN public.quotations q ON q.id = p_quotation_id
  CROSS JOIN LATERAL (
    SELECT COUNT(*) AS room_count
    FROM public.travel_accommodations ta
    WHERE ta.travel_id = q.travel_id
      AND ta.provider_id = p_provider_id
      AND ta.hotel_room_type_id = d.hotel_room_type_id
  ) rooms
  WHERE d.quotation_accommodation_id = p_quotation_accommodation_id;
$$;

REVOKE ALL ON FUNCTION private.quotation_accommodation_rooms_cost(uuid, uuid, uuid, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION private.quotation_accommodation_rooms_cost(uuid, uuid, uuid, integer) TO authenticated;

-- Every write to a quotation hotel recomputes its cost, whatever total_cost the client
-- sent. The other triggers below recompute it by touching the row (SET total_cost = total_cost).
CREATE FUNCTION private.set_quotation_accommodation_total_cost()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
BEGIN
  NEW.total_cost := private.quotation_accommodation_rooms_cost(
    NEW.id, NEW.quotation_id, NEW.provider_id, NEW.night_count
  );
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION private.set_quotation_accommodation_total_cost() FROM PUBLIC;

CREATE TRIGGER quotation_accommodations_set_total_cost
  BEFORE INSERT OR UPDATE ON public.quotation_accommodations
  FOR EACH ROW EXECUTE FUNCTION private.set_quotation_accommodation_total_cost();

-- A quoted type added, removed or repriced.
CREATE FUNCTION private.sync_cost_from_accommodation_details()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
BEGIN
  UPDATE public.quotation_accommodations qa
  SET total_cost = qa.total_cost
  WHERE qa.id IN (NEW.quotation_accommodation_id, OLD.quotation_accommodation_id);

  RETURN NULL;
END;
$$;

REVOKE ALL ON FUNCTION private.sync_cost_from_accommodation_details() FROM PUBLIC;

CREATE TRIGGER quotation_accommodation_details_sync_cost
  AFTER INSERT OR DELETE OR UPDATE OF quotation_accommodation_id, hotel_room_type_id, price_per_night
  ON public.quotation_accommodation_details
  FOR EACH ROW EXECUTE FUNCTION private.sync_cost_from_accommodation_details();

-- A room added to or removed from the travel. Editing room_number or floor doesn't fire it.
CREATE FUNCTION private.sync_cost_from_travel_rooms()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
BEGIN
  UPDATE public.quotation_accommodations qa
  SET total_cost = qa.total_cost
  FROM public.quotations q
  WHERE q.id = qa.quotation_id
    AND (
      (q.travel_id = NEW.travel_id AND qa.provider_id = NEW.provider_id)
      OR (q.travel_id = OLD.travel_id AND qa.provider_id = OLD.provider_id)
    );

  RETURN NULL;
END;
$$;

REVOKE ALL ON FUNCTION private.sync_cost_from_travel_rooms() FROM PUBLIC;

CREATE TRIGGER travel_accommodations_sync_lodging_cost
  AFTER INSERT OR DELETE OR UPDATE OF travel_id, provider_id, hotel_room_type_id
  ON public.travel_accommodations
  FOR EACH ROW EXECUTE FUNCTION private.sync_cost_from_travel_rooms();

-- Bring existing hotels in line (the BEFORE trigger does the math). The CRM so far
-- created one room per unit of quantity, so this matches the stored costs; verified
-- read-only in Production before pushing (0 differences).
UPDATE public.quotation_accommodations qa
SET total_cost = qa.total_cost;

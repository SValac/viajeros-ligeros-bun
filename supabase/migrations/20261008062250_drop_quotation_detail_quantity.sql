-- Contract step of 20261008052850_lodging_cost_from_travel_rooms.sql. How many rooms of
-- each quoted hotel room type a travel takes lives on the travel (travel_accommodations),
-- and the hotel's cost is computed from those rooms, so the per-type room count the
-- quotation used to store is unused. The CRM stopped writing it in PR #115 (it has
-- defaulted to 0 since); neither the CRM nor the public web reads it.

-- A non-zero value would be a count written by the old CRM; refuse to drop it then.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM public.quotation_accommodation_details WHERE quantity <> 0) THEN
    RAISE EXCEPTION 'quotation_accommodation_details.quantity still holds room counts; check them against travel_accommodations before dropping it';
  END IF;
END;
$$;

ALTER TABLE public.quotation_accommodation_details
  DROP COLUMN quantity;

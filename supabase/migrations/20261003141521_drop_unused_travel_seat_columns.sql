-- travels.minimum_seats and accumulated_travelers were never filled by any form: the
-- seat figures live in the quotation (minimum_seat_target, total_seats) and the public
-- site gets availability from get_travel_seats. The CRM stopped reading and writing
-- them in PR #98, which must be deployed before this runs.

-- Refuse to drop them if some travel did get a value.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM public.travels
    WHERE minimum_seats IS NOT NULL OR accumulated_travelers IS NOT NULL
  ) THEN
    RAISE EXCEPTION 'travels.minimum_seats or accumulated_travelers has data; move it before dropping the columns';
  END IF;
END;
$$;

ALTER TABLE public.travels
  DROP COLUMN minimum_seats,
  DROP COLUMN accumulated_travelers;

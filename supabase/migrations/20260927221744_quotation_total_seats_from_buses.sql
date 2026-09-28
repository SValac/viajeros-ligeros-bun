-- quotations.total_seats is now always the sum of the quotation's bus capacities
-- instead of a hand-typed number, so the seat price (which divides the costs
-- split among the total by it) and the seats the public web shows (the
-- get_travel_seats RPC sums travel_buses.seat_count, which the CRM copies from
-- each quotation bus's capacity) can't drift apart.

CREATE FUNCTION private.sync_quotation_total_seats()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
DECLARE
  v_quotation_id uuid := COALESCE(NEW.quotation_id, OLD.quotation_id);
BEGIN
  UPDATE public.quotations q
  SET total_seats = (
    SELECT COALESCE(SUM(b.capacity), 0)
    FROM public.quotation_buses b
    WHERE b.quotation_id = v_quotation_id
  )
  WHERE q.id = v_quotation_id;

  RETURN NULL;
END;
$$;

REVOKE ALL ON FUNCTION private.sync_quotation_total_seats() FROM PUBLIC;

CREATE TRIGGER quotation_buses_sync_total_seats
  AFTER INSERT OR DELETE OR UPDATE OF capacity, quotation_id ON public.quotation_buses
  FOR EACH ROW EXECUTE FUNCTION private.sync_quotation_total_seats();

-- Bring existing quotations in line.
UPDATE public.quotations q
SET total_seats = (
  SELECT COALESCE(SUM(b.capacity), 0)
  FROM public.quotation_buses b
  WHERE b.quotation_id = q.id
);

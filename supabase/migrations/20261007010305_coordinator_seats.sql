-- Coordinators travel too: they can take a bus seat and need a hotel room. They
-- become rows of travelers (kind = 'coordinator'), so the seat map, the seat swap
-- RPC, the one-seat-per-bus index, traveler_room_assignments and its room_full
-- trigger all work for them as they are. Payments only ever look at
-- kind = 'traveler'.
--
-- Additive only: existing travelers default to 'traveler' and existing quotations
-- keep counting every seat as sellable.

CREATE TYPE public.traveler_kind AS ENUM ('traveler', 'coordinator');

ALTER TABLE public.travelers
  ADD COLUMN kind public.traveler_kind NOT NULL DEFAULT 'traveler',
  ADD COLUMN coordinator_id uuid;

ALTER TABLE public.travelers
  ADD CONSTRAINT travelers_kind_coordinator_check
    CHECK ((kind = 'coordinator') = (coordinator_id IS NOT NULL)),
  -- A coordinator shows up once per travel.
  ADD CONSTRAINT travelers_travel_id_coordinator_id_key UNIQUE (travel_id, coordinator_id),
  -- Only a coordinator of this travel, and taking them off the travel drops their
  -- seat and rooms with them.
  ADD CONSTRAINT travelers_travel_coordinator_fkey
    FOREIGN KEY (travel_id, coordinator_id)
    REFERENCES public.travel_coordinators (travel_id, coordinator_id) ON DELETE CASCADE;

-- When the quotation says coordinators don't take a passenger seat they have no
-- seat at all. Travelers keep requiring one.
ALTER TABLE public.travelers ALTER COLUMN seat DROP NOT NULL;

ALTER TABLE public.travelers
  ADD CONSTRAINT travelers_seat_required_check
    CHECK (kind = 'coordinator' OR seat IS NOT NULL),
  ADD CONSTRAINT travelers_coordinator_seat_check
    CHECK (kind = 'traveler' OR (travel_bus_id IS NULL) = (seat IS NULL));

CREATE INDEX travelers_coordinator_id_idx ON public.travelers (coordinator_id);

-- A coordinator row takes its name and phone from the coordinator and is never part
-- of a group (is_representative defaults to true). Nobody can turn a traveler into a
-- coordinator (or back) afterwards: coordinators may UPDATE travelers, and relabeling
-- a paying traveler would hide them from payments.
CREATE FUNCTION private.prepare_coordinator_traveler()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
DECLARE
  v_name text;
  v_phone text;
BEGIN
  IF TG_OP = 'UPDATE'
     AND (NEW.kind IS DISTINCT FROM OLD.kind OR NEW.coordinator_id IS DISTINCT FROM OLD.coordinator_id) THEN
    RAISE EXCEPTION 'traveler_kind_immutable'
      USING ERRCODE = 'check_violation',
            DETAIL = 'A traveler''s kind and coordinator can''t change once created.';
  END IF;

  IF NEW.kind = 'coordinator' THEN
    NEW.is_representative := false;
    NEW.representative_id := NULL;

    SELECT c.name, c.phone INTO v_name, v_phone
    FROM public.coordinators c
    WHERE c.id = NEW.coordinator_id;

    IF FOUND THEN
      NEW.first_name := v_name;
      NEW.last_name := '';
      NEW.phone := v_phone;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION private.prepare_coordinator_traveler() FROM PUBLIC;

CREATE TRIGGER travelers_prepare_coordinator
  BEFORE INSERT OR UPDATE ON public.travelers
  FOR EACH ROW EXECUTE FUNCTION private.prepare_coordinator_traveler();

-- Keeps the copied name and phone current when the coordinator is edited.
CREATE FUNCTION private.sync_coordinator_travelers()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
BEGIN
  UPDATE public.travelers
  SET first_name = NEW.name,
      phone = NEW.phone
  WHERE coordinator_id = NEW.id;

  RETURN NULL;
END;
$$;

REVOKE ALL ON FUNCTION private.sync_coordinator_travelers() FROM PUBLIC;

CREATE TRIGGER coordinators_sync_travelers
  AFTER UPDATE OF name, phone ON public.coordinators
  FOR EACH ROW
  WHEN (NEW.name IS DISTINCT FROM OLD.name OR NEW.phone IS DISTINCT FROM OLD.phone)
  EXECUTE FUNCTION private.sync_coordinator_travelers();

-- Per quotation: do the travel's coordinators take passenger seats? If so they're
-- subtracted from the seats that can be sold.
ALTER TABLE public.quotations
  ADD COLUMN coordinators_take_seats boolean NOT NULL DEFAULT false;

-- Same signature and columns, so the public site needs no change. Seats left now
-- count only paying travelers, minus the travel's coordinators when its quotation
-- says they take a seat (seated yet or not).
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
      - (SELECT COUNT(*) FROM public.travelers WHERE travel_id = p_travel_id AND kind = 'traveler')
      - CASE
          WHEN EXISTS (
            SELECT 1 FROM public.quotations
            WHERE travel_id = p_travel_id AND coordinators_take_seats
          )
          THEN (SELECT COUNT(*) FROM public.travel_coordinators WHERE travel_id = p_travel_id)
          ELSE 0
        END,
      0
    )::int AS seats_left
  WHERE EXISTS (
    SELECT 1 FROM public.travels WHERE id = p_travel_id AND status = 'published'
  );
$$;

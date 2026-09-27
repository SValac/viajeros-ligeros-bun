-- A traveler on a multi-hotel travel (e.g. 2 nights in one hotel, then 1 night
-- in another) needs one room per hotel, and their public price already includes
-- a room in each. travelers.travel_accommodation_id could only hold one, so
-- room assignments move to their own table: one row per traveler and hotel.

-- Targets for the composite foreign keys below: an assignment can't point at a
-- room of another travel, nor carry a hotel that doesn't match its room.
ALTER TABLE public.travelers
  ADD CONSTRAINT travelers_id_travel_id_key UNIQUE (id, travel_id);

ALTER TABLE public.travel_accommodations
  ADD CONSTRAINT travel_accommodations_id_travel_id_provider_id_key UNIQUE (id, travel_id, provider_id);

CREATE TABLE public.traveler_room_assignments (
  traveler_id uuid NOT NULL,
  travel_accommodation_id uuid NOT NULL,
  -- Copied from the room so the primary key can allow one room per hotel.
  provider_id uuid NOT NULL,
  travel_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT traveler_room_assignments_pkey PRIMARY KEY (traveler_id, provider_id),
  CONSTRAINT traveler_room_assignments_traveler_fkey
    FOREIGN KEY (traveler_id, travel_id)
    REFERENCES public.travelers (id, travel_id) ON DELETE CASCADE,
  -- Deleting a room (e.g. when the quotation's lodging is reconciled) drops its
  -- assignments, as travelers.travel_accommodation_id used to go NULL.
  CONSTRAINT traveler_room_assignments_room_fkey
    FOREIGN KEY (travel_accommodation_id, travel_id, provider_id)
    REFERENCES public.travel_accommodations (id, travel_id, provider_id) ON DELETE CASCADE
);

-- traveler_id is already covered by the primary key.
CREATE INDEX traveler_room_assignments_travel_accommodation_id_idx
  ON public.traveler_room_assignments (travel_accommodation_id);
CREATE INDEX traveler_room_assignments_travel_id_idx
  ON public.traveler_room_assignments (travel_id);

-- Only signed-in users work with assignments.
REVOKE ALL ON public.traveler_room_assignments FROM anon;

ALTER TABLE public.traveler_room_assignments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "traveler_room_assignments_owner" ON public.traveler_room_assignments
  FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.travels t
    WHERE t.id = traveler_room_assignments.travel_id
      AND t.owner_id = (SELECT auth.uid())
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.travels t
    WHERE t.id = traveler_room_assignments.travel_id
      AND t.owner_id = (SELECT auth.uid())
  ));

-- Coordinators could already assign rooms through travelers_coordinator_update.
CREATE POLICY "traveler_room_assignments_coordinator_select" ON public.traveler_room_assignments
  FOR SELECT TO authenticated
  USING (private.is_travel_coordinator(travel_id));

CREATE POLICY "traveler_room_assignments_coordinator_insert" ON public.traveler_room_assignments
  FOR INSERT TO authenticated
  WITH CHECK (private.can_coordinator_edit(travel_id));

CREATE POLICY "traveler_room_assignments_coordinator_delete" ON public.traveler_room_assignments
  FOR DELETE TO authenticated
  USING (private.can_coordinator_edit(travel_id));

-- Carry over the existing assignments. A room of another travel can't be
-- represented anymore, so such (inconsistent) rows are left behind.
INSERT INTO public.traveler_room_assignments (traveler_id, travel_accommodation_id, provider_id, travel_id)
SELECT t.id, ta.id, ta.provider_id, t.travel_id
FROM public.travelers t
JOIN public.travel_accommodations ta
  ON ta.id = t.travel_accommodation_id
 AND ta.travel_id = t.travel_id;

ALTER TABLE public.travelers DROP COLUMN travel_accommodation_id;

-- Rejects an assignment that would put more travelers in a room than its
-- max_occupancy (until now only the UI checked it). The room row is locked first
-- so two concurrent assignments to the same room can't both pass the count.
-- Created after the data copy above, so rooms already over capacity don't block
-- the migration.
--
-- SECURITY DEFINER: coordinators may assign rooms but have no UPDATE on
-- travel_accommodations, which FOR UPDATE requires. It only reads the room being
-- assigned, which RLS on this table already let the caller write.
CREATE FUNCTION private.enforce_room_capacity()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_max_occupancy integer;
  v_occupants integer;
BEGIN
  SELECT ta.max_occupancy INTO v_max_occupancy
  FROM public.travel_accommodations ta
  WHERE ta.id = NEW.travel_accommodation_id
  FOR UPDATE;

  SELECT count(*) INTO v_occupants
  FROM public.traveler_room_assignments a
  WHERE a.travel_accommodation_id = NEW.travel_accommodation_id
    AND a.traveler_id <> NEW.traveler_id;

  IF v_occupants >= v_max_occupancy THEN
    RAISE EXCEPTION 'room_full'
      USING ERRCODE = 'check_violation',
            DETAIL = format('Room %s already has %s of %s travelers.', NEW.travel_accommodation_id, v_occupants, v_max_occupancy);
  END IF;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION private.enforce_room_capacity() FROM PUBLIC;

CREATE TRIGGER traveler_room_assignments_enforce_capacity
  BEFORE INSERT OR UPDATE OF travel_accommodation_id ON public.traveler_room_assignments
  FOR EACH ROW EXECUTE FUNCTION private.enforce_room_capacity();

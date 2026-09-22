ALTER TABLE public.coordinators
  ADD COLUMN user_id uuid UNIQUE REFERENCES auth.users(id) ON DELETE SET NULL;

CREATE SCHEMA IF NOT EXISTS private;
GRANT USAGE ON SCHEMA private TO authenticated;

-- Membresia pura: este usuario coordina el viaje?
CREATE OR REPLACE FUNCTION private.is_travel_coordinator(p_travel_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.travel_coordinators tc
    JOIN public.coordinators c ON c.id = tc.coordinator_id
    WHERE tc.travel_id = p_travel_id
      AND c.user_id = (SELECT auth.uid())
  );
$$;

-- Membresia + ventana de edicion
CREATE OR REPLACE FUNCTION private.can_coordinator_edit(p_travel_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.travel_coordinators tc
    JOIN public.coordinators c ON c.id = tc.coordinator_id
    JOIN public.travels t ON t.id = tc.travel_id
    WHERE tc.travel_id = p_travel_id
      AND c.user_id = (SELECT auth.uid())
      AND t.status IN ('published', 'in_progress')
  );
$$;

REVOKE ALL ON FUNCTION private.is_travel_coordinator(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION private.can_coordinator_edit(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION private.is_travel_coordinator(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION private.can_coordinator_edit(uuid) TO authenticated;

CREATE INDEX IF NOT EXISTS coordinators_owner_id_idx on public.coordinators (owner_id);
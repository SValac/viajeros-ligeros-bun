-- A travel can only become 'published' if its agency profile is complete
-- (company name + state): the public site needs both to show and filter it.
-- Only the transition is checked, so already-published travels keep working
-- if the profile is edited later (the CRM form does not allow blanking the name).
--
-- Not SECURITY DEFINER: only the owner can publish a travel, and the owner can
-- read their own profile through RLS.
CREATE FUNCTION private.ensure_profile_complete_on_publish()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  IF NEW.status = 'published'
     AND (TG_OP = 'INSERT' OR OLD.status IS DISTINCT FROM 'published')
     AND NOT EXISTS (
       SELECT 1 FROM public.agency_profiles p
       WHERE p.id = NEW.owner_id
         AND p.company_name IS NOT NULL
         AND p.state_code IS NOT NULL
     ) THEN
    RAISE EXCEPTION 'agency_profile_incomplete'
      USING ERRCODE = 'P0001',
            HINT = 'Completa el nombre de empresa y el estado en tu perfil antes de publicar.';
  END IF;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION private.ensure_profile_complete_on_publish() FROM PUBLIC, anon, authenticated;

CREATE TRIGGER travels_require_profile_to_publish
  BEFORE INSERT OR UPDATE OF status ON public.travels
  FOR EACH ROW EXECUTE FUNCTION private.ensure_profile_complete_on_publish();

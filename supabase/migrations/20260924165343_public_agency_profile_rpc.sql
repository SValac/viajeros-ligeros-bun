-- Public-site support for single-agency deploys (NUXT_PUBLIC_AGENCY_ID): the
-- site needs the agency's branding even when it has no published travels,
-- which the agency_profiles_anon_published policy does not allow.
--
-- Takes a concrete id, so it can't be used to enumerate agencies. Only returns
-- a row when the profile is complete (same criteria as
-- private.ensure_profile_complete_on_publish), so half-filled profiles stay
-- hidden.

CREATE OR REPLACE FUNCTION public.get_public_agency_profile(p_agency_id uuid)
RETURNS TABLE (
  company_name text,
  phone text,
  logo_url text,
  primary_color text,
  secondary_color text,
  country_code text,
  state_code text,
  state_name text
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = ''
STABLE
AS $$
  SELECT
    p.company_name,
    p.phone,
    p.logo_url,
    p.primary_color,
    p.secondary_color,
    p.country_code,
    p.state_code,
    s.name AS state_name
  FROM public.agency_profiles p
  JOIN public.country_states s
    ON s.country_code = p.country_code AND s.code = p.state_code
  WHERE p.id = p_agency_id
    AND p.company_name IS NOT NULL
    AND p.state_code IS NOT NULL;
$$;

REVOKE ALL ON FUNCTION public.get_public_agency_profile(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_public_agency_profile(uuid) TO anon;
GRANT EXECUTE ON FUNCTION public.get_public_agency_profile(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_public_agency_profile(uuid) TO service_role;

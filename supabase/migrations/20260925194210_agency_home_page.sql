-- The public site's home page becomes editable from the CRM, like the "Nosotros" page
-- (20260924183111_agency_about_page.sql). Layout and order stay fixed on the site:
-- hero -> featured travels -> sections -> closing CTA.
--
-- home_page NULL = the site's default home. Shape (plain text, no HTML):
--   { "hero"?:     { "title", "description"? },
--     "featured"?: { "headline"?, "title" },
--     "sections":  [ same section contract as about_page.sections ],
--     "cta"?:      { "title", "description"? } }
-- Unlike about_page, every block is optional: a missing hero / featured / cta makes the
-- site use its default text for that block, so an agency can customize only part of it.
-- The CRM validates the full contract with zod (use-home-page-domain.ts) and the web
-- re-validates on read. The CHECK below only guards the structure the site relies on,
-- with the same 64 KB backstop as about_page.

ALTER TABLE public.agency_profiles
  ADD COLUMN home_page jsonb,
  -- Same approach as agency_profiles_about_page_valid: COALESCE turns a NULL result
  -- (missing key) into a failure, the CASE keeps jsonb_array_length() off non-arrays,
  -- and the strict path keeps only sections of a known type, so any other section
  -- makes the counts differ.
  ADD CONSTRAINT agency_profiles_home_page_valid CHECK (
    home_page IS NULL OR COALESCE(
      jsonb_typeof(home_page) = 'object'
      AND octet_length(home_page::text) <= 65536
      AND (NOT home_page ? 'hero' OR jsonb_typeof(home_page->'hero'->'title') = 'string')
      AND (NOT home_page ? 'featured' OR jsonb_typeof(home_page->'featured'->'title') = 'string')
      AND (NOT home_page ? 'cta' OR jsonb_typeof(home_page->'cta'->'title') = 'string')
      AND CASE WHEN jsonb_typeof(home_page->'sections') = 'array' THEN
        jsonb_array_length(home_page->'sections') <= 8
        AND jsonb_array_length(home_page->'sections') = jsonb_array_length(jsonb_path_query_array(
          home_page,
          'strict $.sections[*] ? (@.type() == "object").type ? (@ == "text" || @ == "features" || @ == "steps")',
          '{}', true))
      ELSE false END,
      false)
  );

-- RETURNS TABLE changes, so CREATE OR REPLACE is not enough. Same contract as
-- 20260924183111_agency_about_page.sql with home_page appended last.
DROP FUNCTION public.get_public_agency_profile(uuid);

CREATE FUNCTION public.get_public_agency_profile(p_agency_id uuid)
RETURNS TABLE (
  company_name text,
  phone text,
  logo_url text,
  primary_color text,
  secondary_color text,
  country_code text,
  state_code text,
  state_name text,
  tagline text,
  contact_email text,
  instagram_url text,
  facebook_url text,
  about_page jsonb,
  home_page jsonb
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
    s.name AS state_name,
    p.tagline,
    p.contact_email,
    p.instagram_url,
    p.facebook_url,
    p.about_page,
    p.home_page
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

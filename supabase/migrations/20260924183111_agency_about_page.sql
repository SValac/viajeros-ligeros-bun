-- The public site's "Nosotros" page becomes a list of sections the agency composes
-- in the CRM (hero + text / features / steps sections). It replaces the plain-text
-- `about` column added in 20260924173904_agency_profile_site_content.sql.
--
-- about_page NULL = the agency has no "Nosotros" page. Shape (plain text, no HTML):
--   { "hero": { "title", "description"? },
--     "sections": [ { "type": "text" | "features" | "steps", "headline"?, "title", ... } ] }
-- The CRM validates the full contract (lengths, item counts, icon list) with zod and
-- the web re-validates on read. The CHECK below only guards the structure the site
-- relies on to route and render, so a direct API write can't store something else.
-- The 64 KB size cap is a backstop: a page with every field at its maximum length is
-- ~47 KB, so the per-field limits are what an agency actually runs into.

-- `about` never reached real use; refuse to drop it if some agency did fill it in.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM public.agency_profiles WHERE about IS NOT NULL) THEN
    RAISE EXCEPTION 'agency_profiles.about has data; migrate it to about_page before dropping it';
  END IF;
END;
$$;

ALTER TABLE public.agency_profiles
  DROP COLUMN about,
  ADD COLUMN about_page jsonb,
  -- COALESCE: a CHECK that evaluates to NULL passes, and a missing key yields NULL.
  -- The CASE keeps jsonb_array_length() from running on a non-array.
  -- Every section must be an object whose "type" is known: the path keeps only
  -- those, and a missing "type" makes the strict path fail (empty result), so any
  -- other section makes the counts differ.
  ADD CONSTRAINT agency_profiles_about_page_valid CHECK (
    about_page IS NULL OR COALESCE(
      jsonb_typeof(about_page) = 'object'
      AND octet_length(about_page::text) <= 65536
      AND jsonb_typeof(about_page->'hero') = 'object'
      AND jsonb_typeof(about_page->'hero'->'title') = 'string'
      AND CASE WHEN jsonb_typeof(about_page->'sections') = 'array' THEN
        jsonb_array_length(about_page->'sections') <= 8
        AND jsonb_array_length(about_page->'sections') = jsonb_array_length(jsonb_path_query_array(
          about_page,
          'strict $.sections[*] ? (@.type() == "object").type ? (@ == "text" || @ == "features" || @ == "steps")',
          '{}', true))
      ELSE false END,
      false)
  );

-- RETURNS TABLE changes, so CREATE OR REPLACE is not enough. Same contract as
-- 20260924173904_agency_profile_site_content.sql with `about` swapped for about_page.
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
  about_page jsonb
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
    p.about_page
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

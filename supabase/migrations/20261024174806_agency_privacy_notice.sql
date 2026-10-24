-- Privacy notice ("aviso de privacidad") for the agency's public site, agreed with the
-- web repo. The site needs one since it loads the Meta Pixel (LFPDPPP + Meta's terms).
--
-- privacy_notice NULL = the agency has no notice: the site hides /aviso-de-privacidad and
-- its footer link. Shape (plain text, no HTML):
--   { "responsible": { "legal_name", "address", "arco_email" },
--     "updated_on": "YYYY-MM-DD",            -- set by the editor, only when the text changes
--     "sections": [ { "title", "body" } ] }  -- 1 to 20, in display order
-- A body splits into paragraphs on line breaks; lines starting with "- " are bullets.
-- The CRM validates the full contract (lengths) with zod in use-privacy-notice-domain.ts
-- and the web re-validates on read. The CHECK guards the structure and every field the
-- notice needs, so a stored notice is always complete and both RPCs below only test
-- IS NOT NULL. The 256 KB size cap is a backstop: 20 sections at their 6000-char maximum
-- are ~120K chars (accents take 2 bytes).
--
-- get_public_agency_profile runs on every page of the site, so the notice is served by
-- its own RPC and the profile only says whether there is one (has_privacy_notice).
--
-- Data safety: only a nullable ADD COLUMN with no backfill, so existing rows are untouched.

ALTER TABLE public.agency_profiles
  ADD COLUMN privacy_notice jsonb,
  -- COALESCE: a CHECK that evaluates to NULL passes, and a missing key yields NULL.
  -- The CASE keeps jsonb_array_length() from running on a non-array. Every section must
  -- be an object with string title and body: the strict path keeps only those, so any
  -- other section makes the counts differ.
  ADD CONSTRAINT agency_profiles_privacy_notice_valid CHECK (
    privacy_notice IS NULL OR COALESCE(
      jsonb_typeof(privacy_notice) = 'object'
      AND octet_length(privacy_notice::text) <= 262144
      AND jsonb_typeof(privacy_notice->'responsible') = 'object'
      AND jsonb_typeof(privacy_notice->'responsible'->'legal_name') = 'string'
      AND btrim(privacy_notice->'responsible'->>'legal_name') <> ''
      AND jsonb_typeof(privacy_notice->'responsible'->'address') = 'string'
      AND btrim(privacy_notice->'responsible'->>'address') <> ''
      AND jsonb_typeof(privacy_notice->'responsible'->'arco_email') = 'string'
      -- Same rule as agency_profiles_contact_email_valid.
      AND privacy_notice->'responsible'->>'arco_email' ~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$'
      AND char_length(privacy_notice->'responsible'->>'arco_email') <= 254
      AND jsonb_typeof(privacy_notice->'updated_on') = 'string'
      AND privacy_notice->>'updated_on' ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$'
      AND CASE WHEN jsonb_typeof(privacy_notice->'sections') = 'array' THEN
        jsonb_array_length(privacy_notice->'sections') BETWEEN 1 AND 20
        AND jsonb_array_length(privacy_notice->'sections') = jsonb_array_length(jsonb_path_query_array(
          privacy_notice,
          'strict $.sections[*] ? (@.type() == "object" && @.title.type() == "string" && @.body.type() == "string")',
          '{}', true))
      ELSE false END,
      false)
  );

-- The notice of a publicly listed agency (same "complete profile" rule as
-- get_public_agency_profile), or NULL when it has none. The web's /aviso-de-privacidad
-- page 404s on NULL.
CREATE FUNCTION public.get_public_agency_privacy_notice(p_agency_id uuid)
RETURNS jsonb
LANGUAGE sql
SECURITY DEFINER
SET search_path = ''
STABLE
AS $$
  SELECT p.privacy_notice
  FROM public.agency_profiles p
  WHERE p.id = p_agency_id
    AND p.company_name IS NOT NULL
    AND p.state_code IS NOT NULL;
$$;

REVOKE ALL ON FUNCTION public.get_public_agency_privacy_notice(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_public_agency_privacy_notice(uuid) TO anon;
GRANT EXECUTE ON FUNCTION public.get_public_agency_privacy_notice(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_public_agency_privacy_notice(uuid) TO service_role;

-- RETURNS TABLE changes, so CREATE OR REPLACE is not enough. Same contract as
-- 20261003151937_agency_profile_tiktok_link.sql with has_privacy_notice appended last
-- (footer link and sitemap).
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
  home_page jsonb,
  favicon_url text,
  seo_title text,
  seo_description text,
  share_image_url text,
  banner_image_url text,
  youtube_url text,
  x_url text,
  tiktok_url text,
  has_privacy_notice boolean
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
    p.home_page,
    p.favicon_url,
    p.seo_title,
    p.seo_description,
    p.share_image_url,
    p.banner_image_url,
    p.youtube_url,
    p.x_url,
    p.tiktok_url,
    p.privacy_notice IS NOT NULL AS has_privacy_notice
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

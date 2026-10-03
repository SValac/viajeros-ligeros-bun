-- YouTube and X (ex-Twitter) links for the agency's public site, agreed with the web repo:
--   youtube_url → footer icon; host youtube.com or m.youtube.com (www allowed)
--   x_url       → footer icon; host x.com or twitter.com (www allowed)
-- Same rules as instagram_url / facebook_url (20260924173904_agency_profile_site_content.sql):
-- https only, a path after the host, ≤ 200 chars, NULL = not set. The site only renders
-- these hosts, so the CHECKs keep "saved but not shown" from happening.
-- Data safety: only nullable ADD COLUMNs with no backfill, so existing rows are untouched.
-- The new columns are all NULL, so validating the CHECKs costs nothing.

ALTER TABLE public.agency_profiles
  ADD COLUMN youtube_url text,
  ADD COLUMN x_url text,
  ADD CONSTRAINT agency_profiles_youtube_url_valid
    CHECK (youtube_url ~ '^https://(www\.|m\.)?youtube\.com/[^[:space:]]+$' AND char_length(youtube_url) <= 200),
  ADD CONSTRAINT agency_profiles_x_url_valid
    CHECK (x_url ~ '^https://(www\.)?(x|twitter)\.com/[^[:space:]]+$' AND char_length(x_url) <= 200);

-- RETURNS TABLE changes, so CREATE OR REPLACE is not enough. Same contract as
-- 20261001045458_agency_profile_banner_image.sql with youtube_url and x_url appended last.
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
  x_url text
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
    p.x_url
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

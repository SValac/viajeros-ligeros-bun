-- Banner image for the agency's home page, agreed with the public site (web repo):
--   banner_image_url → full-width strip above the home hero, on agency sites only
--                      (landscape, 1920×800 recommended, JPEG/PNG/WebP, ≤ 2 MB).
--                      The site center-crops it (16:9 on mobile, a fixed-height strip
--                      of about 4:1 on desktop) and treats it as decorative (no alt
--                      text column).
--                      NULL = no banner; the hero renders as before.
-- A column rather than a key inside home_page: that JSON holds texts only, and this way
-- the URL gets the same CHECK as favicon_url and share_image_url
-- (20260928001627_agency_profile_seo.sql). The file lives in the public agency-logos
-- bucket; the CRM validates format and size before upload.

ALTER TABLE public.agency_profiles
  ADD COLUMN banner_image_url text,
  ADD CONSTRAINT agency_profiles_banner_image_url_valid
    CHECK (banner_image_url ~ '^https?://[^[:space:]]+$' AND char_length(banner_image_url) <= 500);

-- RETURNS TABLE changes, so CREATE OR REPLACE is not enough. Same contract as
-- 20260928001627_agency_profile_seo.sql with banner_image_url appended last.
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
  banner_image_url text
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
    p.banner_image_url
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

-- TikTok link for the agency's public site, agreed with the web repo:
--   tiktok_url → footer icon; host tiktok.com or m.tiktok.com (www allowed).
--                Short links (vm.tiktok.com / vt.tiktok.com) are not accepted, the same
--                call as youtu.be in 20261003144513_agency_profile_youtube_x_links.sql.
-- Same rules as the other social links: https only, a path after the host, ≤ 200 chars,
-- NULL = not set.
-- Data safety: only a nullable ADD COLUMN with no backfill, so existing rows are untouched.

ALTER TABLE public.agency_profiles
  ADD COLUMN tiktok_url text,
  ADD CONSTRAINT agency_profiles_tiktok_url_valid
    CHECK (tiktok_url ~ '^https://(www\.|m\.)?tiktok\.com/[^[:space:]]+$' AND char_length(tiktok_url) <= 200);

-- RETURNS TABLE changes, so CREATE OR REPLACE is not enough. Same contract as
-- 20261003144513_agency_profile_youtube_x_links.sql with tiktok_url appended last.
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
  tiktok_url text
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
    p.tiktok_url
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

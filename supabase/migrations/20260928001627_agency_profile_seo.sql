-- SEO and link-preview data each agency sets in the CRM ("SEO y redes" tab).
-- Contract agreed with the public site (web repo), which builds the rest itself
-- (canonical URL, og/twitter tags, JSON-LD, sitemap) from existing data:
--   favicon_url     → rel=icon and apple-touch-icon (square PNG, 192–1024 px, ≤ 512 KB).
--                     NULL = the site falls back to logo_url, then its default favicon.
--   seo_title       → home page <title> and default og:title (≤ 60 chars).
--                     NULL = company_name (+ " · tagline").
--   seo_description → site meta description and default og:description (≤ 160 chars).
--   share_image_url → default og:image / twitter:image (1200×630 JPEG or PNG, ≤ 1 MB).
--                     NULL = travel pages use the travel cover, other pages go without.
-- Both images live in the public agency-logos bucket; the CRM validates format,
-- size and dimensions before upload (the database cannot see the file).
-- Same NULL-means-unset rule as 20260924173904_agency_profile_site_content.sql:
-- whitespace-only strings and line breaks are rejected.

ALTER TABLE public.agency_profiles
  ADD COLUMN favicon_url text,
  ADD COLUMN seo_title text,
  ADD COLUMN seo_description text,
  ADD COLUMN share_image_url text,
  ADD CONSTRAINT agency_profiles_favicon_url_valid
    CHECK (favicon_url ~ '^https?://[^[:space:]]+$' AND char_length(favicon_url) <= 500),
  ADD CONSTRAINT agency_profiles_seo_title_valid
    CHECK (seo_title ~ '[^[:space:]]' AND seo_title !~ '[\r\n]' AND char_length(seo_title) <= 60),
  ADD CONSTRAINT agency_profiles_seo_description_valid
    CHECK (seo_description ~ '[^[:space:]]' AND seo_description !~ '[\r\n]' AND char_length(seo_description) <= 160),
  ADD CONSTRAINT agency_profiles_share_image_url_valid
    CHECK (share_image_url ~ '^https?://[^[:space:]]+$' AND char_length(share_image_url) <= 500);

-- RETURNS TABLE changes, so CREATE OR REPLACE is not enough. Same contract as
-- 20260925194210_agency_home_page.sql with the SEO columns appended last.
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
  share_image_url text
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
    p.share_image_url
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

-- Optional content each agency edits in the CRM to customize its public site.
-- Like the rest of agency_profiles, every column here is PUBLIC.
--   tagline        → footer slogan
--   about          → "Nosotros" page (plain text, not HTML; paragraphs split by a blank line)
--   contact_email  → footer
--   instagram_url / facebook_url → footer icons
-- NULL means "not set": the CHECKs reject whitespace-only strings (line breaks
-- included, which btrim() would miss) so the site never has to
-- tell an empty value from a missing one.

ALTER TABLE public.agency_profiles
  ADD COLUMN tagline text,
  ADD COLUMN about text,
  ADD COLUMN contact_email text,
  ADD COLUMN instagram_url text,
  ADD COLUMN facebook_url text,
  ADD CONSTRAINT agency_profiles_tagline_valid
    CHECK (tagline ~ '[^[:space:]]' AND tagline !~ '[\r\n]' AND char_length(tagline) <= 120),
  ADD CONSTRAINT agency_profiles_about_valid
    CHECK (about ~ '[^[:space:]]' AND char_length(about) <= 2000),
  ADD CONSTRAINT agency_profiles_contact_email_valid
    CHECK (contact_email ~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$' AND char_length(contact_email) <= 254),
  ADD CONSTRAINT agency_profiles_instagram_url_valid
    CHECK (instagram_url ~ '^https://(www\.)?instagram\.com/[^[:space:]]+$' AND char_length(instagram_url) <= 200),
  ADD CONSTRAINT agency_profiles_facebook_url_valid
    CHECK (facebook_url ~ '^https://(www\.)?facebook\.com/[^[:space:]]+$' AND char_length(facebook_url) <= 200);

-- RETURNS TABLE changes, so CREATE OR REPLACE is not enough. Same contract as
-- 20260924165343_public_agency_profile_rpc.sql plus the new columns.
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
  about text,
  contact_email text,
  instagram_url text,
  facebook_url text
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
    p.about,
    p.contact_email,
    p.instagram_url,
    p.facebook_url
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

import type { AgencyProfile, AgencyProfileUpdateData, AgencySeoFormData } from '~/types/agency-profile';

// Must match the CHECK constraints in 20260928001627_agency_profile_seo.sql.
export const SEO_TITLE_MAX_LENGTH = 60;
export const SEO_DESCRIPTION_MAX_LENGTH = 160;
// Below this Google tends to replace the description with page text; only a warning.
export const SEO_DESCRIPTION_MIN_RECOMMENDED = 50;

/**
 * Builds the SEO form state from a stored profile.
 * @param profile - The agency profile, or `null` before it loads
 * @returns Form data with `''` for unset texts
 */
export function mapProfileToSeoForm(profile: AgencyProfile | null): AgencySeoFormData {
  return {
    seoTitle: profile?.seoTitle ?? '',
    seoDescription: profile?.seoDescription ?? '',
  };
}

/**
 * Normalizes the SEO form for the repository: trims and turns empty texts into `null`
 * (the database rejects blank strings), so the site falls back to its defaults.
 * @param form - Validated form data
 * @returns Update payload for `repository.update()`
 */
export function mapSeoFormToUpdate(form: AgencySeoFormData): AgencyProfileUpdateData {
  return {
    seoTitle: form.seoTitle.trim() || null,
    seoDescription: form.seoDescription.trim() || null,
  };
}

/**
 * Title the public site uses when `seo_title` is not set: the company name, plus the
 * tagline when there is one. Mirrors the web's fallback, so the preview is accurate.
 * @param profile - The agency profile
 * @returns Fallback title
 */
export function defaultSeoTitle(profile: AgencyProfile): string {
  const name = profile.companyName?.trim() || 'Tu agencia';
  return profile.tagline ? `${name} · ${profile.tagline}` : name;
}

/**
 * Description the public site uses when `seo_description` is not set. Mirrors the web's
 * default (use-site-brand.ts in viajeros-ligeros-web): keep them in sync.
 * @param profile - The agency profile
 * @returns Fallback description
 */
export function defaultSeoDescription(profile: AgencyProfile): string {
  const name = profile.companyName?.trim();
  return name
    ? `Viajes en grupo con ${name}. Consulte las próximas salidas y reserve su lugar por WhatsApp.`
    : 'Consulte nuestras próximas salidas en grupo y reserve su lugar por WhatsApp.';
}

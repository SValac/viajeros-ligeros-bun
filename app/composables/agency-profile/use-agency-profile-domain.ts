import type { AgencyProfile, AgencyProfileFormData, AgencyProfileUpdateData, AgencySiteImageField } from '~/types/agency-profile';

// Holds every profile image (logo, favicon, share image, home banner), not only logos.
export const AGENCY_LOGOS_BUCKET = 'agency-logos';

type SiteImageRule = {
  // File name prefix inside the user's folder: `{uid}/{prefix}-{timestamp}.{ext}`.
  prefix: string;
  // Subject of the error messages ("El logo no puede pesar…").
  noun: string;
  mimeExtensions: Record<string, string>;
  formatsLabel: string;
  maxBytes: number;
  maxSizeLabel: string;
  // Recommended dimensions shown in the hint, when the field has any.
  dimensionsLabel?: string;
  // Checks the decoded dimensions; returns a user-facing error or `null`.
  validateDimensions?: (width: number, height: number) => string | null;
};

export const FAVICON_MIN_SIZE = 192;
export const FAVICON_MAX_SIZE = 1024;
export const SHARE_IMAGE_WIDTH = 1200;
export const SHARE_IMAGE_HEIGHT = 630;
export const BANNER_IMAGE_WIDTH = 1920;
export const BANNER_IMAGE_HEIGHT = 800;

// Every limit must fit the bucket (20260924043319_agency_logos_storage.sql: png/jpeg/webp,
// 2 MB). Favicon and share image limits come from the public site's contract (see
// 20260928001627_agency_profile_seo.sql): PNG only for the favicon, since iOS needs it and
// an SVG in a public bucket can carry scripts; no WebP for the share image, because not
// every link-preview crawler renders it. Banner limits come from
// 20261001045458_agency_profile_banner_image.sql.
export const SITE_IMAGE_RULES: Record<AgencySiteImageField, SiteImageRule> = {
  logoUrl: {
    prefix: 'logo',
    noun: 'El logo',
    mimeExtensions: { 'image/png': 'png', 'image/jpeg': 'jpg', 'image/webp': 'webp' },
    formatsLabel: 'PNG, JPG o WebP',
    maxBytes: 2 * 1024 * 1024,
    maxSizeLabel: '2 MB',
  },
  faviconUrl: {
    prefix: 'favicon',
    noun: 'El favicon',
    mimeExtensions: { 'image/png': 'png' },
    formatsLabel: 'PNG',
    maxBytes: 512 * 1024,
    maxSizeLabel: '512 KB',
    dimensionsLabel: 'cuadrado, 512×512 px recomendado',
    validateDimensions: (width, height) => {
      if (width !== height)
        return `El favicon debe ser cuadrado (la imagen mide ${width}×${height} px)`;
      if (width < FAVICON_MIN_SIZE || width > FAVICON_MAX_SIZE)
        return `El favicon debe medir entre ${FAVICON_MIN_SIZE} y ${FAVICON_MAX_SIZE} px por lado (mide ${width} px)`;
      return null;
    },
  },
  shareImageUrl: {
    prefix: 'share',
    noun: 'La imagen para compartir',
    mimeExtensions: { 'image/png': 'png', 'image/jpeg': 'jpg' },
    formatsLabel: 'JPG o PNG',
    maxBytes: 1024 * 1024,
    maxSizeLabel: '1 MB',
    dimensionsLabel: `${SHARE_IMAGE_WIDTH}×${SHARE_IMAGE_HEIGHT} px`,
  },
  bannerImageUrl: {
    prefix: 'banner',
    noun: 'El banner',
    mimeExtensions: { 'image/png': 'png', 'image/jpeg': 'jpg', 'image/webp': 'webp' },
    formatsLabel: 'JPG, PNG o WebP',
    maxBytes: 2 * 1024 * 1024,
    maxSizeLabel: '2 MB',
    dimensionsLabel: `horizontal, ${BANNER_IMAGE_WIDTH}×${BANNER_IMAGE_HEIGHT} px recomendado`,
  },
};

/**
 * Builds the `accept` attribute of a file input from an image field's allowed formats.
 * @param field - Profile image field
 * @returns Comma-separated MIME types
 */
export function siteImageAccept(field: AgencySiteImageField): string {
  return Object.keys(SITE_IMAGE_RULES[field].mimeExtensions).join(',');
}

/**
 * Formats, size limit and recommended dimensions of an image field, for the upload hint.
 * @param field - Profile image field
 * @returns E.g. `'PNG · cuadrado, 512×512 px recomendado · máximo 512 KB'`
 */
export function siteImageHint(field: AgencySiteImageField): string {
  const rule = SITE_IMAGE_RULES[field];
  return [rule.formatsLabel, rule.dimensionsLabel, `máximo ${rule.maxSizeLabel}`].filter(Boolean).join(' · ');
}

// Must match the CHECK constraints in 20260924173904_agency_profile_site_content.sql.
export const TAGLINE_MAX_LENGTH = 120;
export const CONTACT_EMAIL_MAX_LENGTH = 254;
export const SOCIAL_URL_MAX_LENGTH = 200;
export const INSTAGRAM_URL_REGEX = /^https:\/\/(?:www\.)?instagram\.com\/\S+$/;
export const FACEBOOK_URL_REGEX = /^https:\/\/(?:www\.)?facebook\.com\/\S+$/;
// Must match the CHECK constraints in 20261003144513_agency_profile_youtube_x_links.sql
// and 20261003151937_agency_profile_tiktok_link.sql.
export const YOUTUBE_URL_REGEX = /^https:\/\/(?:www\.|m\.)?youtube\.com\/\S+$/;
export const X_URL_REGEX = /^https:\/\/(?:www\.)?(?:x|twitter)\.com\/\S+$/;
export const TIKTOK_URL_REGEX = /^https:\/\/(?:www\.|m\.)?tiktok\.com\/\S+$/;

// Only MX is seeded in the location catalog for now, so every phone is Mexican.
const MX_DIAL_CODE = '52';
const MX_LOCAL_DIGITS = 10;

/**
 * An agency profile is complete when the public site can identify and filter it:
 * it needs a company name and a state. Publishing a travel requires this (Fase 5 gate).
 * @param profile - The agency profile, or `null` if not loaded
 * @returns `true` when both company name and state are set
 */
export function isProfileComplete(profile: AgencyProfile | null): boolean {
  return !!profile?.companyName?.trim() && !!profile.stateCode;
}

/**
 * Converts a stored E.164 phone (`+523312345678`) to the local digits shown in the form.
 * @param phone - Stored phone or `null`
 * @returns Local 10-digit phone, or `''` when there is none
 */
export function toLocalPhone(phone: string | null): string {
  if (!phone)
    return '';
  return phone.startsWith(`+${MX_DIAL_CODE}`) ? phone.slice(MX_DIAL_CODE.length + 1) : phone;
}

/**
 * Converts what the user typed (`33 1234 5678`) to E.164 (`+523312345678`).
 * @param value - Phone as typed in the form
 * @returns E.164 phone, or `null` when the field is empty
 */
export function toE164Phone(value: string | null): string | null {
  const digits = (value ?? '').replace(/\D/g, '');
  if (!digits)
    return null;
  return `+${MX_DIAL_CODE}${digits.slice(-MX_LOCAL_DIGITS)}`;
}

/**
 * Checks that a typed phone has exactly 10 digits once spaces and symbols are removed.
 * @param value - Phone as typed in the form
 * @returns `true` when empty (the phone is optional) or when it has 10 digits
 */
export function isValidLocalPhone(value: string): boolean {
  const digits = value.replace(/\D/g, '');
  return digits.length === 0 || digits.length === MX_LOCAL_DIGITS;
}

function normalizeHexColor(value: string | null): string | null {
  return value ? value.toUpperCase() : null;
}

function trimToNull(value: string): string | null {
  return value.trim() || null;
}

/**
 * Builds the initial form state from a stored profile.
 * @param profile - The agency profile, or `null` before it loads
 * @returns Form data with `''` for empty text inputs
 */
export function mapProfileToForm(profile: AgencyProfile | null): AgencyProfileFormData {
  return {
    companyName: profile?.companyName ?? '',
    countryCode: profile?.countryCode ?? 'MX',
    stateCode: profile?.stateCode ?? null,
    phone: toLocalPhone(profile?.phone ?? null),
    primaryColor: profile?.primaryColor ?? null,
    secondaryColor: profile?.secondaryColor ?? null,
    tagline: profile?.tagline ?? '',
    contactEmail: profile?.contactEmail ?? '',
    instagramUrl: profile?.instagramUrl ?? '',
    facebookUrl: profile?.facebookUrl ?? '',
    youtubeUrl: profile?.youtubeUrl ?? '',
    xUrl: profile?.xUrl ?? '',
    tiktokUrl: profile?.tiktokUrl ?? '',
  };
}

/**
 * Normalizes validated form data into what the repository persists:
 * trims text, converts the phone to E.164 and empty optional fields to `null`
 * (the database rejects blank strings via CHECK constraints).
 * @param form - Validated form data
 * @returns Update payload for `repository.update()`
 */
export function mapFormToUpdate(form: AgencyProfileFormData): AgencyProfileUpdateData {
  return {
    companyName: form.companyName.trim(),
    countryCode: form.countryCode,
    stateCode: form.stateCode || null,
    phone: toE164Phone(form.phone),
    primaryColor: normalizeHexColor(form.primaryColor),
    secondaryColor: normalizeHexColor(form.secondaryColor),
    tagline: trimToNull(form.tagline),
    contactEmail: trimToNull(form.contactEmail)?.toLowerCase() ?? null,
    instagramUrl: trimToNull(form.instagramUrl),
    facebookUrl: trimToNull(form.facebookUrl),
    youtubeUrl: trimToNull(form.youtubeUrl),
    xUrl: trimToNull(form.xUrl),
    tiktokUrl: trimToNull(form.tiktokUrl),
  };
}

/**
 * Validates a profile image before upload, so the user gets a clear message instead of
 * a generic bucket rejection. Decodes the file only when the field has dimension rules.
 * @param field - Profile image field the file is for
 * @param file - File picked by the user
 * @returns A user-facing error message, or `null` when the file is valid
 */
export async function validateSiteImageFile(field: AgencySiteImageField, file: File): Promise<string | null> {
  const rule = SITE_IMAGE_RULES[field];
  if (!rule.mimeExtensions[file.type])
    return `${rule.noun} debe ser ${rule.formatsLabel}`;
  if (file.size > rule.maxBytes)
    return `${rule.noun} no puede pesar más de ${rule.maxSizeLabel}`;
  if (!rule.validateDimensions)
    return null;

  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file);
  }
  catch {
    return `No se pudo leer la imagen. Prueba con otro archivo ${rule.formatsLabel}`;
  }
  const { width, height } = bitmap;
  bitmap.close();
  return rule.validateDimensions(width, height);
}

/**
 * Non-blocking advice for the share image: link previews crop anything far from
 * 1200×630 (1.91:1), and smaller images look blurry.
 * @param width - Image width in px
 * @param height - Image height in px
 * @returns A user-facing warning, or `null` when the image fits
 */
export function shareImageWarning(width: number, height: number): string | null {
  const ratio = width / height;
  const targetRatio = SHARE_IMAGE_WIDTH / SHARE_IMAGE_HEIGHT;
  if (Math.abs(ratio - targetRatio) / targetRatio > 0.05)
    return `La imagen mide ${width}×${height} px. Al compartir se recortará: usa una proporción de ${SHARE_IMAGE_WIDTH}×${SHARE_IMAGE_HEIGHT} px.`;
  if (width < SHARE_IMAGE_WIDTH)
    return `La imagen mide ${width}×${height} px y puede verse borrosa. Se recomiendan ${SHARE_IMAGE_WIDTH}×${SHARE_IMAGE_HEIGHT} px.`;
  return null;
}

/**
 * Non-blocking advice for the home banner: the site center-crops it to a wide strip
 * (about 4:1 on desktop, 16:9 on mobile), so tall images lose most of their content and
 * narrow ones look blurry at full width.
 * @param width - Image width in px
 * @param height - Image height in px
 * @returns A user-facing warning, or `null` when the image fits
 */
export function bannerImageWarning(width: number, height: number): string | null {
  if (width / height < 16 / 9)
    return `La imagen mide ${width}×${height} px. El banner es una franja horizontal, así que se recortará gran parte de arriba y abajo: usa una imagen horizontal de ${BANNER_IMAGE_WIDTH}×${BANNER_IMAGE_HEIGHT} px.`;
  if (width < BANNER_IMAGE_WIDTH)
    return `La imagen mide ${width}×${height} px y puede verse borrosa a todo lo ancho. Se recomiendan ${BANNER_IMAGE_WIDTH}×${BANNER_IMAGE_HEIGHT} px.`;
  return null;
}

/**
 * Extracts the storage path (`{uid}/logo-123.png`) from a profile image's public URL,
 * so the previous file can be removed when the image changes.
 * @param publicUrl - Public URL stored in `agency_profiles` (logo, favicon, share image or banner)
 * @returns The object path inside the bucket, or `null` if the URL is not from it
 */
export function getSiteImageStoragePath(publicUrl: string | null): string | null {
  if (!publicUrl)
    return null;
  const marker = `/${AGENCY_LOGOS_BUCKET}/`;
  const index = publicUrl.indexOf(marker);
  return index === -1 ? null : decodeURIComponent(publicUrl.slice(index + marker.length));
}

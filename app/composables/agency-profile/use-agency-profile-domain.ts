import type { AgencyProfile, AgencyProfileFormData, AgencyProfileUpdateData } from '~/types/agency-profile';

export const AGENCY_LOGOS_BUCKET = 'agency-logos';

// Must match the bucket limits in 20260924043319_agency_logos_storage.sql.
export const LOGO_MAX_BYTES = 2 * 1024 * 1024;
export const LOGO_MIME_EXTENSIONS: Record<string, string> = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/webp': 'webp',
};

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
  };
}

/**
 * Validates a logo file before upload, so the user gets a clear message
 * instead of a generic bucket rejection.
 * @param file - File picked by the user
 * @returns A user-facing error message, or `null` when the file is valid
 */
export function validateLogoFile(file: File): string | null {
  if (!LOGO_MIME_EXTENSIONS[file.type])
    return 'El logo debe ser PNG, JPG o WebP';
  if (file.size > LOGO_MAX_BYTES)
    return 'El logo no puede pesar más de 2 MB';
  return null;
}

/**
 * Extracts the storage path (`{uid}/logo-123.png`) from a logo's public URL,
 * so the previous file can be removed when the logo changes.
 * @param publicUrl - Public URL stored in `agency_profiles.logo_url`
 * @returns The object path inside the bucket, or `null` if the URL is not from it
 */
export function getLogoStoragePath(publicUrl: string | null): string | null {
  if (!publicUrl)
    return null;
  const marker = `/${AGENCY_LOGOS_BUCKET}/`;
  const index = publicUrl.indexOf(marker);
  return index === -1 ? null : decodeURIComponent(publicUrl.slice(index + marker.length));
}

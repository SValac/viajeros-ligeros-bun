import type { AgencyProfile, AgencyProfileUpdateData, CountryState } from '~/types/agency-profile';
import type { TablesUpdate } from '~/types/database.types';

import { AGENCY_LOGOS_BUCKET, LOGO_MIME_EXTENSIONS } from '~/composables/agency-profile/use-agency-profile-domain';

/**
 * Data access layer for `agency_profiles`, the `country_states` catalog and the
 * `agency-logos` bucket. Each function performs a single Supabase operation and either
 * returns domain data or throws — it never touches reactive state.
 */
export function useAgencyProfileRepository() {
  const supabase = useSupabase();

  /**
   * Reads the signed-in user's id from the Supabase client session.
   * Stores may load before the auth middleware fills `useAuthStore`, so this
   * does not depend on it.
   * @returns The current user's id
   * @throws {Error} when there is no session
   */
  async function requireUserId(): Promise<string> {
    const { data, error } = await supabase.auth.getSession();
    if (error)
      throw error;
    const userId = data.session?.user.id;
    if (!userId)
      throw new Error('No hay una sesión activa');
    return userId;
  }

  /**
   * Fetches the current user's agency profile. Every agency owner has exactly one row
   * (created by the signup trigger), so a missing row surfaces as an error.
   * @returns The agency profile mapped to a domain object
   * @throws {PostgrestError} on Supabase failure or when the row does not exist
   */
  async function fetchMine(): Promise<AgencyProfile> {
    const userId = await requireUserId();
    const { data, error } = await supabase
      .from('agency_profiles')
      .select('*')
      .eq('id', userId)
      .single();
    if (error)
      throw error;

    return mapAgencyProfileRowToDomain(data);
  }

  /**
   * Updates the current user's agency profile. Only fields present in `data` are sent
   * (camelCase keys are translated to snake_case here). `.select().single()` turns an
   * RLS-blocked update (0 rows, no error) into a visible error.
   * @param data - Partial update data; omitted fields are left unchanged
   * @returns The updated profile mapped to a domain object
   * @throws {PostgrestError} on Supabase failure
   */
  async function update(data: AgencyProfileUpdateData): Promise<AgencyProfile> {
    const userId = await requireUserId();
    const update: TablesUpdate<'agency_profiles'> = {};
    if (data.companyName !== undefined)
      update.company_name = data.companyName;
    if (data.countryCode !== undefined)
      update.country_code = data.countryCode;
    if (data.stateCode !== undefined)
      update.state_code = data.stateCode;
    if (data.phone !== undefined)
      update.phone = data.phone;
    if (data.primaryColor !== undefined)
      update.primary_color = data.primaryColor;
    if (data.secondaryColor !== undefined)
      update.secondary_color = data.secondaryColor;
    if (data.logoUrl !== undefined)
      update.logo_url = data.logoUrl;

    const { data: row, error } = await supabase
      .from('agency_profiles')
      .update(update)
      .eq('id', userId)
      .select()
      .single();
    if (error)
      throw error;

    return mapAgencyProfileRowToDomain(row);
  }

  /**
   * Fetches the states of a country from the location catalog, ordered by name.
   * @param countryCode - ISO 3166-1 alpha-2 code (e.g. `'MX'`)
   * @returns The country's states mapped to domain objects
   * @throws {PostgrestError} on Supabase failure
   */
  async function fetchStates(countryCode: string): Promise<CountryState[]> {
    const { data, error } = await supabase
      .from('country_states')
      .select('*')
      .eq('country_code', countryCode)
      .order('name');
    if (error)
      throw error;

    return data.map(mapCountryStateRowToDomain);
  }

  /**
   * Uploads a logo under the user's folder with a timestamped name, so the CDN never
   * serves a stale logo after a change. Does NOT touch `agency_profiles`: the store
   * orchestrates upload → update → remove old, and needs to roll back the upload
   * if the update fails.
   * @param file - Validated logo file (png/jpeg/webp, ≤ 2 MB)
   * @returns The object path and its public URL
   * @throws {StorageError} on upload failure
   */
  async function uploadLogo(file: File): Promise<{ path: string; publicUrl: string }> {
    const userId = await requireUserId();
    const extension = LOGO_MIME_EXTENSIONS[file.type] ?? 'png';
    const path = `${userId}/logo-${Date.now()}.${extension}`;

    const { error } = await supabase.storage
      .from(AGENCY_LOGOS_BUCKET)
      .upload(path, file, { contentType: file.type });
    if (error)
      throw error;

    const { data } = supabase.storage
      .from(AGENCY_LOGOS_BUCKET)
      .getPublicUrl(path);

    return { path, publicUrl: data.publicUrl };
  }

  /**
   * Removes a logo file from the bucket.
   * @param path - Object path inside the bucket (`{uid}/logo-123.png`)
   * @throws {StorageError} on Supabase failure
   */
  async function removeLogo(path: string): Promise<void> {
    const { error } = await supabase.storage
      .from(AGENCY_LOGOS_BUCKET)
      .remove([path]);
    if (error)
      throw error;
  }

  return { fetchMine, update, fetchStates, uploadLogo, removeLogo };
}

import type { AboutPage, AgencyProfile, AgencyProfileFormData, CountryState, HomePage } from '~/types/agency-profile';

import { serializeAboutPage } from '~/composables/agency-profile/use-about-page-domain';
import {
  getLogoStoragePath,
  isProfileComplete,
  mapFormToUpdate,
  validateLogoFile,
} from '~/composables/agency-profile/use-agency-profile-domain';
import { useAgencyProfileRepository } from '~/composables/agency-profile/use-agency-profile-repository';
import { serializeHomePage } from '~/composables/agency-profile/use-home-page-domain';

/**
 * Cache and orchestrator for the signed-in user's agency profile and the state catalog.
 * Delegates all Supabase I/O to `useAgencyProfileRepository`.
 * Loaded on demand (sidebar, profile page, travel form) instead of in `init-stores`, because
 * plugins run before the auth middleware and on the login page.
 * @returns Store state, getters and actions
 */
export const useAgencyProfileStore = defineStore('useAgencyProfileStore', () => {
  const repository = useAgencyProfileRepository();

  // State
  const profile = ref<AgencyProfile | null>(null);
  const states = ref<CountryState[]>([]);
  const loading = shallowRef(false);
  const saving = shallowRef(false);
  const uploadingLogo = shallowRef(false);
  const error = shallowRef<string | null>(null);

  // Getters
  const isComplete = computed(() => isProfileComplete(profile.value));

  const stateName = computed(() =>
    states.value.find(s => s.code === profile.value?.stateCode)?.name ?? null,
  );

  // Actions
  /**
   * Loads the profile and the state catalog. Errors are stored in `error`,
   * not propagated.
   * @param options - `force` reloads even if the profile is already cached
   * @param options.force - Reload even when the profile is already cached
   */
  async function fetchProfile({ force = false }: { force?: boolean } = {}): Promise<void> {
    if (profile.value && !force)
      return;

    loading.value = true;
    error.value = null;
    try {
      const [loadedProfile, loadedStates] = await Promise.all([
        repository.fetchMine(),
        states.value.length ? Promise.resolve(states.value) : repository.fetchStates('MX'),
      ]);
      profile.value = loadedProfile;
      states.value = loadedStates;
    }
    catch (e) {
      error.value = e instanceof Error ? e.message : 'Error al cargar el perfil de la agencia';
    }
    finally {
      loading.value = false;
    }
  }

  /**
   * Normalizes and saves the profile form.
   * @param form - Validated form data
   * @returns `true` on success; on failure the message is stored in `error`
   */
  async function saveProfile(form: AgencyProfileFormData): Promise<boolean> {
    saving.value = true;
    error.value = null;
    try {
      profile.value = await repository.update(mapFormToUpdate(form));
      return true;
    }
    catch (e) {
      error.value = e instanceof Error ? e.message : 'Error al guardar el perfil';
      return false;
    }
    finally {
      saving.value = false;
    }
  }

  /**
   * Saves the "Nosotros" page (serialized to the stored JSON). `null` removes the page
   * from the agency's site.
   * @param page - Validated editor state, or `null`
   * @returns `true` on success; on failure the message is stored in `error`
   */
  async function saveAboutPage(page: AboutPage | null): Promise<boolean> {
    saving.value = true;
    error.value = null;
    try {
      profile.value = await repository.update({ aboutPage: serializeAboutPage(page) });
      return true;
    }
    catch (e) {
      error.value = e instanceof Error ? e.message : 'Error al guardar la página Nosotros';
      return false;
    }
    finally {
      saving.value = false;
    }
  }

  /**
   * Saves the home page (serialized to the stored JSON). `null` restores the site's
   * default home.
   * @param page - Validated editor state, or `null`
   * @returns `true` on success; on failure the message is stored in `error`
   */
  async function saveHomePage(page: HomePage | null): Promise<boolean> {
    saving.value = true;
    error.value = null;
    try {
      profile.value = await repository.update({ homePage: serializeHomePage(page) });
      return true;
    }
    catch (e) {
      error.value = e instanceof Error ? e.message : 'Error al guardar la página principal';
      return false;
    }
    finally {
      saving.value = false;
    }
  }

  /**
   * Replaces the logo: upload the new file → point the profile at it → remove the old file.
   * If the profile update fails, the new file is removed so the bucket keeps no orphan
   * and the profile keeps its previous logo. A failure removing the OLD file is not an
   * error for the user (the new logo is already live); it only leaves an orphan behind.
   * @param file - Logo picked by the user
   * @returns `true` on success; on failure the message is stored in `error`
   */
  async function changeLogo(file: File): Promise<boolean> {
    const validationError = validateLogoFile(file);
    if (validationError) {
      error.value = validationError;
      return false;
    }

    uploadingLogo.value = true;
    error.value = null;
    const previousPath = getLogoStoragePath(profile.value?.logoUrl ?? null);
    let uploadedPath: string | null = null;
    try {
      const uploaded = await repository.uploadLogo(file);
      uploadedPath = uploaded.path;
      profile.value = await repository.update({ logoUrl: uploaded.publicUrl });
    }
    catch (e) {
      if (uploadedPath)
        await repository.removeLogo(uploadedPath).catch(() => {});
      error.value = e instanceof Error ? e.message : 'Error al subir el logo';
      uploadingLogo.value = false;
      return false;
    }

    if (previousPath)
      await repository.removeLogo(previousPath).catch(() => {});
    uploadingLogo.value = false;
    return true;
  }

  /**
   * Clears the logo from the profile, then removes its file.
   * @returns `true` on success; on failure the message is stored in `error`
   */
  async function removeLogo(): Promise<boolean> {
    uploadingLogo.value = true;
    error.value = null;
    const previousPath = getLogoStoragePath(profile.value?.logoUrl ?? null);
    try {
      profile.value = await repository.update({ logoUrl: null });
    }
    catch (e) {
      error.value = e instanceof Error ? e.message : 'Error al quitar el logo';
      uploadingLogo.value = false;
      return false;
    }

    if (previousPath)
      await repository.removeLogo(previousPath).catch(() => {});
    uploadingLogo.value = false;
    return true;
  }

  return {
    // State
    profile,
    states,
    loading,
    saving,
    uploadingLogo,
    error,
    // Getters
    isComplete,
    stateName,
    // Actions
    fetchProfile,
    saveProfile,
    saveAboutPage,
    saveHomePage,
    changeLogo,
    removeLogo,
  };
});

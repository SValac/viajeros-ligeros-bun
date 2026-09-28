import type {
  AboutPage,
  AgencyProfile,
  AgencyProfileFormData,
  AgencySeoFormData,
  AgencySiteImageField,
  CountryState,
  HomePage,
} from '~/types/agency-profile';

import { serializeAboutPage } from '~/composables/agency-profile/use-about-page-domain';
import {
  getSiteImageStoragePath,
  isProfileComplete,
  mapFormToUpdate,
  SITE_IMAGE_RULES,
  validateSiteImageFile,
} from '~/composables/agency-profile/use-agency-profile-domain';
import { useAgencyProfileRepository } from '~/composables/agency-profile/use-agency-profile-repository';
import { mapSeoFormToUpdate } from '~/composables/agency-profile/use-agency-seo-domain';
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
  // Image field being uploaded or removed, so only that card shows a spinner.
  const uploadingImage = shallowRef<AgencySiteImageField | null>(null);
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
   * Saves the texts of the "SEO y redes" tab. Empty texts are saved as `null`, so the
   * site falls back to its defaults.
   * @param form - Validated form data
   * @returns `true` on success; on failure the message is stored in `error`
   */
  async function saveSeo(form: AgencySeoFormData): Promise<boolean> {
    saving.value = true;
    error.value = null;
    try {
      profile.value = await repository.update(mapSeoFormToUpdate(form));
      return true;
    }
    catch (e) {
      error.value = e instanceof Error ? e.message : 'Error al guardar el SEO';
      return false;
    }
    finally {
      saving.value = false;
    }
  }

  /**
   * Replaces a profile image (logo, favicon or share image): upload the new file → point
   * the profile at it → remove the old file. If the profile update fails, the new file is
   * removed so the bucket keeps no orphan and the profile keeps its previous image.
   * A failure removing the OLD file is not an error for the user (the new image is
   * already live); it only leaves an orphan behind.
   * @param field - Profile image field to replace
   * @param file - Image picked by the user
   * @returns `true` on success; on failure the message is stored in `error`
   */
  async function changeSiteImage(field: AgencySiteImageField, file: File): Promise<boolean> {
    uploadingImage.value = field;
    error.value = null;
    const validationError = await validateSiteImageFile(field, file);
    if (validationError) {
      error.value = validationError;
      uploadingImage.value = null;
      return false;
    }

    const previousPath = getSiteImageStoragePath(profile.value?.[field] ?? null);
    let uploadedPath: string | null = null;
    try {
      const uploaded = await repository.uploadImage(field, file);
      uploadedPath = uploaded.path;
      profile.value = await repository.update({ [field]: uploaded.publicUrl });
    }
    catch (e) {
      if (uploadedPath)
        await repository.removeImage(uploadedPath).catch(() => {});
      error.value = e instanceof Error ? e.message : `Error al subir ${SITE_IMAGE_RULES[field].noun.toLowerCase()}`;
      uploadingImage.value = null;
      return false;
    }

    if (previousPath)
      await repository.removeImage(previousPath).catch(() => {});
    uploadingImage.value = null;
    return true;
  }

  /**
   * Clears a profile image from the profile, then removes its file.
   * @param field - Profile image field to clear
   * @returns `true` on success; on failure the message is stored in `error`
   */
  async function removeSiteImage(field: AgencySiteImageField): Promise<boolean> {
    uploadingImage.value = field;
    error.value = null;
    const previousPath = getSiteImageStoragePath(profile.value?.[field] ?? null);
    try {
      profile.value = await repository.update({ [field]: null });
    }
    catch (e) {
      error.value = e instanceof Error ? e.message : `Error al quitar ${SITE_IMAGE_RULES[field].noun.toLowerCase()}`;
      uploadingImage.value = null;
      return false;
    }

    if (previousPath)
      await repository.removeImage(previousPath).catch(() => {});
    uploadingImage.value = null;
    return true;
  }

  return {
    // State
    profile,
    states,
    loading,
    saving,
    uploadingImage,
    error,
    // Getters
    isComplete,
    stateName,
    // Actions
    fetchProfile,
    saveProfile,
    saveAboutPage,
    saveHomePage,
    saveSeo,
    changeSiteImage,
    removeSiteImage,
  };
});

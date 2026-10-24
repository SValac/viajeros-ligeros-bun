import type {
  AboutPage,
  AgencyProfile,
  AgencyProfileFormData,
  AgencyProfileUpdateData,
  AgencySeoFormData,
  AgencySiteImageField,
  CountryState,
  HomePage,
  PrivacyNotice,
} from '~/types/agency-profile';

import { serializeAboutPage } from '~/composables/agency-profile/use-about-page-domain';
import {
  AGENCY_LOGOS_BUCKET,
  isProfileComplete,
  mapFormToUpdate,
  SITE_IMAGE_RULES,
  validateSiteImageFile,
} from '~/composables/agency-profile/use-agency-profile-domain';
import { useAgencyProfileRepository } from '~/composables/agency-profile/use-agency-profile-repository';
import { mapSeoFormToUpdate } from '~/composables/agency-profile/use-agency-seo-domain';
import { serializeHomePage } from '~/composables/agency-profile/use-home-page-domain';
import { serializePrivacyNotice } from '~/composables/agency-profile/use-privacy-notice-domain';
import { toErrorMessage } from '~/utils/error-message';
import { storagePathFromPublicUrl } from '~/utils/storage';

/**
 * Cache and orchestrator for the signed-in user's agency profile and the state catalog.
 * Delegates all Supabase I/O to `useAgencyProfileRepository`.
 * Loaded on demand (sidebar, profile page, travel form), like every other store: nothing is
 * fetched at app boot, which also runs on the login page, before the auth middleware.
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
   * Loads the profile and the state catalog.
   * @param options - `force` reloads even if the profile is already cached
   * @param options.force - Reload even when the profile is already cached
   * @throws Re-throws the error (its message is also stored in `error`)
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
      error.value = toErrorMessage(e, 'Error al cargar el perfil de la agencia');
      throw e;
    }
    finally {
      loading.value = false;
    }
  }

  /**
   * Saves part of the profile, with `saving` and `error` around it.
   * @param update - The fields to save
   * @param fallback - Error message when the failure carries none
   * @throws Re-throws the error (its message is also stored in `error`)
   */
  async function _save(update: AgencyProfileUpdateData, fallback: string): Promise<void> {
    saving.value = true;
    error.value = null;
    try {
      profile.value = await repository.update(update);
    }
    catch (e) {
      error.value = toErrorMessage(e, fallback);
      throw e;
    }
    finally {
      saving.value = false;
    }
  }

  /**
   * Normalizes and saves the profile form.
   * @param form - Validated form data
   */
  function saveProfile(form: AgencyProfileFormData): Promise<void> {
    return _save(mapFormToUpdate(form), 'Error al guardar el perfil');
  }

  /**
   * Saves the "Nosotros" page (serialized to the stored JSON). `null` removes the page
   * from the agency's site.
   * @param page - Validated editor state, or `null`
   */
  function saveAboutPage(page: AboutPage | null): Promise<void> {
    return _save({ aboutPage: serializeAboutPage(page) }, 'Error al guardar la página Nosotros');
  }

  /**
   * Saves the home page (serialized to the stored JSON). `null` restores the site's
   * default home.
   * @param page - Validated editor state, or `null`
   */
  function saveHomePage(page: HomePage | null): Promise<void> {
    return _save({ homePage: serializeHomePage(page) }, 'Error al guardar la página principal');
  }

  /**
   * Saves the privacy notice (serialized to the stored JSON). `null` removes the notice
   * from the agency's site.
   * @param notice - Validated editor state, or `null`
   */
  function savePrivacyNotice(notice: PrivacyNotice | null): Promise<void> {
    return _save({ privacyNotice: serializePrivacyNotice(notice) }, 'Error al guardar el aviso de privacidad');
  }

  /**
   * Saves the texts of the "SEO y redes" tab. Empty texts are saved as `null`, so the
   * site falls back to its defaults.
   * @param form - Validated form data
   */
  function saveSeo(form: AgencySeoFormData): Promise<void> {
    return _save(mapSeoFormToUpdate(form), 'Error al guardar el SEO');
  }

  /**
   * Replaces a profile image (logo, favicon, share image or banner): upload the new file → point
   * the profile at it → remove the old file. If the profile update fails, the new file is
   * removed so the bucket keeps no orphan and the profile keeps its previous image.
   * A failure removing the OLD file is not an error for the user (the new image is
   * already live); it only leaves an orphan behind.
   * @param field - Profile image field to replace
   * @param file - Image picked by the user
   * @throws Re-throws the error (its message is also stored in `error`)
   */
  async function changeSiteImage(field: AgencySiteImageField, file: File): Promise<void> {
    uploadingImage.value = field;
    error.value = null;
    const validationError = await validateSiteImageFile(field, file);
    if (validationError) {
      error.value = validationError;
      uploadingImage.value = null;
      throw new Error(validationError);
    }

    const previousPath = storagePathFromPublicUrl(profile.value?.[field], AGENCY_LOGOS_BUCKET);
    let uploadedPath: string | null = null;
    try {
      const uploaded = await repository.uploadImage(field, file);
      uploadedPath = uploaded.path;
      profile.value = await repository.update({ [field]: uploaded.publicUrl });
    }
    catch (e) {
      if (uploadedPath)
        await repository.removeImage(uploadedPath).catch(() => {});
      error.value = toErrorMessage(e, `Error al subir ${SITE_IMAGE_RULES[field].noun.toLowerCase()}`);
      uploadingImage.value = null;
      throw e;
    }

    if (previousPath)
      await repository.removeImage(previousPath).catch(() => {});
    uploadingImage.value = null;
  }

  /**
   * Clears a profile image from the profile, then removes its file.
   * @param field - Profile image field to clear
   * @throws Re-throws the error (its message is also stored in `error`)
   */
  async function removeSiteImage(field: AgencySiteImageField): Promise<void> {
    uploadingImage.value = field;
    error.value = null;
    const previousPath = storagePathFromPublicUrl(profile.value?.[field], AGENCY_LOGOS_BUCKET);
    try {
      profile.value = await repository.update({ [field]: null });
    }
    catch (e) {
      error.value = toErrorMessage(e, `Error al quitar ${SITE_IMAGE_RULES[field].noun.toLowerCase()}`);
      uploadingImage.value = null;
      throw e;
    }

    if (previousPath)
      await repository.removeImage(previousPath).catch(() => {});
    uploadingImage.value = null;
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
    savePrivacyNotice,
    saveSeo,
    changeSiteImage,
    removeSiteImage,
  };
});

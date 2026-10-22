import type { AgencySiteImageField } from '~/types/agency-profile';

import { SITE_IMAGE_RULES } from '~/composables/agency-profile/use-agency-profile-domain';
import { toErrorMessage } from '~/utils/error-message';

/**
 * Uploads and removes the agency's site images (logo, favicon, banner, share image) with
 * their toasts, named after the image ("El logo se actualizó").
 * @returns `selectImage(field, file)` and `removeImage(field)`, each resolving to whether it worked
 */
export function useSiteImageActions() {
  const agencyProfileStore = useAgencyProfileStore();
  const toast = useToast();

  async function selectImage(field: AgencySiteImageField, file: File): Promise<boolean> {
    const noun = SITE_IMAGE_RULES[field].noun;
    try {
      await agencyProfileStore.changeSiteImage(field, file);
      toast.add({ title: `${noun} se actualizó`, color: 'success', icon: 'i-lucide-check-circle' });
      return true;
    }
    catch (e) {
      toast.add({ title: `No se pudo subir ${noun.toLowerCase()}`, description: toErrorMessage(e, 'Intenta de nuevo'), color: 'error', icon: 'i-lucide-alert-circle' });
      return false;
    }
  }

  async function removeImage(field: AgencySiteImageField): Promise<boolean> {
    const noun = SITE_IMAGE_RULES[field].noun;
    try {
      await agencyProfileStore.removeSiteImage(field);
      toast.add({ title: `${noun} se quitó`, color: 'warning', icon: 'i-lucide-trash-2' });
      return true;
    }
    catch (e) {
      toast.add({ title: `No se pudo quitar ${noun.toLowerCase()}`, description: toErrorMessage(e, 'Intenta de nuevo'), color: 'error', icon: 'i-lucide-alert-circle' });
      return false;
    }
  }

  return { selectImage, removeImage };
}

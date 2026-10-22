import type { TravelMedia, TravelMediaType } from '~/types/travel-media';

import { useTravelMediaRepository } from '~/composables/travels/use-travel-media-repository';
import { toErrorMessage } from '~/utils/error-message';

export const useTravelMediaStore = defineStore('useTravelMediaStore', () => {
  const repository = useTravelMediaRepository();

  // State
  const mediaByTravel = ref<Record<string, TravelMedia[]>>({});
  const uploading = ref(false);
  const error = ref<string | null>(null);

  // Getters
  const getMediaByTravel = computed(() => {
    return (travelId: string): TravelMedia[] => mediaByTravel.value[travelId] ?? [];
  });

  // Actions
  async function fetchForTravel(travelId: string): Promise<void> {
    error.value = null;
    try {
      mediaByTravel.value[travelId] = await repository.fetchByTravel(travelId);
    }
    catch (e) {
      error.value = toErrorMessage(e, 'Error al cargar la galería');
      throw e;
    }
  }

  async function uploadMedia(travelId: string, file: File, mediaType: TravelMediaType): Promise<void> {
    uploading.value = true;
    error.value = null;
    try {
      const newMedia = await repository.upload(travelId, file, mediaType);
      if (!mediaByTravel.value[travelId]) {
        mediaByTravel.value[travelId] = [];
      }
      mediaByTravel.value[travelId] = [...mediaByTravel.value[travelId], newMedia];
    }
    catch (e) {
      error.value = toErrorMessage(e, 'Error al subir archivo');
      throw e;
    }
    finally {
      uploading.value = false;
    }
  }

  async function removeMedia(id: string, storagePath: string, travelId: string): Promise<void> {
    error.value = null;
    try {
      await repository.remove(id, storagePath);
      mediaByTravel.value[travelId] = (mediaByTravel.value[travelId] ?? []).filter(m => m.id !== id);
    }
    catch (e) {
      error.value = toErrorMessage(e, 'Error al eliminar archivo');
      throw e;
    }
  }

  function getThumbnailUrl(storagePath: string): string {
    return repository.getThumbnailUrl(storagePath);
  }

  return {
    mediaByTravel,
    uploading,
    error,
    getMediaByTravel,
    fetchForTravel,
    uploadMedia,
    removeMedia,
    getThumbnailUrl,
  };
});

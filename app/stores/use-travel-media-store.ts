import type { TravelMedia, TravelMediaType } from '~/types/travel-media';

import { useTravelMediaRepository } from '~/composables/travels/use-travel-media-repository';

export const useTravelMediaStore = defineStore('useTravelMediaStore', () => {
  const repository = useTravelMediaRepository();
  const toast = useToast();

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
      error.value = e instanceof Error ? e.message : 'Error al cargar la galería';
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
      toast.add({ title: 'Archivo subido', color: 'success', icon: 'i-lucide-check' });
    }
    catch (e) {
      error.value = e instanceof Error ? e.message : 'Error al subir archivo';
      toast.add({ title: 'Error al subir', description: error.value ?? undefined, color: 'error', icon: 'i-lucide-x' });
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
      toast.add({ title: 'Archivo eliminado', color: 'success', icon: 'i-lucide-trash-2' });
    }
    catch (e) {
      error.value = e instanceof Error ? e.message : 'Error al eliminar archivo';
      toast.add({ title: 'Error al eliminar', description: error.value ?? undefined, color: 'error', icon: 'i-lucide-x' });
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

import type { TravelAccessCode } from '~/types/travel-access';

import { toTravelAccessCodeError } from '~/composables/travel-access/use-travel-access-domain';
import { useTravelAccessRepository } from '~/composables/travel-access/use-travel-access-repository';

export const useTravelAccessStore = defineStore('useTravelAccessStore', () => {
  const repository = useTravelAccessRepository();
  const toast = useToast();

  // State
  const activeCodeByTravel = ref<Record<string, TravelAccessCode | null>>({});
  const revealedCodeByTravel = ref<Record<string, string | null>>({});
  const loading = shallowRef(false);
  const error = ref<string | null> (null);

  // Getters
  const getActiveCode = computed(() => {
    return (travelId: string): TravelAccessCode | null => activeCodeByTravel.value[travelId] ?? null;
  });

  const getRevealedCode = computed(() => {
    return (travelId: string) => revealedCodeByTravel.value[travelId] ?? null;
  });

  // Actions
  async function fetchActiveCode(travelId: string) {
    error.value = null;
    loading.value = true;

    try {
      activeCodeByTravel.value[travelId] = await repository.fetchActiveCode(travelId);
    }
    catch (e) {
      error.value = e instanceof Error ? e.message : 'Error al obtener el código';
    }
    finally {
      loading.value = false;
    }
  }

  async function generateCode(travelId: string) {
    error.value = null;
    loading.value = true;
    try {
      const response = await repository.generate(travelId);
      activeCodeByTravel.value[travelId] = response;
      revealedCodeByTravel.value[travelId] = response.code;

      toast.add({ title: 'Código generado', color: 'success', icon: 'i-lucide-check' });
    }
    catch (e) {
      error.value = toTravelAccessCodeError(e).message;
      toast.add({ title: 'Error al generar código', description: error.value ?? undefined, color: 'error', icon: 'i-lucide-x' });
    }
    finally {
      loading.value = false;
    }
  }

  async function revokeCode(travelId: string) {
    error.value = null;
    loading.value = true;
    try {
      await repository.revoke(travelId);
      activeCodeByTravel.value[travelId] = null;
      revealedCodeByTravel.value[travelId] = null;

      toast.add({ title: 'Código revocado', color: 'success', icon: 'i-lucide-trash-2' });
    }
    catch (e) {
      error.value = toTravelAccessCodeError(e).message;
      toast.add({ title: 'Error al eliminar', description: error.value ?? undefined, color: 'error', icon: 'i-lucide-x' });
    }
    finally {
      loading.value = false;
    }
  }

  return {
    activeCodeByTravel,
    revealedCodeByTravel,
    loading,
    error,
    getActiveCode,
    getRevealedCode,
    fetchActiveCode,
    generateCode,
    revokeCode,
  };
});

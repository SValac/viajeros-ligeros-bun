import type { TravelAccessCode } from '~/types/travel-access';

import { toTravelAccessCodeError } from '~/composables/travel-access/use-travel-access-domain';
import { useTravelAccessRepository } from '~/composables/travel-access/use-travel-access-repository';
import { toErrorMessage } from '~/utils/error-message';

export const useTravelAccessStore = defineStore('useTravelAccessStore', () => {
  const repository = useTravelAccessRepository();

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

  /** `false` until the travel's first fetch resolves: `getActiveCode` is `null` before that too. */
  const isActiveCodeLoaded = computed(() => {
    return (travelId: string) => travelId in activeCodeByTravel.value;
  });

  // Actions
  async function fetchActiveCode(travelId: string) {
    error.value = null;
    loading.value = true;

    try {
      activeCodeByTravel.value[travelId] = await repository.fetchActiveCode(travelId);
    }
    catch (e) {
      error.value = toErrorMessage(e, 'Error al obtener el código');
      throw e;
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
    }
    catch (e) {
      error.value = toTravelAccessCodeError(e).message;
      throw new Error(error.value, { cause: e });
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
    }
    catch (e) {
      error.value = toTravelAccessCodeError(e).message;
      throw new Error(error.value, { cause: e });
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
    isActiveCodeLoaded,
    fetchActiveCode,
    generateCode,
    revokeCode,
  };
});

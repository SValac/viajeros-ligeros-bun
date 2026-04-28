import type { Traveler, TravelerFilters, TravelerFormData, TravelerSeatChangeResult, TravelerUpdateData, TravelerWithChildren } from '~/types/traveler';

import { filterTravelers, groupTravelersByRepresentative, isTravelerSeatChangeResult, toTravelerSeatChangeError } from '~/composables/travelers/use-traveler-domain';
import { useTravelerRepository } from '~/composables/travelers/use-traveler-repository';
import { TravelerSeatChangeError } from '~/types/traveler';

export const useTravelerStore = defineStore('useTravelerStore', () => {
  const repository = useTravelerRepository();

  // State
  const travelers = ref<Traveler[]>([]);
  const loading = shallowRef(false);
  const error = shallowRef<string | null>(null);
  const filters = ref<TravelerFilters>({});

  // Getters (computed)
  const allTravelers = computed((): Traveler[] => {
    return [...travelers.value].sort((a, b) =>
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
  });

  const getTravelerById = computed(() => {
    return (id: string): Traveler | undefined => {
      return travelers.value.find(t => t.id === id);
    };
  });

  const getTravelersByTravel = computed(() => {
    return (travelId: string): Traveler[] => {
      return travelers.value.filter(t => t.travelId === travelId);
    };
  });

  const getTravelersByBus = computed(() => {
    return (travelBusId: string): Traveler[] => {
      return travelers.value.filter(t => t.travelBusId === travelBusId);
    };
  });

  const getTravelersByAccommodation = computed(() => {
    return (travelAccommodationId: string): Traveler[] => {
      return travelers.value.filter(t => t.travelAccommodationId === travelAccommodationId);
    };
  });

  const getGroupMembers = computed(() => {
    return (representativeId: string): Traveler[] => {
      return travelers.value.filter(t => t.representativeId === representativeId);
    };
  });

  const filteredTravelers = computed((): Traveler[] => {
    return filterTravelers(travelers.value, filters.value);
  });

  const filteredGroupedTravelers = computed((): TravelerWithChildren[] => {
    return groupTravelersByRepresentative(filteredTravelers.value, filters.value.representativeId);
  });

  // Actions
  async function fetchAll(): Promise<void> {
    loading.value = true;
    error.value = null;
    try {
      travelers.value = await repository.fetchAll();
    }
    catch (e) {
      error.value = e instanceof Error ? e.message : 'Error desconocido';
    }
    finally {
      loading.value = false;
    }
  }

  async function fetchByTravel(travelId: string): Promise<void> {
    loading.value = true;
    error.value = null;
    try {
      const fetched = await repository.fetchByTravel(travelId);
      // el store es un cache global — puede tener viajeros de múltiples viajes ya cargados. Si
      // haces travelers.value = fetched pierdes los viajeros de otros viajes. El merge dice:
      // "reemplaza solo los del travelId X, conserva todos los demás".
      travelers.value = [
        ...travelers.value.filter(t => t.travelId !== travelId),
        ...fetched,
      ];
    }
    catch (e) {
      error.value = e instanceof Error ? e.message : 'Error desconocido';
    }
    finally {
      loading.value = false;
    }
  }

  async function addTraveler(data: TravelerFormData): Promise<Traveler> {
    loading.value = true;
    error.value = null;
    try {
      const traveler = await repository.insert(data);
      travelers.value.push(traveler);
      return traveler;
    }
    catch (e) {
      error.value = e instanceof Error ? e.message : 'Error desconocido';
      // return the error up the call stack so the UI can react to it (e.g. show a toast)
      throw e;
    }
    finally {
      loading.value = false;
    }
  }

  async function updateTraveler(id: string, data: TravelerUpdateData): Promise<Traveler> {
    loading.value = true;
    error.value = null;
    try {
      const traveler = await repository.update(id, data);
      // vue detects the change in this specific position without re-evaluating the entire list, so it's more efficient than replacing the whole array
      const index = travelers.value.findIndex(t => t.id === id);
      if (index !== -1) {
        travelers.value[index] = traveler;
      }
      return traveler;
    }
    catch (e) {
      error.value = e instanceof Error ? e.message : 'Error desconocido';
      throw e;
    }
    finally {
      loading.value = false;
    }
  }

  async function deleteTraveler(id: string): Promise<void> {
    loading.value = true;
    error.value = null;
    try {
      // Si este viajero es representante, desvincular sus acompañantes antes de borrar
      const hasCompanions = travelers.value.some(t => t.representativeId === id);
      if (hasCompanions) {
        await repository.unlinkCompanions(id);
        // Actualizar en memoria
        travelers.value = travelers.value.map(t =>
          t.representativeId === id
            ? { ...t, representativeId: undefined, isRepresentative: false }
            : t,
        );
      }

      await repository.remove(id);
      travelers.value = travelers.value.filter(t => t.id !== id);
    }
    catch (e) {
      error.value = e instanceof Error ? e.message : 'Error desconocido';
    }
    finally {
      loading.value = false;
    }
  }

  async function changeTravelerSeat(params: {
    travelerId: string;
    travelBusId: string;
    targetSeat: number;
  }): Promise<TravelerSeatChangeResult> {
    loading.value = true;
    error.value = null;

    try {
      const data = await repository.changeSeat(params);

      if (!isTravelerSeatChangeResult(data)) {
        throw new TravelerSeatChangeError('unknown-error', 'La respuesta del servidor para cambiar asiento es inválida.');
      }

      for (const travelerSeat of data.travelers) {
        const travelerIndex = travelers.value.findIndex(t => t.id === travelerSeat.id);
        if (travelerIndex !== -1) {
          const currentTraveler = travelers.value[travelerIndex];
          if (!currentTraveler) {
            continue;
          }

          travelers.value[travelerIndex] = {
            ...currentTraveler,
            seat: travelerSeat.seat,
          };
        }
      }

      return data;
    }
    catch (e) {
      const seatChangeError = e instanceof TravelerSeatChangeError
        ? e
        : toTravelerSeatChangeError(e);
      error.value = seatChangeError.message;
      throw seatChangeError;
    }
    finally {
      loading.value = false;
    }
  }

  async function assignTravelerToRoom(travelerId: string, travelAccommodationId: string): Promise<void> {
    loading.value = true;
    error.value = null;
    try {
      const traveler = await repository.assignRoom(travelerId, travelAccommodationId);
      const index = travelers.value.findIndex(t => t.id === travelerId);
      if (index !== -1) {
        travelers.value[index] = traveler;
      }
    }
    catch (e) {
      error.value = e instanceof Error ? e.message : 'Error desconocido';
      throw e;
    }
    finally {
      loading.value = false;
    }
  }

  async function removeTravelerFromRoom(travelerId: string): Promise<void> {
    loading.value = true;
    error.value = null;
    try {
      const traveler = await repository.removeFromRoom(travelerId);
      const index = travelers.value.findIndex(t => t.id === travelerId);
      if (index !== -1) {
        travelers.value[index] = traveler;
      }
    }
    catch (e) {
      error.value = e instanceof Error ? e.message : 'Error desconocido';
      throw e;
    }
    finally {
      loading.value = false;
    }
  }

  function setFilters(newFilters: TravelerFilters): void {
    filters.value = { ...newFilters };
  }
  function clearFilters(): void {
    filters.value = {};
  }

  // Retornar todo el API público del store
  return {
    // State
    travelers,
    loading,
    error,
    filters,
    // Getters
    allTravelers,
    getTravelerById,
    getTravelersByTravel,
    getTravelersByBus,
    getTravelersByAccommodation,
    getGroupMembers,
    filteredTravelers,
    filteredGroupedTravelers,
    // Actions
    fetchAll,
    fetchByTravel,
    addTraveler,
    updateTraveler,
    deleteTraveler,
    changeTravelerSeat,
    assignTravelerToRoom,
    removeTravelerFromRoom,
    setFilters,
    clearFilters,
  };
});

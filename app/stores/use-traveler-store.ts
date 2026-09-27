import type { TravelAccommodation } from '~/types/travel';
import type { Traveler, TravelerFilters, TravelerFormData, TravelerRoomAssignment, TravelerSeatChangeResult, TravelerUpdateData, TravelerWithChildren } from '~/types/traveler';

import { filterTravelers, groupTravelersByRepresentative, isTravelerSeatChangeResult, toRoomAssignmentErrorMessage, toTravelerSeatChangeError } from '~/composables/travelers/use-traveler-domain';
import { useTravelerRepository } from '~/composables/travelers/use-traveler-repository';
import { TravelerSeatChangeError } from '~/types/traveler';

/**
 * Global cache and orchestrator for traveler data.
 * Delegates all Supabase I/O to `useTravelerRepository` and domain logic to `use-traveler-domain`.
 * Owns the reactive `travelers` array — no other layer mutates it.
 * @returns Store state, getters and actions
 */
export const useTravelerStore = defineStore('useTravelerStore', () => {
  const repository = useTravelerRepository();

  // State
  const travelers = ref<Traveler[]>([]);
  // One row per traveler and hotel (a traveler holds at most one room per hotel).
  const roomAssignments = ref<TravelerRoomAssignment[]>([]);
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
      const travelerIds = new Set(
        roomAssignments.value
          .filter(a => a.travelAccommodationId === travelAccommodationId)
          .map(a => a.travelerId),
      );
      return travelers.value.filter(t => travelerIds.has(t.id));
    };
  });

  const getRoomAssignmentsByTraveler = computed(() => {
    return (travelerId: string): TravelerRoomAssignment[] => {
      return roomAssignments.value.filter(a => a.travelerId === travelerId);
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
      const [fetchedTravelers, fetchedAssignments] = await Promise.all([
        repository.fetchAll(),
        repository.fetchRoomAssignments(),
      ]);
      travelers.value = fetchedTravelers;
      roomAssignments.value = fetchedAssignments;
    }
    catch (e) {
      error.value = e instanceof Error ? e.message : 'Error desconocido';
    }
    finally {
      loading.value = false;
    }
  }

  /**
   * Fetches travelers for a specific travel and merges them into the global cache.
   * Only replaces entries matching `travelId` — preserves travelers from other travels.
   * @param travelId - UUID of the travel to load travelers for
   */
  async function fetchByTravel(travelId: string): Promise<void> {
    loading.value = true;
    error.value = null;
    try {
      const [fetched, fetchedAssignments] = await Promise.all([
        repository.fetchByTravel(travelId),
        repository.fetchRoomAssignmentsByTravel(travelId),
      ]);
      // el store es un cache global — puede tener viajeros de múltiples viajes ya cargados. Si
      // haces travelers.value = fetched pierdes los viajeros de otros viajes. El merge dice:
      // "reemplaza solo los del travelId X, conserva todos los demás".
      travelers.value = [
        ...travelers.value.filter(t => t.travelId !== travelId),
        ...fetched,
      ];
      roomAssignments.value = [
        ...roomAssignments.value.filter(a => a.travelId !== travelId),
        ...fetchedAssignments,
      ];
    }
    catch (e) {
      error.value = e instanceof Error ? e.message : 'Error desconocido';
    }
    finally {
      loading.value = false;
    }
  }

  /**
   * Creates a new traveler and appends it to the cache.
   * @param data - Form data for the new traveler
   * @returns The created traveler
   * @throws Re-throws repository errors so the caller can react (e.g. close modal, show toast)
   */
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

  /**
   * Updates a traveler and patches the cache entry by index for minimal re-renders.
   * @param id - UUID of the traveler to update
   * @param data - Partial update data
   * @returns The updated traveler
   * @throws Re-throws repository errors so the caller can react
   */
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

  /**
   * Unlinks all companions before deleting the traveler.
   * Required because the DB does not cascade `representative_id` on traveler delete.
   * @param id - UUID of the traveler to delete
   */
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
      // The DB cascades the traveler's room assignments.
      roomAssignments.value = roomAssignments.value.filter(a => a.travelerId !== id);
    }
    catch (e) {
      error.value = e instanceof Error ? e.message : 'Error desconocido';
    }
    finally {
      loading.value = false;
    }
  }

  /**
   * Moves or swaps a traveler's seat via RPC.
   * The RPC may update two travelers (swap), so all returned seats are patched in the cache.
   * @param params - Seat change parameters
   * @param params.travelerId - UUID of the traveler to move
   * @param params.travelBusId - UUID of the travel bus context
   * @param params.targetSeat - Destination seat number
   * @returns The RPC result with operation type and updated seat data
   * @throws {TravelerSeatChangeError} with a typed code and user-facing message
   */
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

  /**
   * Assigns a traveler to a room and adds the assignment to the cache.
   * @param travelerId - UUID of the traveler to assign
   * @param accommodation - The room to assign the traveler to
   * @throws Re-throws repository errors so the caller can react; `error` holds a user-facing message
   */
  async function assignTravelerToRoom(
    travelerId: string,
    accommodation: Pick<TravelAccommodation, 'id' | 'travelId' | 'providerId'>,
  ): Promise<void> {
    loading.value = true;
    error.value = null;
    try {
      const assignment = await repository.assignRoom(travelerId, accommodation);
      roomAssignments.value.push(assignment);
    }
    catch (e) {
      error.value = toRoomAssignmentErrorMessage(e);
      throw e;
    }
    finally {
      loading.value = false;
    }
  }

  /**
   * Removes a traveler from their room in one hotel and updates the cache.
   * @param travelerId - UUID of the traveler to unassign
   * @param providerId - UUID of the hotel whose room is released
   * @throws Re-throws repository errors so the caller can react
   */
  async function removeTravelerFromRoom(travelerId: string, providerId: string): Promise<void> {
    loading.value = true;
    error.value = null;
    try {
      await repository.removeFromRoom(travelerId, providerId);
      roomAssignments.value = roomAssignments.value.filter(
        a => !(a.travelerId === travelerId && a.providerId === providerId),
      );
    }
    catch (e) {
      error.value = e instanceof Error ? e.message : 'Error desconocido';
      throw e;
    }
    finally {
      loading.value = false;
    }
  }

  /**
   * Replaces all active filters.
   * @param newFilters - New filter state to apply
   */
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
    roomAssignments,
    loading,
    error,
    filters,
    // Getters
    allTravelers,
    getTravelerById,
    getTravelersByTravel,
    getTravelersByBus,
    getTravelersByAccommodation,
    getRoomAssignmentsByTraveler,
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

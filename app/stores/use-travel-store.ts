import type { Tables } from '~/types/database.types';
import type { Travel, TravelAccommodation, TravelBus, TravelFormData, TravelStatus, TravelUpdateData } from '~/types/travel';

import { toTravelSaveErrorMessage } from '~/composables/travels/use-travel-domain';
import { useTravelMediaRepository } from '~/composables/travels/use-travel-media-repository';
import { useTravelRepository } from '~/composables/travels/use-travel-repository';
import { travelKeys } from '~/queries/travels';

type TravelStats = {
  total: number;
  pending: number;
  published: number;
  inProgress: number;
  completed: number;
  cancelled: number;
};

export const useTravelsStore = defineStore('useTravelsStore', () => {
  const queryCache = useQueryCache();

  const repository = useTravelRepository();
  const mediaRepository = useTravelMediaRepository();

  // State
  const travels = ref<Travel[]>([]);
  const loading = ref(false);
  const error = ref<string | null>(null);
  // True once the first fetchAll() succeeds; until then an empty list means "not loaded yet", not "no travels".
  const loaded = ref(false);

  // Getters (computed)
  const allTravels = computed((): Travel[] => {
    return [...travels.value].sort((a, b) =>
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
  });

  const getTravelById = computed(() => {
    return (id: string): Travel | undefined => {
      return travels.value.find(travel => travel.id === id);
    };
  });

  const getTravelsByStatus = computed(() => {
    return (status: TravelStatus): Travel[] => {
      return travels.value.filter(travel => travel.status === status);
    };
  });

  const getAccommodationsByTravel = computed(() => {
    return (travelId: string): TravelAccommodation[] => {
      return travels.value.find(t => t.id === travelId)?.accommodations ?? [];
    };
  });

  const stats = computed((): TravelStats => {
    return {
      total: travels.value.length,
      pending: travels.value.filter(t => t.status === 'pending').length,
      published: travels.value.filter(t => t.status === 'published').length,
      inProgress: travels.value.filter(t => t.status === 'in_progress').length,
      completed: travels.value.filter(t => t.status === 'completed').length,
      cancelled: travels.value.filter(t => t.status === 'cancelled').length,
    };
  });

  // Actions
  async function fetchAll(): Promise<void> {
    loading.value = true;
    error.value = null;
    try {
      travels.value = await repository.fetchAll();
      loaded.value = true;
    }
    catch (e) {
      error.value = e instanceof Error ? e.message : 'Error al cargar viajes';
    }
    finally {
      loading.value = false;
    }
  }

  async function addTravel(data: TravelFormData): Promise<Travel> {
    loading.value = true;
    error.value = null;
    try {
      const travel = await repository.insertTravel(data);
      const internals = await repository.upsertTravelInternals(travel.id, data);
      const extras = {
        coordinatorIds: data.coordinatorIds,
        itinerary: data.itinerary,
        services: data.services,
        buses: data.buses,
        accommodations: [],
        internals,
      };

      if (data.itinerary.length > 0)
        extras.itinerary = await repository.insertActivities(travel.id, data.itinerary);
      if (data.services.length > 0)
        extras.services = await repository.insertServices(travel.id, data.services);
      if (data.buses.length > 0)
        extras.buses = await repository.insertBuses(travel.id, data.buses);
      if (data.coordinatorIds.length > 0)
        await repository.insertCoordinators(travel.id, data.coordinatorIds);

      const newTravel = mapTravelRowToDomain(travel, extras);

      travels.value.push(newTravel);
      error.value = null;
      return newTravel;
    }
    catch (e) {
      error.value = toTravelSaveErrorMessage(e, 'Error al agregar viaje');
      throw e;
    }
    finally {
      loading.value = false;
    }
  }

  async function updateTravel(id: string, data: Partial<TravelUpdateData>): Promise<boolean> {
    const index = travels.value.findIndex(t => t.id === id);
    if (index === -1) {
      error.value = 'Viaje no encontrado';
      return false;
    }
    const existingTravel = travels.value[index];
    if (!existingTravel) {
      error.value = 'Viaje no encontrado';
      return false;
    }

    loading.value = true;
    error.value = null;
    try {
      let travelRow: Tables<'travels'> | null = null;
      const travelRootKeys: (keyof TravelUpdateData)[] = [
        'label',
        'destination',
        'startDate',
        'endDate',
        'description',
        'imageUrl',
        'status',
        'departureFrom',
        'summary',
        'highlights',
        'featured',
      ];
      const travelInternalKeys: (keyof TravelUpdateData)[] = [
        'internalNotes',
        'totalOperationCost',
        'projectedProfit',
      ];
      const haveTravelFields = travelRootKeys.some(key => key in data);
      const haveInternalFields = travelInternalKeys.some(key => key in data);

      if (haveTravelFields) {
        travelRow = await repository.updateTravel(id, data);
      }

      let internals: Tables<'travel_internals'> | null = null;
      if (haveInternalFields)
        internals = await repository.upsertTravelInternals(id, data);

      let itinerary = travels.value[index]?.itinerary ?? [];
      let services = travels.value[index]?.services ?? [];
      let buses = travels.value[index]?.buses ?? [];
      let accommodations = travels.value[index]?.accommodations ?? [];
      let coordinatorIds = travels.value[index]?.coordinatorIds ?? [];

      if (data.itinerary !== undefined)
        itinerary = await repository.replaceActivities(id, data.itinerary);
      if (data.services !== undefined)
        services = await repository.replaceServices(id, data.services);
      if (data.buses !== undefined)
        buses = await repository.replaceBuses(id, data.buses);
      if (data.accommodations !== undefined)
        accommodations = await repository.replaceAccommodations(id, data.accommodations);
      if (data.coordinatorIds !== undefined) {
        await repository.replaceCoordinators(id, data.coordinatorIds);
        coordinatorIds = data.coordinatorIds;
      }

      travels.value[index] = travelRow
        ? mapTravelRowToDomain(travelRow, {
            coordinatorIds,
            itinerary,
            services,
            buses,
            accommodations,
            internals: internals ?? {
              internal_notes: existingTravel.internalNotes ?? null,
              total_operation_cost: existingTravel.totalOperationCost ?? null,
              projected_profit: existingTravel.projectedProfit ?? null,
            },
          })
        : {
            ...existingTravel,
            coordinatorIds,
            itinerary,
            services,
            buses,
            accommodations,
            ...(internals && {
              internalNotes: internals.internal_notes ?? undefined,
              totalOperationCost: internals.total_operation_cost ?? undefined,
              projectedProfit: internals.projected_profit ?? undefined,
            }),
          };

      queryCache.invalidateQueries({ key: travelKeys.detail(id), exact: true });
      return true;
    }
    catch (e) {
      error.value = toTravelSaveErrorMessage(e, 'Error al actualizar viaje');
      return false;
    }
    finally {
      loading.value = false;
    }
  }

  async function deleteTravel(id: string): Promise<boolean> {
    loading.value = true;
    error.value = null;
    try {
      // Checked up front: coordinators can delete gallery files, so without it a
      // coordinator would wipe the files and then fail to delete the row.
      if (!await repository.isOwnedByCurrentUser(id)) {
        error.value = 'Solo el dueño del viaje puede eliminarlo';
        return false;
      }

      // Files go first: once the row is gone, the bucket's RLS no longer lets us remove them.
      await mediaRepository.removeAllForTravel(id);
      await repository.removeTravel(id);
      for (const entry of queryCache.getEntries({ key: travelKeys.detail(id), exact: true })) {
        queryCache.remove(entry);
      }
    }
    catch (e) {
      error.value = e instanceof Error ? e.message : 'Error al eliminar viaje';
      return false;
    }
    finally {
      loading.value = false;
    }

    travels.value = travels.value.filter(t => t.id !== id);
    error.value = null;
    return true;
  }

  async function updateTravelStatus(id: string, status: TravelStatus): Promise<boolean> {
    return updateTravel(id, { status });
  }

  async function updateTravelBus(travelId: string, busId: string, data: Partial<Omit<TravelBus, 'id'>>): Promise<boolean> {
    const travelIndex = travels.value.findIndex(t => t.id === travelId);
    if (travelIndex === -1) {
      error.value = 'Viaje no encontrado';
      return false;
    }

    const existingTravel = travels.value[travelIndex];
    if (!existingTravel) {
      error.value = 'Viaje no encontrado';
      return false;
    }

    const busIndex = (existingTravel.buses ?? []).findIndex(b => b.id === busId);
    if (busIndex === -1) {
      error.value = 'Autobús no encontrado en el viaje';
      return false;
    }

    loading.value = true;
    error.value = null;
    try {
      const updatedBus = await repository.updateTravelBus(busId, data);
      const currentBuses = existingTravel.buses ?? [];
      const updatedBuses = [
        ...currentBuses.slice(0, busIndex),
        updatedBus,
        ...currentBuses.slice(busIndex + 1),
      ];

      travels.value[travelIndex] = {
        ...existingTravel,
        buses: updatedBuses,
      };

      queryCache.invalidateQueries({ key: travelKeys.detail(travelId), exact: true });
      return true;
    }
    catch (e) {
      error.value = e instanceof Error ? e.message : 'Error al actualizar autobús del viaje';
      return false;
    }
    finally {
      loading.value = false;
    }
  }

  async function removeBusFromTravel(travelId: string, busId: string): Promise<boolean> {
    const travelIndex = travels.value.findIndex(t => t.id === travelId);
    if (travelIndex === -1) {
      error.value = 'Viaje no encontrado';
      return false;
    }

    const existingTravel = travels.value[travelIndex];
    if (!existingTravel) {
      error.value = 'Viaje no encontrado';
      return false;
    }

    const busExists = (existingTravel.buses ?? []).some(b => b.id === busId);
    if (!busExists) {
      error.value = 'Autobús no encontrado en el viaje';
      return false;
    }

    loading.value = true;
    error.value = null;
    try {
      await repository.removeTravelBus(busId);
      travels.value[travelIndex] = {
        ...existingTravel,
        buses: (existingTravel.buses ?? []).filter(b => b.id !== busId),
      };

      queryCache.invalidateQueries({ key: travelKeys.detail(travelId), exact: true });
      return true;
    }
    catch (e) {
      error.value = e instanceof Error ? e.message : 'Error al eliminar autobús del viaje';
      return false;
    }
    finally {
      loading.value = false;
    }
  }

  async function updateTravelAccommodation(
    travelId: string,
    accommodationId: string,
    data: { roomNumber?: string | null; floor?: number | null },
  ): Promise<boolean> {
    const travelIndex = travels.value.findIndex(t => t.id === travelId);
    if (travelIndex === -1) {
      error.value = 'Viaje no encontrado';
      return false;
    }

    const existingTravel = travels.value[travelIndex];
    if (!existingTravel) {
      error.value = 'Viaje no encontrado';
      return false;
    }

    const accIndex = (existingTravel.accommodations ?? []).findIndex(a => a.id === accommodationId);
    if (accIndex === -1) {
      error.value = 'Habitación no encontrada en el viaje';
      return false;
    }

    loading.value = true;
    error.value = null;
    try {
      const updatedAcc = await repository.updateTravelAccommodation(accommodationId, data);
      const currentAccommodations = existingTravel.accommodations ?? [];
      const updatedAccommodations = [
        ...currentAccommodations.slice(0, accIndex),
        updatedAcc,
        ...currentAccommodations.slice(accIndex + 1),
      ];

      travels.value[travelIndex] = {
        ...existingTravel,
        accommodations: updatedAccommodations,
      };

      queryCache.invalidateQueries({ key: travelKeys.detail(travelId), exact: true });
      return true;
    }
    catch (e) {
      error.value = e instanceof Error ? e.message : 'Error al actualizar alojamiento del viaje';
      return false;
    }
    finally {
      loading.value = false;
    }
  }

  /**
   * Adds rooms of one quoted hotel room type to a travel. The room count lives on the
   * travel and changes until the trip leaves; the hotel's cost follows it in the database.
   * @param travelId - The travel
   * @param room - Hotel, room type and capacity of the rooms to add
   * @param count - How many rooms to add
   * @returns Whether the rooms were added
   */
  async function addTravelRooms(
    travelId: string,
    room: Pick<TravelAccommodation, 'providerId' | 'hotelRoomTypeId' | 'maxOccupancy'>,
    count = 1,
  ): Promise<boolean> {
    loading.value = true;
    error.value = null;
    try {
      const added = await repository.insertAccommodations(travelId, Array.from({ length: count }, () => ({ ...room })));
      updateLocalAccommodations(travelId, new Set(), added);
      return true;
    }
    catch (e) {
      error.value = e instanceof Error ? e.message : 'Error al agregar habitaciones';
      return false;
    }
    finally {
      loading.value = false;
    }
  }

  /**
   * Deletes an empty room from a travel. Refused (returns false with `error` set) while
   * someone is assigned to it.
   * @param travelId - The travel
   * @param roomId - The `travel_accommodations` row to delete
   * @returns Whether the room was deleted
   */
  async function deleteTravelRoom(travelId: string, roomId: string): Promise<boolean> {
    loading.value = true;
    error.value = null;
    try {
      await repository.deleteEmptyAccommodation(roomId);
      updateLocalAccommodations(travelId, new Set([roomId]), []);
      return true;
    }
    catch (e) {
      error.value = e instanceof Error ? e.message : 'Error al eliminar la habitación';
      return false;
    }
    finally {
      loading.value = false;
    }
  }

  /**
   * Syncs a travel's accommodations after a write to `travel_accommodations` (the room
   * actions above, or the quotation store through its own repository). The DB already
   * changed, so the travel detail query is invalidated here too.
   * @param travelId - UUID of the travel
   * @param deletedIds - Accommodation ids deleted from the DB
   * @param added - Accommodations inserted in the DB
   */
  function updateLocalAccommodations(
    travelId: string,
    deletedIds: Set<string>,
    added: TravelAccommodation[],
  ): void {
    queryCache.invalidateQueries({ key: travelKeys.detail(travelId), exact: true });
    const index = travels.value.findIndex(t => t.id === travelId);
    if (index === -1)
      return;
    const existing = travels.value[index]?.accommodations ?? [];
    const kept = existing.filter(a => !deletedIds.has(a.id));
    travels.value[index] = {
      ...travels.value[index]!,
      accommodations: [...kept, ...added],
    };
  }

  return {
    // State
    travels,
    loading,
    error,
    loaded,
    // Getters
    allTravels,
    getTravelById,
    getTravelsByStatus,
    getAccommodationsByTravel,
    stats,
    // Actions
    fetchAll,
    addTravel,
    updateTravel,
    deleteTravel,
    updateTravelStatus,
    updateTravelBus,
    removeBusFromTravel,
    updateTravelAccommodation,
    addTravelRooms,
    deleteTravelRoom,
    updateLocalAccommodations,
  };
});

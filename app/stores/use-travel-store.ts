import type { Travel, TravelAccommodation, TravelBus, TravelFormData, TravelStatus, TravelUpdateData } from '~/types/travel';

import { toTravelSaveErrorMessage } from '~/composables/travels/use-travel-domain';
import { useTravelMediaRepository } from '~/composables/travels/use-travel-media-repository';
import { useTravelRepository } from '~/composables/travels/use-travel-repository';
import { travelerKeys } from '~/queries/travelers';
import { travelKeys } from '~/queries/travels';

export const useTravelsStore = defineStore('useTravelsStore', () => {
  const queryCache = useQueryCache();

  const repository = useTravelRepository();
  const mediaRepository = useTravelMediaRepository();

  // State
  const loading = ref(false);
  const error = ref<string | null>(null);

  // Actions
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
      if (data.coordinatorIds.length > 0) {
        await repository.insertCoordinators(travel.id, data.coordinatorIds);
        queryCache.invalidateQueries({ key: travelerKeys.root });
      }

      const newTravel = mapTravelRowToDomain(travel, extras);

      // The new travel shows up in every list page/filter and in the totals
      queryCache.invalidateQueries({ key: travelKeys.root });
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
    loading.value = true;
    error.value = null;
    try {
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

      if (haveTravelFields)
        await repository.updateTravel(id, data);
      if (haveInternalFields)
        await repository.upsertTravelInternals(id, data);
      if (data.itinerary !== undefined)
        await repository.replaceActivities(id, data.itinerary);
      if (data.services !== undefined)
        await repository.replaceServices(id, data.services);
      if (data.buses !== undefined)
        await repository.replaceBuses(id, data.buses);
      if (data.accommodations !== undefined)
        await repository.replaceAccommodations(id, data.accommodations);
      if (data.coordinatorIds !== undefined) {
        await repository.replaceCoordinators(id, data.coordinatorIds);
        queryCache.invalidateQueries({ key: travelerKeys.root });
      }

      // Not just the detail: status and label also show in lists, totals and payment labels
      queryCache.invalidateQueries({ key: travelKeys.root });
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
      // After removing the detail (so it isn't refetched): every list page/filter and the totals
      queryCache.invalidateQueries({ key: travelKeys.root });
    }
    catch (e) {
      error.value = e instanceof Error ? e.message : 'Error al eliminar viaje';
      return false;
    }
    finally {
      loading.value = false;
    }

    error.value = null;
    return true;
  }

  async function updateTravelStatus(id: string, status: TravelStatus): Promise<boolean> {
    return updateTravel(id, { status });
  }

  async function updateTravelBus(travelId: string, busId: string, data: Partial<Omit<TravelBus, 'id'>>): Promise<boolean> {
    loading.value = true;
    error.value = null;
    try {
      await repository.updateTravelBus(busId, data);
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

  async function updateTravelAccommodation(
    travelId: string,
    accommodationId: string,
    data: { roomNumber?: string | null; floor?: number | null },
  ): Promise<boolean> {
    loading.value = true;
    error.value = null;
    try {
      await repository.updateTravelAccommodation(accommodationId, data);
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
      await repository.insertAccommodations(travelId, Array.from({ length: count }, () => ({ ...room })));
      updateLocalAccommodations(travelId);
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
      updateLocalAccommodations(travelId);
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
   * Refreshes a travel's detail after a write to `travel_accommodations` (the room
   * actions above, or the quotation store through its own repository).
   * @param travelId - UUID of the travel
   */
  function updateLocalAccommodations(travelId: string): void {
    queryCache.invalidateQueries({ key: travelKeys.detail(travelId), exact: true });
  }

  return {
    // State
    loading,
    error,
    // Actions
    addTravel,
    updateTravel,
    deleteTravel,
    updateTravelStatus,
    updateTravelBus,
    updateTravelAccommodation,
    addTravelRooms,
    deleteTravelRoom,
    updateLocalAccommodations,
  };
});

import type { Travel, TravelAccommodation, TravelBus, TravelFormData, TravelStatus, TravelUpdateData } from '~/types/travel';

import { toTravelSaveErrorMessage } from '~/composables/travels/use-travel-domain';
import { useTravelMediaRepository } from '~/composables/travels/use-travel-media-repository';
import { useTravelRepository } from '~/composables/travels/use-travel-repository';
import { quotationKeys } from '~/queries/quotations';
import { travelerKeys } from '~/queries/travelers';
import { travelKeys } from '~/queries/travels';
import { toErrorMessage } from '~/utils/error-message';

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
      // With the translated message, so callers show it as is.
      throw new Error(error.value, { cause: e });
    }
    finally {
      loading.value = false;
    }
  }

  async function updateTravel(id: string, data: Partial<TravelUpdateData>): Promise<void> {
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
    }
    catch (e) {
      error.value = toTravelSaveErrorMessage(e, 'Error al actualizar viaje');
      throw new Error(error.value, { cause: e });
    }
    finally {
      loading.value = false;
    }
  }

  async function deleteTravel(id: string): Promise<void> {
    loading.value = true;
    error.value = null;
    try {
      // Checked up front: coordinators can delete gallery files, so without it a
      // coordinator would wipe the files and then fail to delete the row.
      if (!await repository.isOwnedByCurrentUser(id))
        throw new Error('Solo el dueño del viaje puede eliminarlo');

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
      error.value = toErrorMessage(e, 'Error al eliminar viaje');
      throw e;
    }
    finally {
      loading.value = false;
    }
  }

  async function updateTravelStatus(id: string, status: TravelStatus): Promise<void> {
    await updateTravel(id, { status });
  }

  async function updateTravelBus(travelId: string, busId: string, data: Partial<Omit<TravelBus, 'id'>>): Promise<void> {
    loading.value = true;
    error.value = null;
    try {
      await repository.updateTravelBus(busId, data);
      queryCache.invalidateQueries({ key: travelKeys.detail(travelId), exact: true });
    }
    catch (e) {
      error.value = toErrorMessage(e, 'Error al actualizar autobús del viaje');
      throw e;
    }
    finally {
      loading.value = false;
    }
  }

  async function updateTravelAccommodation(
    travelId: string,
    accommodationId: string,
    data: { roomNumber?: string | null; floor?: number | null },
  ): Promise<void> {
    loading.value = true;
    error.value = null;
    try {
      await repository.updateTravelAccommodation(accommodationId, data);
      queryCache.invalidateQueries({ key: travelKeys.detail(travelId), exact: true });
    }
    catch (e) {
      error.value = toErrorMessage(e, 'Error al actualizar alojamiento del viaje');
      throw e;
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
   * @throws Re-throws repository errors
   */
  async function addTravelRooms(
    travelId: string,
    room: Pick<TravelAccommodation, 'providerId' | 'hotelRoomTypeId' | 'maxOccupancy'>,
    count = 1,
  ): Promise<void> {
    loading.value = true;
    error.value = null;
    try {
      await repository.insertAccommodations(travelId, Array.from({ length: count }, () => ({ ...room })));
      updateLocalAccommodations(travelId);
    }
    catch (e) {
      error.value = toErrorMessage(e, 'Error al agregar habitaciones');
      throw e;
    }
    finally {
      loading.value = false;
    }
  }

  /**
   * Deletes an empty room from a travel. Refused (throws) while someone is assigned to it.
   * @param travelId - The travel
   * @param roomId - The `travel_accommodations` row to delete
   * @throws Re-throws repository errors
   */
  async function deleteTravelRoom(travelId: string, roomId: string): Promise<void> {
    loading.value = true;
    error.value = null;
    try {
      await repository.deleteEmptyAccommodation(roomId);
      updateLocalAccommodations(travelId);
    }
    catch (e) {
      error.value = toErrorMessage(e, 'Error al eliminar la habitación');
      throw e;
    }
    finally {
      loading.value = false;
    }
  }

  /**
   * Refreshes a travel's detail after a write to `travel_accommodations` by the room
   * actions above, and its quotation: the database recomputes each hotel's cost from the rooms.
   * @param travelId - UUID of the travel
   */
  function updateLocalAccommodations(travelId: string): void {
    queryCache.invalidateQueries({ key: travelKeys.detail(travelId), exact: true });
    queryCache.invalidateQueries({ key: quotationKeys.byTravel(travelId) });
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
  };
});

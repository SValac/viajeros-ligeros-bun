import { defineStore } from 'pinia';

import type { HotelRoomType, HotelRoomTypeFormData } from '~/types/hotel-room';

import { validateTotalRoomsUpdate } from '~/composables/hotel-rooms/use-hotel-room-domain';
import { useHotelRoomRepository } from '~/composables/hotel-rooms/use-hotel-room-repository';
import { hotelRoomsCatalogQuery, useCatalogState, useHotelRoomsCatalog } from '~/queries/catalogs';
import { toErrorMessage } from '~/utils/error-message';
import { calculateCostPerPerson, calculateTotalRoomsUsed } from '~/utils/hotel-room-helpers';

/**
 * Hotel Room Store
 * Room data (total rooms + room types) of accommodation providers, and its writes.
 * `hotelRoomsData` reads its catalog query (`useHotelRoomsCatalog`, through `useCatalogState`);
 * writes go through `useHotelRoomRepository` and then refetch it. Writes whose checks read the
 * catalog wait for it first (`ensureFresh`).
 */
export const useHotelRoomStore = defineStore('hotel-room', () => {
  const repository = useHotelRoomRepository();
  const catalog = useCatalogState(useHotelRoomsCatalog, hotelRoomsCatalogQuery);

  // State (writes only; the catalog's load state comes from `catalog`)
  const loading = shallowRef(false);
  const error = shallowRef<string | null>(null);

  // Getters
  const hotelRoomsData = catalog.items;

  /**
   * Retrieves room data for a specific provider by ID
   * @param {string} id - The provider ID
   * @returns {HotelRoomData | undefined} The room data or undefined if not found
   */
  const getRoomDataByProviderId = computed(() => (id: string) => {
    return hotelRoomsData.value.find(hrd => hrd.providerId === id);
  });

  /**
   * Checks if room data exists for a provider
   * @param {string} providerId - The provider ID
   * @returns {boolean} True if room data exists, false otherwise
   */
  const hasRoomData = computed(() => (providerId: string) => {
    return hotelRoomsData.value.some(hrd => hrd.providerId === providerId);
  });

  /**
   * Gets the total number of rooms configured for a provider
   * @param {string} providerId - The provider ID
   * @returns {number} The total number of rooms, or 0 if no data exists
   */
  const getTotalRoomsByProvider = computed(() => (providerId: string) => {
    const roomData = hotelRoomsData.value.find(hrd => hrd.providerId === providerId);
    return roomData?.totalRooms ?? 0;
  });

  /**
   * Calculates the total number of rooms currently used for a provider across all room types
   * @param {string} providerId - The provider ID
   * @returns {number} The total number of rooms used
   */
  const getUsedRoomsByProvider = computed(() => (providerId: string) => {
    const roomData = hotelRoomsData.value.find(hrd => hrd.providerId === providerId);
    if (!roomData)
      return 0;
    return calculateTotalRoomsUsed(roomData.roomTypes);
  });

  // Actions
  /**
   * Initializes room data for a new provider
   * Only initializes if data doesn't already exist for the provider: `hotel_rooms` has no
   * unique constraint on the provider, so the check reads the catalog as the server has it.
   * @param {string} providerId - The provider ID
   * @param {number} totalRooms - The initial total number of rooms
   * @throws If the catalog can't be loaded or the insert fails (nothing is inserted blindly)
   */
  async function initRoomData(providerId: string, totalRooms: number): Promise<void> {
    loading.value = true;
    error.value = null;
    try {
      const roomsData = await catalog.ensureFresh();
      if (roomsData.some(hrd => hrd.providerId === providerId))
        return;
      const roomData = await repository.insertRoomData(providerId, totalRooms);
      // In the catalog right away, so a failed refetch can't make the next check insert again.
      catalog.setItems(items => [...items, roomData]);
      await catalog.refresh();
    }
    catch (e) {
      error.value = toErrorMessage(e, 'Error al inicializar datos de habitaciones');
      throw e;
    }
    finally {
      loading.value = false;
    }
  }

  /**
   * Updates the total number of rooms for a provider
   * Validates that the new total is not less than currently used rooms
   * @param {string} providerId - The provider ID
   * @param {number} total - The new total number of rooms
   * @throws {Error} With the validation message, or re-throws repository errors
   */
  async function updateTotalRooms(providerId: string, total: number): Promise<void> {
    loading.value = true;
    error.value = null;
    try {
      const roomData = (await catalog.ensureFresh()).find(hrd => hrd.providerId === providerId);
      const validationError = validateTotalRoomsUpdate(total, calculateTotalRoomsUsed(roomData?.roomTypes ?? []));
      if (validationError)
        throw new Error(validationError);

      if (!roomData)
        throw new Error('Proveedor no encontrado');

      await repository.updateRoomTotal(roomData.id, total);
      await catalog.refresh();
    }
    catch (e) {
      error.value = toErrorMessage(e, 'Error al actualizar el total de habitaciones');
      throw e;
    }
    finally {
      loading.value = false;
    }
  }

  /**
   * Adds a new room type to a provider's room configuration
   * Calculates cost per person based on occupancy and price
   * @param {string} providerId - The provider ID
   * @param {HotelRoomTypeFormData} data - The room type data
   * @returns {Promise<HotelRoomType>} The created room type
   * @throws {Error} If provider room data is not found
   */
  async function addRoomType(providerId: string, data: HotelRoomTypeFormData): Promise<HotelRoomType> {
    loading.value = true;
    error.value = null;
    try {
      const roomData = (await catalog.ensureFresh()).find(hrd => hrd.providerId === providerId);
      if (!roomData)
        throw new Error(`No room data found for provider ${providerId}`);

      const costPerPerson = calculateCostPerPerson(data.pricePerNight, data.maxOccupancy);
      const roomType = await repository.insertRoomType(roomData.id, data, costPerPerson);
      await catalog.refresh();
      return roomType;
    }
    catch (e) {
      error.value = toErrorMessage(e, 'Error al agregar tipo de habitación');
      throw e;
    }
    finally {
      loading.value = false;
    }
  }

  /**
   * Updates an existing room type
   * Recalculates cost per person based on the updated data
   * @param {string} roomTypeId - The room type ID to update
   * @param {HotelRoomTypeFormData} data - The updated room type data
   * @throws Re-throws repository errors
   */
  async function updateRoomType(roomTypeId: string, data: HotelRoomTypeFormData): Promise<void> {
    loading.value = true;
    error.value = null;
    try {
      const costPerPerson = calculateCostPerPerson(data.pricePerNight, data.maxOccupancy);
      await repository.updateRoomType(roomTypeId, data, costPerPerson);
      await catalog.refresh();
    }
    catch (e) {
      error.value = toErrorMessage(e, 'Error al actualizar tipo de habitación');
      throw e;
    }
    finally {
      loading.value = false;
    }
  }

  /**
   * Deletes a room type from a provider's configuration
   * @param {string} roomTypeId - The room type ID to delete
   * @throws Re-throws repository errors
   */
  async function deleteRoomType(roomTypeId: string): Promise<void> {
    loading.value = true;
    error.value = null;
    try {
      await repository.removeRoomType(roomTypeId);
      await catalog.refresh();
    }
    catch (e) {
      error.value = toErrorMessage(e, 'Error al eliminar tipo de habitación');
      throw e;
    }
    finally {
      loading.value = false;
    }
  }

  return {
    // State
    loading,
    error,
    // Getters
    hotelRoomsData,
    isLoaded: catalog.isLoaded,
    loadError: catalog.loadError,
    getRoomDataByProviderId,
    hasRoomData,
    getTotalRoomsByProvider,
    getUsedRoomsByProvider,
    // Actions
    refetch: catalog.refetch,
    initRoomData,
    updateTotalRooms,
    addRoomType,
    updateRoomType,
    deleteRoomType,
  };
});

import { defineStore } from 'pinia';

import type { HotelRoomType, HotelRoomTypeFormData } from '~/types/hotel-room';

import { validateTotalRoomsUpdate } from '~/composables/hotel-rooms/use-hotel-room-domain';
import { useHotelRoomRepository } from '~/composables/hotel-rooms/use-hotel-room-repository';
import { catalogKeys, hotelRoomsCatalogQuery, useHotelRoomsCatalog } from '~/queries/catalogs';
import { calculateCostPerPerson, calculateTotalRoomsUsed } from '~/utils/hotel-room-helpers';

/**
 * Hotel Room Store
 * Room data (total rooms + room types) of accommodation providers, and its writes.
 * `hotelRoomsData` reads the catalog query (`useHotelRoomsCatalog`); writes go through `useHotelRoomRepository`
 * and then refetch it.
 */
export const useHotelRoomStore = defineStore('hotel-room', () => {
  const repository = useHotelRoomRepository();
  const queryCache = useQueryCache();
  // A defined query, not `useQuery`: inside a store, `useQuery` would bind to the component that
  // happened to create the store and go inactive when it unmounts. Here the query stays active
  // while the store lives, so writes refetch it from any screen.
  const query = useHotelRoomsCatalog();

  // State (writes only; the catalog's own load state comes from the query)
  const loading = shallowRef(false);
  const error = shallowRef<string | null>(null);

  // Getters
  const hotelRoomsData = computed(() => query.data.value ?? []);
  /** `false` until the first load resolves: no room data before that is not "no rooms". */
  const isLoaded = computed(() => query.data.value !== undefined);
  const loadError = computed(() => query.error.value);

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
  /** Retries the catalog load (e.g. from an error state's "Reintentar"). */
  function refetch() {
    return query.refetch();
  }

  /**
   * Refetches the catalog after a write, so the action resolves with fresh data.
   * A failed refetch keeps the previous data: the write itself succeeded.
   */
  async function refreshCatalog(): Promise<void> {
    await queryCache.invalidateQueries({ key: catalogKeys.hotelRooms }).catch(() => {});
  }

  /**
   * Waits for the catalog when it hasn't loaded yet. Writes whose checks read it (does the
   * provider have room data? how many rooms are used?) must not run against an empty list.
   * @throws If the catalog can't be loaded
   */
  async function ensureLoaded(): Promise<void> {
    if (!isLoaded.value)
      await queryCache.fetch(queryCache.ensure(hotelRoomsCatalogQuery));
  }

  /**
   * Initializes room data for a new provider
   * Only initializes if data doesn't already exist for the provider: `hotel_rooms` has no
   * unique constraint on the provider, so the check waits for the catalog to load.
   * @param {string} providerId - The provider ID
   * @param {number} totalRooms - The initial total number of rooms
   */
  async function initRoomData(providerId: string, totalRooms: number): Promise<void> {
    loading.value = true;
    error.value = null;
    try {
      await ensureLoaded();
      if (hasRoomData.value(providerId))
        return;
      await repository.insertRoomData(providerId, totalRooms);
      await refreshCatalog();
    }
    catch (e) {
      error.value = e instanceof Error ? e.message : 'Error al inicializar datos de habitaciones';
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
   * @returns {Promise<boolean>} True if update succeeded, false otherwise
   */
  async function updateTotalRooms(providerId: string, total: number): Promise<boolean> {
    loading.value = true;
    error.value = null;
    try {
      await ensureLoaded();
      const validationError = validateTotalRoomsUpdate(total, getUsedRoomsByProvider.value(providerId));
      if (validationError) {
        error.value = validationError;
        return false;
      }

      const roomData = getRoomDataByProviderId.value(providerId);
      if (!roomData) {
        error.value = 'Proveedor no encontrado';
        return false;
      }

      await repository.updateRoomTotal(roomData.id, total);
      await refreshCatalog();
      return true;
    }
    catch (e) {
      error.value = e instanceof Error ? e.message : 'Error al actualizar el total de habitaciones';
      return false;
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
      await ensureLoaded();
      const roomData = getRoomDataByProviderId.value(providerId);
      if (!roomData)
        throw new Error(`No room data found for provider ${providerId}`);

      const costPerPerson = calculateCostPerPerson(data.pricePerNight, data.maxOccupancy);
      const roomType = await repository.insertRoomType(roomData.id, data, costPerPerson);
      await refreshCatalog();
      return roomType;
    }
    catch (e) {
      error.value = e instanceof Error ? e.message : 'Error al agregar tipo de habitación';
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
   * @returns {Promise<boolean>} True if update succeeded, false otherwise
   */
  async function updateRoomType(roomTypeId: string, data: HotelRoomTypeFormData): Promise<boolean> {
    loading.value = true;
    error.value = null;
    try {
      const costPerPerson = calculateCostPerPerson(data.pricePerNight, data.maxOccupancy);
      await repository.updateRoomType(roomTypeId, data, costPerPerson);
      await refreshCatalog();
      return true;
    }
    catch (e) {
      error.value = e instanceof Error ? e.message : 'Error al actualizar tipo de habitación';
      return false;
    }
    finally {
      loading.value = false;
    }
  }

  /**
   * Deletes a room type from a provider's configuration
   * @param {string} roomTypeId - The room type ID to delete
   * @returns {Promise<boolean>} True if deletion succeeded, false otherwise
   */
  async function deleteRoomType(roomTypeId: string): Promise<boolean> {
    loading.value = true;
    error.value = null;
    try {
      await repository.removeRoomType(roomTypeId);
      await refreshCatalog();
      return true;
    }
    catch (e) {
      error.value = e instanceof Error ? e.message : 'Error al eliminar tipo de habitación';
      return false;
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
    isLoaded,
    loadError,
    getRoomDataByProviderId,
    hasRoomData,
    getTotalRoomsByProvider,
    getUsedRoomsByProvider,
    // Actions
    refetch,
    initRoomData,
    updateTotalRooms,
    addRoomType,
    updateRoomType,
    deleteRoomType,
  };
});

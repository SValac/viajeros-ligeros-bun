import { defineStore } from 'pinia';
import { computed, ref } from 'vue';

import type { HotelRoomData, HotelRoomType, HotelRoomTypeFormData } from '~/types/hotel-room';

import { validateTotalRoomsUpdate } from '~/composables/hotel-rooms/use-hotel-room-domain';
import { useHotelRoomRepository } from '~/composables/hotel-rooms/use-hotel-room-repository';
import { calculateCostPerPerson, calculateTotalRoomsUsed } from '~/utils/hotel-room-helpers';

/**
 * Hotel Room Store
 * Manages hotel room data and room types for providers.
 * Handles CRUD operations, state management, and validation for hotel rooms and their configurations.
 */
export const useHotelRoomStore = defineStore('hotel-room', () => {
  const repository = useHotelRoomRepository();

  // State
  const hotelRoomsData = ref<HotelRoomData[]>([]);
  const loading = ref(false);
  const error = ref<string | null>(null);

  // Getters
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
   * Fetches all hotel room data from the repository
   * Sets loading state during fetch and handles errors appropriately
   */
  async function fetchAll(): Promise<void> {
    loading.value = true;
    error.value = null;
    try {
      hotelRoomsData.value = await repository.fetchAll();
    }
    catch (e) {
      error.value = e instanceof Error ? e.message : 'Error al cargar habitaciones';
    }
    finally {
      loading.value = false;
    }
  }

  /**
   * Initializes room data for a new provider
   * Only initializes if data doesn't already exist for the provider
   * @param {string} providerId - The provider ID
   * @param {number} totalRooms - The initial total number of rooms
   */
  async function initRoomData(providerId: string, totalRooms: number): Promise<void> {
    if (hasRoomData.value(providerId))
      return;

    loading.value = true;
    error.value = null;
    try {
      const roomData = await repository.insertRoomData(providerId, totalRooms);
      hotelRoomsData.value.push(roomData);
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
    const usedRooms = getUsedRoomsByProvider.value(providerId);
    const validationError = validateTotalRoomsUpdate(total, usedRooms);
    if (validationError) {
      error.value = validationError;
      return false;
    }

    const roomData = hotelRoomsData.value.find(hrd => hrd.providerId === providerId);
    if (!roomData)
      return false;

    loading.value = true;
    error.value = null;
    try {
      const { totalRooms, updatedAt } = await repository.updateRoomTotal(roomData.id, total);
      roomData.totalRooms = totalRooms;
      roomData.updatedAt = updatedAt;
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
    const roomData = hotelRoomsData.value.find(hrd => hrd.providerId === providerId);
    if (!roomData) {
      throw new Error(`No room data found for provider ${providerId}`);
    }

    loading.value = true;
    error.value = null;
    try {
      const costPerPerson = calculateCostPerPerson(data.pricePerNight, data.maxOccupancy);
      const roomType = await repository.insertRoomType(roomData.id, data, costPerPerson);
      roomData.roomTypes.push(roomType);
      roomData.updatedAt = roomType.updatedAt;
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
   * @param {string} providerId - The provider ID
   * @param {string} roomTypeId - The room type ID to update
   * @param {HotelRoomTypeFormData} data - The updated room type data
   * @returns {Promise<boolean>} True if update succeeded, false otherwise
   */
  async function updateRoomType(providerId: string, roomTypeId: string, data: HotelRoomTypeFormData): Promise<boolean> {
    const roomData = hotelRoomsData.value.find(hrd => hrd.providerId === providerId);
    if (!roomData) {
      error.value = 'Proveedor no encontrado';
      return false;
    }

    loading.value = true;
    error.value = null;
    try {
      const costPerPerson = calculateCostPerPerson(data.pricePerNight, data.maxOccupancy);
      const roomType = await repository.updateRoomType(roomTypeId, data, costPerPerson);
      const index = roomData.roomTypes.findIndex(rt => rt.id === roomTypeId);
      if (index !== -1) {
        roomData.roomTypes[index] = roomType;
      }
      roomData.updatedAt = roomType.updatedAt;
      error.value = null;
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
   * @param {string} providerId - The provider ID
   * @param {string} roomTypeId - The room type ID to delete
   * @returns {Promise<boolean>} True if deletion succeeded, false otherwise
   */
  async function deleteRoomType(providerId: string, roomTypeId: string): Promise<boolean> {
    loading.value = true;
    error.value = null;
    try {
      await repository.removeRoomType(roomTypeId);
      const roomData = hotelRoomsData.value.find(hrd => hrd.providerId === providerId);
      if (roomData) {
        const index = roomData.roomTypes.findIndex(rt => rt.id === roomTypeId);
        if (index !== -1)
          roomData.roomTypes.splice(index, 1);
      }
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

  /**
   * Removes all room data for a deleted provider
   * Called by provider store after successful deletion from Supabase
   * DB cascade handles hotel_rooms/hotel_room_types tables
   * @param {string} providerId - The provider ID
   */
  // Called by provider store after it successfully deletes from Supabase.
  // DB cascade handles hotel_rooms/hotel_room_types — this just clears local state.
  function deleteProviderRooms(providerId: string): void {
    const index = hotelRoomsData.value.findIndex(hrd => hrd.providerId === providerId);
    if (index !== -1) {
      hotelRoomsData.value.splice(index, 1);
    }
  }

  return {
    // State
    hotelRoomsData,
    loading,
    error,
    // Getters
    getRoomDataByProviderId,
    hasRoomData,
    getTotalRoomsByProvider,
    getUsedRoomsByProvider,
    // Actions
    fetchAll,
    initRoomData,
    updateTotalRooms,
    addRoomType,
    updateRoomType,
    deleteRoomType,
    deleteProviderRooms,
  };
});

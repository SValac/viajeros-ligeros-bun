import { defineStore } from 'pinia';
import { computed, ref } from 'vue';

import type { HotelRoomData, HotelRoomType, HotelRoomTypeFormData } from '~/types/hotel-room';

import { calculateCostPerPerson, calculateTotalRoomsUsed } from '~/utils/hotel-room-helpers';

export const useHotelRoomStore = defineStore('hotel-room', () => {
  // State
  const hotelRoomsData = ref<HotelRoomData[]>([]);
  const loading = ref(false);
  const error = ref<string | null>(null);

  // Getters
  const getRoomDataByProviderId = computed(() => (id: string) => {
    return hotelRoomsData.value.find(hrd => hrd.providerId === id);
  });

  const hasRoomData = computed(() => (providerId: string) => {
    return hotelRoomsData.value.some(hrd => hrd.providerId === providerId);
  });

  const getTotalRoomsByProvider = computed(() => (providerId: string) => {
    const roomData = hotelRoomsData.value.find(hrd => hrd.providerId === providerId);
    return roomData?.totalHabitaciones ?? 0;
  });

  const getUsedRoomsByProvider = computed(() => (providerId: string) => {
    const roomData = hotelRoomsData.value.find(hrd => hrd.providerId === providerId);
    if (!roomData)
      return 0;
    return calculateTotalRoomsUsed(roomData.roomTypes);
  });

  // Actions
  function initRoomData(providerId: string, totalHabitaciones: number): void {
    if (hasRoomData.value(providerId)) {
      return;
    }

    const now = new Date().toISOString();
    const newRoomData: HotelRoomData = {
      id: providerId,
      providerId,
      totalHabitaciones,
      roomTypes: [],
      createdAt: now,
      updatedAt: now,
    };

    hotelRoomsData.value.push(newRoomData);
  }

  function updateTotalRooms(providerId: string, total: number): boolean {
    const usedRooms = getUsedRoomsByProvider.value(providerId);

    if (total < usedRooms) {
      error.value = 'El total no puede ser menor a las habitaciones ya configuradas';
      return false;
    }

    const roomData = hotelRoomsData.value.find(hrd => hrd.providerId === providerId);
    if (!roomData)
      return false;

    roomData.totalHabitaciones = total;
    roomData.updatedAt = new Date().toISOString();
    error.value = null;

    return true;
  }

  function addRoomType(providerId: string, data: HotelRoomTypeFormData): HotelRoomType {
    const roomData = hotelRoomsData.value.find(hrd => hrd.providerId === providerId);
    if (!roomData) {
      throw new Error(`No room data found for provider ${providerId}`);
    }

    const now = new Date().toISOString();
    const costoHabitacionPorPersona = calculateCostPerPerson(data.precioPorNoche, data.ocupacionMaxima);
    const newRoomType: HotelRoomType = {
      id: crypto.randomUUID(),
      ...data,
      costoHabitacionPorPersona,
      createdAt: now,
      updatedAt: now,
    };

    roomData.roomTypes.push(newRoomType);
    roomData.updatedAt = now;

    return newRoomType;
  }

  function updateRoomType(providerId: string, roomTypeId: string, data: HotelRoomTypeFormData): boolean {
    const roomData = hotelRoomsData.value.find(hrd => hrd.providerId === providerId);
    if (!roomData) {
      error.value = 'Proveedor no encontrado';
      return false;
    }

    const roomType = roomData.roomTypes.find(rt => rt.id === roomTypeId);
    if (!roomType) {
      error.value = 'Tipo de habitación no encontrado';
      return false;
    }

    const now = new Date().toISOString();
    const costoHabitacionPorPersona = calculateCostPerPerson(data.precioPorNoche, data.ocupacionMaxima);
    Object.assign(roomType, {
      ...data,
      costoHabitacionPorPersona,
      updatedAt: now,
    });

    roomData.updatedAt = now;
    error.value = null;

    return true;
  }

  function deleteRoomType(providerId: string, roomTypeId: string): boolean {
    const roomData = hotelRoomsData.value.find(hrd => hrd.providerId === providerId);
    if (!roomData)
      return false;

    const index = roomData.roomTypes.findIndex(rt => rt.id === roomTypeId);
    if (index === -1)
      return false;

    roomData.roomTypes.splice(index, 1);
    roomData.updatedAt = new Date().toISOString();

    return true;
  }

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
    initRoomData,
    updateTotalRooms,
    addRoomType,
    updateRoomType,
    deleteRoomType,
    deleteProviderRooms,
  };
}, {
  persist: {
    key: 'viajeros-ligeros-hotel-rooms',
    storage: import.meta.client ? localStorage : undefined,
    pick: ['hotelRoomsData'],
  },
});

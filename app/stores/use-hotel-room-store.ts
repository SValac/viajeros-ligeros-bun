import { defineStore } from 'pinia';
import { computed, ref } from 'vue';

import type { HotelRoomData, HotelRoomType, HotelRoomTypeFormData } from '~/types/hotel-room';

import { calculateCostPerPerson, calculateTotalRoomsUsed } from '~/utils/hotel-room-helpers';
import { mapHotelRoomRowToDomain, mapHotelRoomTypeRowToDomain } from '~/utils/mappers';

export const useHotelRoomStore = defineStore('hotel-room', () => {
  const supabase = useSupabase();

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
    return roomData?.totalRooms ?? 0;
  });

  const getUsedRoomsByProvider = computed(() => (providerId: string) => {
    const roomData = hotelRoomsData.value.find(hrd => hrd.providerId === providerId);
    if (!roomData)
      return 0;
    return calculateTotalRoomsUsed(roomData.roomTypes);
  });

  // Actions
  async function fetchAll(): Promise<void> {
    loading.value = true;
    error.value = null;
    try {
      const { data, error: err } = await supabase
        .from('hotel_rooms')
        .select('*, hotel_room_types(*)')
        .order('created_at');
      if (err)
        throw err;
      hotelRoomsData.value = data.map(row =>
        mapHotelRoomRowToDomain(row, row.hotel_room_types.map(mapHotelRoomTypeRowToDomain)),
      );
    }
    catch (e) {
      error.value = e instanceof Error ? e.message : 'Error al cargar habitaciones';
    }
    finally {
      loading.value = false;
    }
  }

  async function initRoomData(providerId: string, totalRooms: number): Promise<void> {
    if (hasRoomData.value(providerId))
      return;

    const { data: row, error: err } = await supabase
      .from('hotel_rooms')
      .insert({ provider_id: providerId, total_rooms: totalRooms })
      .select()
      .single();

    if (err) {
      error.value = err.message;
      return;
    }

    hotelRoomsData.value.push(mapHotelRoomRowToDomain(row, []));
  }

  async function updateTotalRooms(providerId: string, total: number): Promise<boolean> {
    const usedRooms = getUsedRoomsByProvider.value(providerId);
    if (total < usedRooms) {
      error.value = 'El total no puede ser menor a las habitaciones ya configuradas';
      return false;
    }

    const roomData = hotelRoomsData.value.find(hrd => hrd.providerId === providerId);
    if (!roomData)
      return false;

    const { data: row, error: err } = await supabase
      .from('hotel_rooms')
      .update({ total_rooms: total })
      .eq('id', roomData.id)
      .select()
      .single();

    if (err) {
      error.value = err.message;
      return false;
    }

    roomData.totalRooms = row.total_rooms;
    roomData.updatedAt = row.updated_at;
    error.value = null;
    return true;
  }

  async function addRoomType(providerId: string, data: HotelRoomTypeFormData): Promise<HotelRoomType> {
    const roomData = hotelRoomsData.value.find(hrd => hrd.providerId === providerId);
    if (!roomData) {
      throw new Error(`No room data found for provider ${providerId}`);
    }

    const costPerPerson = calculateCostPerPerson(data.pricePerNight, data.maxOccupancy);

    const { data: row, error: err } = await supabase
      .from('hotel_room_types')
      .insert({
        hotel_room_id: roomData.id,
        max_occupancy: data.maxOccupancy,
        room_count: data.roomCount,
        beds: data.beds,
        price_per_night: data.pricePerNight,
        cost_per_person: costPerPerson,
        additional_details: data.additionalDetails ?? null,
      })
      .select()
      .single();

    if (err) {
      error.value = err.message;
      throw err;
    }

    const roomType = mapHotelRoomTypeRowToDomain(row);
    roomData.roomTypes.push(roomType);
    roomData.updatedAt = row.updated_at;
    return roomType;
  }

  async function updateRoomType(providerId: string, roomTypeId: string, data: HotelRoomTypeFormData): Promise<boolean> {
    const roomData = hotelRoomsData.value.find(hrd => hrd.providerId === providerId);
    if (!roomData) {
      error.value = 'Proveedor no encontrado';
      return false;
    }

    const costPerPerson = calculateCostPerPerson(data.pricePerNight, data.maxOccupancy);

    const { data: row, error: err } = await supabase
      .from('hotel_room_types')
      .update({
        max_occupancy: data.maxOccupancy,
        room_count: data.roomCount,
        beds: data.beds,
        price_per_night: data.pricePerNight,
        cost_per_person: costPerPerson,
        additional_details: data.additionalDetails ?? null,
      })
      .eq('id', roomTypeId)
      .select()
      .single();

    if (err) {
      error.value = err.message;
      return false;
    }

    const index = roomData.roomTypes.findIndex(rt => rt.id === roomTypeId);
    if (index !== -1) {
      roomData.roomTypes[index] = mapHotelRoomTypeRowToDomain(row);
    }
    roomData.updatedAt = row.updated_at;
    error.value = null;
    return true;
  }

  async function deleteRoomType(providerId: string, roomTypeId: string): Promise<boolean> {
    const { error: err } = await supabase
      .from('hotel_room_types')
      .delete()
      .eq('id', roomTypeId);

    if (err) {
      error.value = err.message;
      return false;
    }

    const roomData = hotelRoomsData.value.find(hrd => hrd.providerId === providerId);
    if (roomData) {
      const index = roomData.roomTypes.findIndex(rt => rt.id === roomTypeId);
      if (index !== -1)
        roomData.roomTypes.splice(index, 1);
    }
    error.value = null;
    return true;
  }

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

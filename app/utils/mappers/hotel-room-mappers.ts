import type { Tables, TablesUpdate } from '~/types/database.types';
import type { BedConfiguration, HotelRoomData, HotelRoomType, HotelRoomTypeFormData } from '~/types/hotel-room';

import { normalizeBedConfigurations } from '~/utils/hotel-room-helpers';

export function mapHotelRoomRowToDomain(
  row: Tables<'hotel_rooms'>,
  roomTypes: HotelRoomType[],
): HotelRoomData {
  return {
    id: row.id,
    providerId: row.provider_id,
    totalRooms: row.total_rooms,
    roomTypes,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

// The columns a room type's insert and update write; `costPerPerson` comes computed by the store.
export function mapHotelRoomTypeToRow(data: HotelRoomTypeFormData, costPerPerson: number) {
  return {
    max_occupancy: data.maxOccupancy,
    room_count: data.roomCount,
    beds: data.beds,
    price_per_night: data.pricePerNight,
    cost_per_person: costPerPerson,
    additional_details: data.additionalDetails ?? null,
  } satisfies TablesUpdate<'hotel_room_types'>;
}

export function mapHotelRoomTypeRowToDomain(row: Tables<'hotel_room_types'>): HotelRoomType {
  return {
    id: row.id,
    maxOccupancy: row.max_occupancy,
    roomCount: row.room_count,
    beds: normalizeBedConfigurations(row.beds as BedConfiguration[]),
    pricePerNight: row.price_per_night,
    costPerPerson: row.cost_per_person,
    additionalDetails: row.additional_details ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

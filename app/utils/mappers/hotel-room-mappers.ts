import type { Tables } from '~/types/database.types';
import type { BedConfiguration, HotelRoomData, HotelRoomType } from '~/types/hotel-room';

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

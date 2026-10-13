import type { Tables, TablesInsert } from '~/types/database.types';
import type { Traveler, TravelerFormData, TravelerRoomAssignment } from '~/types/traveler';

export function mapTravelerRowToDomain(row: Tables<'travelers'>): Traveler {
  return {
    id: row.id,
    // Falls back for a DB without the column yet (the app ships before the migration).
    kind: row.kind ?? 'traveler',
    coordinatorId: row.coordinator_id ?? undefined,
    firstName: row.first_name,
    lastName: row.last_name,
    phone: row.phone,
    travelId: row.travel_id,
    travelBusId: row.travel_bus_id ?? '',
    seat: row.seat,
    boardingPoint: row.boarding_point,
    isRepresentative: row.is_representative,
    representativeId: row.representative_id ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function mapTravelerToInsert(data: TravelerFormData): TablesInsert<'travelers'> {
  return {
    first_name: data.firstName,
    last_name: data.lastName,
    phone: data.phone,
    travel_id: data.travelId,
    travel_bus_id: data.travelBusId || null,
    seat: data.seat,
    boarding_point: data.boardingPoint,
    is_representative: data.isRepresentative,
    representative_id: data.representativeId ?? null,
  };
}

export function mapTravelerRoomAssignmentRowToDomain(row: Tables<'traveler_room_assignments'>): TravelerRoomAssignment {
  return {
    travelerId: row.traveler_id,
    travelAccommodationId: row.travel_accommodation_id,
    providerId: row.provider_id,
    travelId: row.travel_id,
  };
}

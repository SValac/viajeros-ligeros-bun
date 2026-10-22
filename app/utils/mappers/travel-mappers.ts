import type { Tables, TablesInsert } from '~/types/database.types';
import type { Travel, TravelAccommodation, TravelActivity, TravelBus, TravelFormData, TravelService } from '~/types/travel';
import type { TravelMedia, TravelMediaType } from '~/types/travel-media';

export function mapTravelRowToDomain(
  row: Tables<'travels'> & {
    travel_internals?: Pick<Tables<'travel_internals'>, 'internal_notes' | 'total_operation_cost' | 'projected_profit'> | Pick<Tables<'travel_internals'>, 'internal_notes' | 'total_operation_cost' | 'projected_profit'>[] | null;
  },
  extras?: {
    coordinatorIds?: string[];
    itinerary?: TravelActivity[];
    services?: TravelService[];
    buses?: TravelBus[];
    accommodations?: TravelAccommodation[];
    internals?: Pick<Tables<'travel_internals'>, 'internal_notes' | 'total_operation_cost' | 'projected_profit'> | null;
  },
): Travel {
  const internals = extras?.internals !== undefined
    ? extras.internals
    : (Array.isArray(row.travel_internals) ? row.travel_internals[0] : row.travel_internals);
  return {
    id: row.id,
    label: row.label,
    destination: row.destination ?? undefined,
    startDate: row.start_date,
    endDate: row.end_date,
    description: row.description,
    imageUrl: row.image_url ?? undefined,
    status: row.status,
    departureFrom: row.departure_from ?? undefined,
    summary: row.summary ?? undefined,
    highlights: row.highlights ?? [],
    featured: row.featured,
    internalNotes: internals?.internal_notes ?? undefined,
    totalOperationCost: internals?.total_operation_cost ?? undefined,
    projectedProfit: internals?.projected_profit ?? undefined,
    coordinatorIds: extras?.coordinatorIds ?? [],
    itinerary: extras?.itinerary ?? [],
    services: extras?.services ?? [],
    buses: extras?.buses ?? [],
    accommodations: extras?.accommodations ?? [],
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function mapTravelActivityRowToDomain(row: Tables<'travel_activities'> & { map_location?: any }): TravelActivity {
  const mapLocationData = (row as any).map_location;
  return {
    id: row.id,
    day: row.day,
    title: row.title,
    description: row.description,
    time: row.time ?? undefined,
    location: row.location ?? undefined,
    mapLocation: mapLocationData
      ? {
          lat: mapLocationData.lat,
          lng: mapLocationData.lng,
          placeId: mapLocationData.placeId,
          address: mapLocationData.address,
        }
      : undefined,
  };
}

export function mapTravelBusRowToDomain(row: Tables<'travel_buses'>): TravelBus {
  return {
    id: row.id,
    busId: row.bus_id ?? undefined,
    quotationBusId: row.quotation_bus_id ?? undefined,
    providerId: row.provider_id,
    model: row.model ?? undefined,
    brand: row.brand ?? undefined,
    year: row.year ?? undefined,
    operator1Name: row.operator1_name,
    operator1Phone: row.operator1_phone,
    operator2Name: row.operator2_name ?? undefined,
    operator2Phone: row.operator2_phone ?? undefined,
    seatCount: row.seat_count,
  };
}

export function mapTravelServiceRowToDomain(row: Tables<'travel_services'>): TravelService {
  return {
    id: row.id,
    name: row.name,
    description: row.description ?? undefined,
    included: row.included,
  };
}

export function mapTravelAccommodationRowToDomain(row: Tables<'travel_accommodations'>): TravelAccommodation {
  return {
    id: row.id,
    travelId: row.travel_id,
    providerId: row.provider_id,
    hotelRoomTypeId: row.hotel_room_type_id ?? undefined,
    maxOccupancy: row.max_occupancy,
    roomNumber: row.room_number ?? undefined,
    floor: row.floor ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function mapTravelServiceToInsert(travelId: string, service: TravelService): TablesInsert<'travel_services'> {
  return {
    travel_id: travelId,
    name: service.name,
    description: service.description ?? null,
    included: service.included,
  };
}

export function mapTravelBusToInsert(travelId: string, bus: TravelBus): TablesInsert<'travel_buses'> {
  return {
    travel_id: travelId,
    bus_id: bus.busId ?? null,
    provider_id: bus.providerId,
    model: bus.model ?? null,
    brand: bus.brand ?? null,
    year: bus.year ?? null,
    operator1_name: bus.operator1Name,
    operator1_phone: bus.operator1Phone,
    operator2_name: bus.operator2Name ?? null,
    operator2_phone: bus.operator2Phone ?? null,
    seat_count: bus.seatCount,
  };
}

export function mapTravelAccommodationToInsert(
  travelId: string,
  accommodation: Pick<TravelAccommodation, 'providerId' | 'hotelRoomTypeId' | 'maxOccupancy' | 'roomNumber' | 'floor'>,
): TablesInsert<'travel_accommodations'> {
  return {
    travel_id: travelId,
    provider_id: accommodation.providerId,
    hotel_room_type_id: accommodation.hotelRoomTypeId ?? null,
    max_occupancy: accommodation.maxOccupancy,
    room_number: accommodation.roomNumber ?? null,
    floor: accommodation.floor ?? null,
  };
}

export function mapTravelMediaRowToDomain(row: Tables<'travel_media'>): TravelMedia {
  return {
    id: row.id,
    travelId: row.travel_id,
    storagePath: row.storage_path,
    publicUrl: row.public_url,
    mediaType: row.media_type as TravelMediaType,
    caption: row.caption,
    displayOrder: row.display_order,
    createdAt: row.created_at,
  };
}

// slug is omitted: the database assigns it on first publish (see travels_assign_slug trigger).
export function mapTravelToInsert(data: TravelFormData): Omit<Tables<'travels'>, 'id' | 'created_at' | 'updated_at' | 'owner_id' | 'slug' | 'from_price'> {
  return {
    label: data.label,
    destination: data.destination ?? null,
    start_date: data.startDate,
    end_date: data.endDate,
    description: data.description,
    image_url: data.imageUrl ?? null,
    status: data.status,
    departure_from: data.departureFrom ?? null,
    summary: data.summary ?? null,
    highlights: data.highlights ?? [],
    featured: data.featured ?? false,
  };
}

export function mapTravelInternalsToInsert(
  data: Partial<Pick<Travel, 'internalNotes' | 'totalOperationCost' | 'projectedProfit'>>,
): Omit<Tables<'travel_internals'>, 'travel_id' | 'created_at' | 'updated_at'> {
  return {
    internal_notes: data.internalNotes ?? null,
    total_operation_cost: data.totalOperationCost ?? null,
    projected_profit: data.projectedProfit ?? null,
  };
}

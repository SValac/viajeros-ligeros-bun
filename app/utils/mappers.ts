import type { Bus, BusFormData } from '~/types/bus';
import type { Coordinator, CoordinatorFormData } from '~/types/coordinator';
import type { Json, Tables, TablesInsert } from '~/types/database.types';
import type { BedConfiguration, HotelRoomData, HotelRoomType } from '~/types/hotel-room';
import type { AdjustmentItem, Payment, PaymentFormData, TravelerAccountConfig } from '~/types/payment';
import type { Provider, ProviderFormData } from '~/types/provider';
import type {
  AccommodationPayment,
  AccommodationPaymentFormData,
  BusPayment,
  BusPaymentFormData,
  ProviderPayment,
  ProviderPaymentFormData,
  Quotation,
  QuotationAccommodation,
  QuotationAccommodationDetail,
  QuotationBus,
  QuotationBusFormData,
  QuotationFormData,
  QuotationProvider,
  QuotationProviderFormData,
  QuotationPublicPrice,
  QuotationPublicPriceFormData,
} from '~/types/quotation';
import type { Travel, TravelAccommodation, TravelActivity, TravelBus, TravelFormData, TravelService } from '~/types/travel';
import type { Traveler, TravelerFormData } from '~/types/traveler';

import { normalizeBedConfigurations } from '~/utils/hotel-room-helpers';

// ============================================================================
// Provider
// ============================================================================

export function mapProviderRowToDomain(row: Tables<'providers'>): Provider {
  return {
    id: row.id,
    name: row.name,
    category: row.category,
    description: row.description ?? undefined,
    location: {
      city: row.location_city,
      state: row.location_state,
      country: row.location_country,
    },
    contact: {
      name: row.contact_name ?? undefined,
      phone: row.contact_phone ?? undefined,
      email: row.contact_email ?? undefined,
      notes: row.contact_notes ?? undefined,
    },
    active: row.active,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function mapProviderToInsert(data: ProviderFormData): Omit<Tables<'providers'>, 'id' | 'created_at' | 'updated_at'> {
  return {
    name: data.name,
    category: data.category,
    description: data.description ?? null,
    location_city: data.location.city,
    location_state: data.location.state,
    location_country: data.location.country,
    contact_name: data.contact.name ?? null,
    contact_phone: data.contact.phone ?? null,
    contact_email: data.contact.email ?? null,
    contact_notes: data.contact.notes ?? null,
    active: data.active,
  };
}

// ============================================================================
// Coordinator
// ============================================================================

export function mapCoordinatorRowToDomain(row: Tables<'coordinators'>): Coordinator {
  return {
    id: row.id,
    name: row.name,
    age: row.age,
    phone: row.phone,
    email: row.email,
    notes: row.notes ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function mapCoordinatorToInsert(data: CoordinatorFormData): Omit<Tables<'coordinators'>, 'id' | 'created_at' | 'updated_at'> {
  return {
    name: data.name,
    age: data.age,
    phone: data.phone,
    email: data.email,
    notes: data.notes ?? null,
  };
}

// ============================================================================
// Bus
// ============================================================================

export function mapBusRowToDomain(row: Tables<'buses'>): Bus {
  return {
    id: row.id,
    providerId: row.provider_id,
    brand: row.brand ?? undefined,
    model: row.model ?? undefined,
    year: row.year ?? undefined,
    seatCount: row.seat_count,
    rentalPrice: row.rental_price,
    active: row.active,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function mapBusToInsert(data: BusFormData): Omit<Tables<'buses'>, 'id' | 'created_at' | 'updated_at'> {
  return {
    provider_id: data.providerId,
    brand: data.brand ?? null,
    model: data.model ?? null,
    year: data.year ?? null,
    seat_count: data.seatCount,
    rental_price: data.rentalPrice,
    active: data.active,
  };
}

// ============================================================================
// Travel
// ============================================================================

export function mapTravelRowToDomain(
  row: Tables<'travels'>,
  extras?: {
    coordinatorIds?: string[];
    itinerary?: TravelActivity[];
    services?: TravelService[];
    buses?: TravelBus[];
    accommodations?: TravelAccommodation[];
  },
): Travel {
  return {
    id: row.id,
    destination: row.destination,
    startDate: row.start_date,
    endDate: row.end_date,
    price: row.price,
    description: row.description,
    imageUrl: row.image_url ?? undefined,
    status: row.status,
    internalNotes: row.internal_notes ?? undefined,
    totalOperationCost: row.total_operation_cost ?? undefined,
    minimumSeats: row.minimum_seats ?? undefined,
    projectedProfit: row.projected_profit ?? undefined,
    accumulatedTravelers: row.accumulated_travelers ?? undefined,
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
    rentalPrice: Number(row.rental_price),
  };
}

export function mapTravelServiceRowToDomain(row: Tables<'travel_services'>): TravelService {
  return {
    id: row.id,
    name: row.name,
    description: row.description ?? undefined,
    included: row.included,
    providerId: row.provider_id ?? undefined,
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

export function mapTravelToInsert(data: TravelFormData): Omit<Tables<'travels'>, 'id' | 'created_at' | 'updated_at'> {
  return {
    destination: data.destination,
    start_date: data.startDate,
    end_date: data.endDate,
    price: data.price,
    description: data.description,
    image_url: data.imageUrl ?? null,
    status: data.status,
    internal_notes: data.internalNotes ?? null,
    total_operation_cost: data.totalOperationCost ?? null,
    minimum_seats: data.minimumSeats ?? null,
    projected_profit: data.projectedProfit ?? null,
    accumulated_travelers: data.accumulatedTravelers ?? null,
  };
}

// ============================================================================
// Traveler
// ============================================================================

export function mapTravelerRowToDomain(row: Tables<'travelers'>): Traveler {
  return {
    id: row.id,
    firstName: row.first_name,
    lastName: row.last_name,
    phone: row.phone,
    travelId: row.travel_id,
    travelBusId: row.travel_bus_id ?? '',
    seat: row.seat,
    boardingPoint: row.boarding_point,
    isRepresentative: row.is_representative,
    representativeId: row.representative_id ?? undefined,
    travelAccommodationId: row.travel_accommodation_id ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function mapTravelerToInsert(data: TravelerFormData): Omit<Tables<'travelers'>, 'id' | 'created_at' | 'updated_at'> {
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
    travel_accommodation_id: data.travelAccommodationId ?? null,
  };
}

// ============================================================================
// Hotel Rooms
// ============================================================================

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

// ============================================================================
// Payment
// ============================================================================

export function mapPaymentRowToDomain(row: Tables<'payments'>): Payment {
  return {
    id: row.id,
    travelId: row.travel_id,
    travelerId: row.traveler_id,
    amount: row.amount,
    paymentDate: row.payment_date,
    paymentType: row.payment_type,
    notes: row.notes ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function mapPaymentToInsert(data: PaymentFormData): Omit<Tables<'payments'>, 'id' | 'created_at' | 'updated_at'> {
  return {
    travel_id: data.travelId,
    traveler_id: data.travelerId,
    amount: data.amount,
    payment_date: data.paymentDate,
    payment_type: data.paymentType,
    notes: data.notes ?? null,
  };
}

export function mapTravelerAccountConfigRowToDomain(row: Tables<'traveler_account_configs'>): TravelerAccountConfig {
  return {
    travelerId: row.traveler_id,
    travelId: row.travel_id,
    travelerType: row.traveler_type,
    childPrice: row.child_price ?? undefined,
    discounts: (row.discounts as AdjustmentItem[]) ?? [],
    surcharges: (row.surcharges as AdjustmentItem[]) ?? [],
    publicPriceId: row.public_price_id ?? undefined,
    publicPriceAmount: row.public_price_amount ?? undefined,
  };
}

export function mapTravelerAccountConfigToUpsert(config: TravelerAccountConfig): TablesInsert<'traveler_account_configs'> {
  return {
    travel_id: config.travelId,
    traveler_id: config.travelerId,
    traveler_type: config.travelerType,
    child_price: config.childPrice ?? null,
    discounts: config.discounts as unknown as Json,
    surcharges: config.surcharges as unknown as Json,
    public_price_id: config.publicPriceId ?? null,
    public_price_amount: config.publicPriceAmount ?? null,
  };
}

// ============================================================================
// Quotation
// ============================================================================

export function mapQuotationRowToDomain(row: Tables<'quotations'>): Quotation {
  return {
    id: row.id,
    travelId: row.travel_id,
    busCapacity: row.bus_capacity,
    minimumSeatTarget: row.minimum_seat_target,
    seatPrice: row.seat_price,
    status: row.status,
    notes: row.notes ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function mapQuotationToInsert(data: QuotationFormData): Omit<Tables<'quotations'>, 'id' | 'created_at' | 'updated_at'> {
  return {
    travel_id: data.travelId,
    bus_capacity: data.busCapacity,
    minimum_seat_target: data.minimumSeatTarget,
    seat_price: data.seatPrice,
    status: data.status,
    notes: data.notes ?? null,
  };
}

// ============================================================================
// Quotation Provider
// ============================================================================

export function mapQuotationProviderRowToDomain(row: Tables<'quotation_providers'>): QuotationProvider {
  return {
    id: row.id,
    quotationId: row.quotation_id,
    providerId: row.provider_id,
    serviceDescription: row.service_description,
    remarks: row.remarks ?? undefined,
    totalCost: row.total_cost,
    paymentMethod: row.payment_method,
    splitType: row.split_type,
    confirmed: row.confirmed,
  };
}

export function mapQuotationProviderToInsert(data: QuotationProviderFormData): Omit<Tables<'quotation_providers'>, 'id'> {
  return {
    quotation_id: data.quotationId,
    provider_id: data.providerId,
    service_description: data.serviceDescription,
    remarks: data.remarks ?? null,
    total_cost: data.totalCost,
    payment_method: data.paymentMethod,
    split_type: data.splitType,
    confirmed: data.confirmed,
  };
}

export function mapProviderPaymentRowToDomain(row: Tables<'provider_payments'>): ProviderPayment {
  return {
    id: row.id,
    quotationProviderId: row.quotation_provider_id,
    amount: row.amount,
    paymentDate: row.payment_date,
    paymentType: row.payment_type,
    concept: row.concept ?? undefined,
    notes: row.notes ?? undefined,
    createdAt: row.created_at,
  };
}

export function mapProviderPaymentToInsert(data: ProviderPaymentFormData): Omit<Tables<'provider_payments'>, 'id' | 'created_at'> {
  return {
    quotation_provider_id: data.quotationProviderId,
    amount: data.amount,
    payment_date: data.paymentDate,
    payment_type: data.paymentType,
    concept: data.concept ?? null,
    notes: data.notes ?? null,
  };
}

// ============================================================================
// Quotation Accommodation
// ============================================================================

export function mapQuotationAccommodationRowToDomain(
  row: Tables<'quotation_accommodations'>,
  details: QuotationAccommodationDetail[],
): QuotationAccommodation {
  return {
    id: row.id,
    quotationId: row.quotation_id,
    providerId: row.provider_id,
    nightCount: row.night_count,
    details,
    totalCost: row.total_cost,
    paymentMethod: row.payment_method,
    confirmed: row.confirmed,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function mapQuotationAccommodationDetailRowToDomain(row: Tables<'quotation_accommodation_details'>): QuotationAccommodationDetail {
  return {
    id: row.id,
    roomTypeId: row.hotel_room_type_id,
    quantity: row.quantity,
    pricePerNight: row.price_per_night,
    maxOccupancy: row.max_occupancy,
  };
}

export function mapAccommodationPaymentRowToDomain(row: Tables<'accommodation_payments'>): AccommodationPayment {
  return {
    id: row.id,
    quotationAccommodationId: row.quotation_accommodation_id,
    amount: row.amount,
    paymentDate: row.payment_date,
    paymentType: row.payment_type,
    concept: row.concept ?? undefined,
    notes: row.notes ?? undefined,
    createdAt: row.created_at,
  };
}

export function mapAccommodationPaymentToInsert(data: AccommodationPaymentFormData): Omit<Tables<'accommodation_payments'>, 'id' | 'created_at'> {
  return {
    quotation_accommodation_id: data.quotationAccommodationId,
    amount: data.amount,
    payment_date: data.paymentDate,
    payment_type: data.paymentType,
    concept: data.concept ?? null,
    notes: data.notes ?? null,
  };
}

// ============================================================================
// Quotation Bus
// ============================================================================

export function mapQuotationBusRowToDomain(row: Tables<'quotation_buses'>): QuotationBus {
  return {
    id: row.id,
    quotationId: row.quotation_id,
    providerId: row.provider_id,
    unitNumber: row.unit_number,
    capacity: row.capacity,
    status: row.status,
    totalCost: row.total_cost,
    splitType: row.split_type,
    paymentMethod: row.payment_method,
    remarks: row.remarks ?? undefined,
    notes: row.notes ?? undefined,
    confirmed: row.confirmed,
    coordinatorIds: (Array.isArray(row.coordinator_ids) ? row.coordinator_ids : []) as ([] | [string] | [string, string]),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function mapQuotationBusToInsert(data: QuotationBusFormData): Omit<Tables<'quotation_buses'>, 'id' | 'created_at' | 'updated_at'> {
  return {
    quotation_id: data.quotationId,
    provider_id: data.providerId,
    unit_number: data.unitNumber,
    capacity: data.capacity,
    status: data.status,
    total_cost: data.totalCost,
    split_type: data.splitType,
    payment_method: data.paymentMethod,
    remarks: data.remarks ?? null,
    notes: data.notes ?? null,
    confirmed: data.confirmed,
    coordinator_ids: (data.coordinatorIds ?? []) as unknown as import('~/types/database.types').Json,
  };
}

export function mapBusPaymentRowToDomain(row: Tables<'bus_payments'>): BusPayment {
  return {
    id: row.id,
    quotationBusId: row.quotation_bus_id,
    amount: row.amount,
    paymentDate: row.payment_date,
    paymentType: row.payment_type,
    concept: row.concept ?? undefined,
    notes: row.notes ?? undefined,
    createdAt: row.created_at,
  };
}

export function mapBusPaymentToInsert(data: BusPaymentFormData): Omit<Tables<'bus_payments'>, 'id' | 'created_at'> {
  return {
    quotation_bus_id: data.quotationBusId,
    amount: data.amount,
    payment_date: data.paymentDate,
    payment_type: data.paymentType,
    concept: data.concept ?? null,
    notes: data.notes ?? null,
  };
}

// ============================================================================
// Quotation Public Price
// ============================================================================

export function mapQuotationPublicPriceRowToDomain(row: Tables<'quotation_public_prices'>): QuotationPublicPrice {
  return {
    id: row.id,
    quotationId: row.quotation_id,
    priceType: row.price_type,
    description: row.description,
    pricePerPerson: row.price_per_person,
    roomType: row.room_type ?? undefined,
    ageGroup: row.age_group ?? undefined,
    notes: row.notes ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function mapQuotationPublicPriceToInsert(data: QuotationPublicPriceFormData): Omit<Tables<'quotation_public_prices'>, 'id' | 'created_at' | 'updated_at'> {
  return {
    quotation_id: data.quotationId,
    price_type: data.priceType,
    description: data.description,
    price_per_person: data.pricePerPerson,
    room_type: data.roomType ?? null,
    age_group: data.ageGroup ?? null,
    notes: data.notes ?? null,
  };
}

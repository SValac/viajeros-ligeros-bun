import type { Tables, TablesInsert } from '~/types/database.types';
import type {
  ProviderOptOut,
  ProviderPriceAdjustment,
  Quotation,
  QuotationAccommodation,
  QuotationAccommodationDetail,
  QuotationBus,
  QuotationBusFormData,
  QuotationExpense,
  QuotationExpenseFormData,
  QuotationFormData,
  QuotationProvider,
  QuotationProviderFormData,
  QuotationPublicPrice,
  QuotationPublicPriceFormData,
  TravelerPriceAdjustment,
} from '~/types/quotation';

// ============================================================================
// Quotation
// ============================================================================

export function mapQuotationRowToDomain(row: Tables<'quotations'>): Quotation {
  return {
    id: row.id,
    travelId: row.travel_id,
    totalSeats: row.total_seats,
    minimumSeatTarget: row.minimum_seat_target,
    seatPrice: row.seat_price,
    status: row.status,
    notes: row.notes ?? undefined,
    showPublicRoomType: row.show_public_room_type,
    showPublicDescription: row.show_public_description,
    // Falls back for a DB without the column yet (the app ships before the migration).
    coordinatorsTakeSeats: row.coordinators_take_seats ?? false,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function mapQuotationToInsert(data: QuotationFormData): TablesInsert<'quotations'> {
  return {
    travel_id: data.travelId,
    total_seats: data.totalSeats,
    minimum_seat_target: data.minimumSeatTarget,
    seat_price: data.seatPrice,
    status: data.status,
    notes: data.notes ?? null,
    show_public_room_type: data.showPublicRoomType ?? true,
    show_public_description: data.showPublicDescription ?? true,
    // Sent only when set, so creating a quotation still works before the column exists.
    ...(data.coordinatorsTakeSeats !== undefined && { coordinators_take_seats: data.coordinatorsTakeSeats }),
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
    costType: row.cost_type,
    unitCost: row.unit_cost ?? undefined,
    paymentMethod: row.payment_method,
    splitType: row.split_type,
    confirmed: row.confirmed,
    coordinatorsCourtesy: row.coordinators_courtesy,
    payableCost: row.payable_cost,
  };
}

export function mapQuotationProviderToInsert(data: QuotationProviderFormData): TablesInsert<'quotation_providers'> {
  return {
    quotation_id: data.quotationId,
    provider_id: data.providerId,
    service_description: data.serviceDescription,
    remarks: data.remarks ?? null,
    total_cost: data.totalCost,
    ...mapProviderCostFields(data),
    payment_method: data.paymentMethod,
    split_type: data.splitType,
    confirmed: data.confirmed,
  };
}

// A total cost has no per-person price or courtesy.
export function mapProviderCostFields(data: Pick<QuotationProviderFormData, 'costType' | 'unitCost' | 'coordinatorsCourtesy'>): Pick<Tables<'quotation_providers'>, 'cost_type' | 'unit_cost' | 'coordinators_courtesy'> {
  const perPerson = data.costType === 'per_person';
  return {
    cost_type: data.costType,
    unit_cost: perPerson ? data.unitCost ?? null : null,
    coordinators_courtesy: perPerson && data.coordinatorsCourtesy,
  };
}

export function mapProviderPriceAdjustmentRowToDomain(row: Tables<'quotation_provider_price_adjustments'>): ProviderPriceAdjustment {
  return {
    id: row.id,
    quotationProviderId: row.quotation_provider_id,
    label: row.label,
    kind: row.kind,
    mode: row.mode,
    value: row.value,
  };
}

export function mapTravelerPriceAdjustmentRowToDomain(row: Tables<'quotation_provider_traveler_adjustments'>): TravelerPriceAdjustment {
  return {
    quotationProviderId: row.quotation_provider_id,
    travelerId: row.traveler_id,
    travelId: row.travel_id,
    adjustmentId: row.adjustment_id,
  };
}

export function mapProviderOptOutRowToDomain(row: Tables<'quotation_provider_opt_outs'>): ProviderOptOut {
  return {
    quotationProviderId: row.quotation_provider_id,
    travelerId: row.traveler_id,
    travelId: row.travel_id,
  };
}

// ============================================================================
// Quotation Expense
// ============================================================================

export function mapQuotationExpenseRowToDomain(row: Tables<'quotation_expenses'>): QuotationExpense {
  return {
    id: row.id,
    quotationId: row.quotation_id,
    category: row.category,
    description: row.description ?? undefined,
    costType: row.cost_type,
    unitCost: row.unit_cost ?? undefined,
    personCount: row.person_count ?? undefined,
    totalCost: row.total_cost,
    splitType: row.split_type,
    createdAt: row.created_at,
  };
}

// A total cost has no per-person price or people.
export function mapQuotationExpenseToRow(data: QuotationExpenseFormData): TablesInsert<'quotation_expenses'> {
  const perPerson = data.costType === 'per_person';
  return {
    quotation_id: data.quotationId,
    category: data.category,
    description: data.description || null,
    cost_type: data.costType,
    unit_cost: perPerson ? data.unitCost ?? null : null,
    person_count: perPerson ? data.personCount ?? null : null,
    total_cost: data.totalCost,
    split_type: data.splitType,
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
    pricePerNight: row.price_per_night,
    maxOccupancy: row.max_occupancy,
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
    coordinator_ids: (data.coordinatorIds ?? []) as unknown as NonNullable<import('~/types/database.types').Json>,
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
    maxOccupancy: row.max_occupancy ?? undefined,
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
    max_occupancy: data.maxOccupancy ?? null,
  };
}

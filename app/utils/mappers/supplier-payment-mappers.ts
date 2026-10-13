import type { Tables } from '~/types/database.types';
import type {
  AccommodationPayment,
  AccommodationPaymentFormData,
  BusPayment,
  BusPaymentFormData,
  ProviderPayment,
  ProviderPaymentFormData,
} from '~/types/quotation';

// ============================================================================
// Provider payments
// ============================================================================

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
// Accommodation payments
// ============================================================================

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
// Bus payments
// ============================================================================

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

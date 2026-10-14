import type { Tables } from '~/types/database.types';
import type {
  AccommodationPayment,
  AccommodationPaymentFormData,
  BusPayment,
  BusPaymentFormData,
  ProviderPayment,
  ProviderPaymentFormData,
  SupplierPayment,
  SupplierPaymentFields,
} from '~/types/quotation';

// ============================================================================
// Shared by provider, accommodation and bus payments
// ============================================================================

type SupplierPaymentRow = Pick<Tables<'bus_payments'>, 'id' | 'amount' | 'payment_date' | 'payment_type' | 'concept' | 'notes' | 'created_at'>;
type SupplierPaymentWriteRow = Pick<SupplierPaymentRow, 'amount' | 'payment_date' | 'payment_type' | 'concept' | 'notes'>;

function mapSupplierPaymentRowFields(row: SupplierPaymentRow): SupplierPayment {
  return {
    id: row.id,
    amount: row.amount,
    paymentDate: row.payment_date,
    paymentType: row.payment_type,
    concept: row.concept ?? undefined,
    notes: row.notes ?? undefined,
    createdAt: row.created_at,
  };
}

function mapSupplierPaymentFieldsToRow(data: SupplierPaymentFields): SupplierPaymentWriteRow {
  return {
    amount: data.amount,
    payment_date: data.paymentDate,
    payment_type: data.paymentType,
    concept: data.concept ?? null,
    notes: data.notes ?? null,
  };
}

export function mapSupplierPaymentToUpdate(data: Partial<SupplierPaymentFields>): Partial<SupplierPaymentWriteRow> {
  const update: Partial<SupplierPaymentWriteRow> = {};
  if (data.amount !== undefined)
    update.amount = data.amount;
  if (data.paymentDate !== undefined)
    update.payment_date = data.paymentDate;
  if (data.paymentType !== undefined)
    update.payment_type = data.paymentType;
  if (data.concept !== undefined)
    update.concept = data.concept;
  if (data.notes !== undefined)
    update.notes = data.notes;
  return update;
}

// ============================================================================
// Provider payments
// ============================================================================

export function mapProviderPaymentRowToDomain(row: Tables<'provider_payments'>): ProviderPayment {
  return {
    ...mapSupplierPaymentRowFields(row),
    quotationProviderId: row.quotation_provider_id,
  };
}

export function mapProviderPaymentToInsert(data: ProviderPaymentFormData): Omit<Tables<'provider_payments'>, 'id' | 'created_at'> {
  return {
    ...mapSupplierPaymentFieldsToRow(data),
    quotation_provider_id: data.quotationProviderId,
  };
}

// ============================================================================
// Accommodation payments
// ============================================================================

export function mapAccommodationPaymentRowToDomain(row: Tables<'accommodation_payments'>): AccommodationPayment {
  return {
    ...mapSupplierPaymentRowFields(row),
    quotationAccommodationId: row.quotation_accommodation_id,
  };
}

export function mapAccommodationPaymentToInsert(data: AccommodationPaymentFormData): Omit<Tables<'accommodation_payments'>, 'id' | 'created_at'> {
  return {
    ...mapSupplierPaymentFieldsToRow(data),
    quotation_accommodation_id: data.quotationAccommodationId,
  };
}

// ============================================================================
// Bus payments
// ============================================================================

export function mapBusPaymentRowToDomain(row: Tables<'bus_payments'>): BusPayment {
  return {
    ...mapSupplierPaymentRowFields(row),
    quotationBusId: row.quotation_bus_id,
  };
}

export function mapBusPaymentToInsert(data: BusPaymentFormData): Omit<Tables<'bus_payments'>, 'id' | 'created_at'> {
  return {
    ...mapSupplierPaymentFieldsToRow(data),
    quotation_bus_id: data.quotationBusId,
  };
}

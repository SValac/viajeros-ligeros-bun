import type { Json, Tables, TablesInsert } from '~/types/database.types';
import type { AdjustmentItem, Payment, PaymentFormData, TravelerAccountConfig } from '~/types/payment';

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
    discounts: config.discounts as unknown as NonNullable<Json>,
    surcharges: config.surcharges as unknown as NonNullable<Json>,
    public_price_id: config.publicPriceId ?? null,
    public_price_amount: config.publicPriceAmount ?? null,
  };
}

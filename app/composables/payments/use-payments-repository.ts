import type { TablesUpdate } from '~/types/database.types';
import type { Payment, PaymentFormData, PaymentUpdateData, TravelerAccountConfig } from '~/types/payment';

/**
 * Data access layer for the `payments` and `traveler_account_configs` tables.
 * Each function performs a single Supabase operation and either returns domain data
 * or throws — it never touches reactive state. Cache management is the store's responsibility.
 * @returns Object with all repository methods
 */
export function usePaymentsRepository() {
  const supabase = useSupabase();

  /**
   * Fetches all payments for a travel ordered by payment date descending.
   * @param travelId - UUID of the travel to fetch payments for
   * @returns Payments belonging to the given travel
   * @throws {PostgrestError} on Supabase failure
   */
  async function fetchPaymentsByTravel(travelId: string): Promise<Payment[]> {
    const { data, error } = await supabase
      .from('payments')
      .select('*')
      .eq('travel_id', travelId)
      .order('payment_date', { ascending: false });
    if (error)
      throw error;

    return data.map(mapPaymentRowToDomain);
  };

  /**
   * Fetches all payments made by a traveler ordered by payment date descending.
   * @param travelerId - UUID of the traveler to fetch payments for
   * @returns Payments belonging to the given traveler
   * @throws {PostgrestError} on Supabase failure
   */
  async function fetchPaymentsByTraveler(travelerId: string): Promise<Payment[]> {
    const { data, error } = await supabase
      .from('payments')
      .select('*')
      .eq('traveler_id', travelerId)
      .order('payment_date', { ascending: false });

    if (error)
      throw error;

    return data.map(mapPaymentRowToDomain);
  };

  /**
   * Fetches all traveler account configs for a travel.
   * @param travelId - UUID of the travel to fetch configs for
   * @returns Account configs belonging to the given travel
   * @throws {PostgrestError} on Supabase failure
   */
  async function fetchConfigsByTravel(travelId: string): Promise<TravelerAccountConfig[]> {
    const { data, error } = await supabase
      .from('traveler_account_configs')
      .select('*')
      .eq('travel_id', travelId);

    if (error)
      throw error;

    return data.map(mapTravelerAccountConfigRowToDomain);
  };

  /**
   * Fetches all traveler account configs for a traveler across all travels.
   * @param travelerId - UUID of the traveler to fetch configs for
   * @returns Account configs belonging to the given traveler
   * @throws {PostgrestError} on Supabase failure
   */
  async function fetchConfigsByTraveler(travelerId: string): Promise<TravelerAccountConfig[]> {
    const { data, error } = await supabase
      .from('traveler_account_configs')
      .select('*')
      .eq('traveler_id', travelerId);

    if (error)
      throw error;

    return data.map(mapTravelerAccountConfigRowToDomain);
  };

  /**
   * Inserts a new payment record.
   * @param data - Form data for the new payment
   * @returns The created payment mapped to a domain object
   * @throws {PostgrestError} on Supabase failure
   */
  async function insertPayment(data: PaymentFormData): Promise<Payment> {
    const { data: row, error } = await supabase
      .from('payments')
      .insert(mapPaymentToInsert(data))
      .select()
      .single();

    if (error)
      throw error;

    return mapPaymentRowToDomain(row);
  };

  /**
   * Updates an existing payment. Only fields present in `data` are sent to Supabase
   * (camelCase keys are translated to snake_case here, not in the store).
   * @param id - UUID of the payment to update
   * @param data - Partial update data; omitted fields are left unchanged
   * @returns The updated payment mapped to a domain object
   * @throws {PostgrestError} on Supabase failure
   */
  async function updatePayment(id: string, data: PaymentUpdateData): Promise<Payment> {
    const update: TablesUpdate<'payments'> = {};
    if (data.amount !== undefined)
      update.amount = data.amount;
    if (data.paymentDate !== undefined)
      update.payment_date = data.paymentDate;
    if (data.paymentType !== undefined)
      update.payment_type = data.paymentType;
    if (data.notes !== undefined)
      update.notes = data.notes ?? null;

    const { data: row, error } = await supabase
      .from('payments')
      .update(update)
      .eq('id', id)
      .select()
      .single();

    if (error)
      throw error;

    return mapPaymentRowToDomain(row);
  };

  /**
   * Deletes a payment record by ID.
   * @param id - UUID of the payment to delete
   * @throws {PostgrestError} on Supabase failure
   */
  async function removePayment(id: string): Promise<void> {
    const { error } = await supabase
      .from('payments')
      .delete()
      .eq('id', id);

    if (error)
      throw error;
  };

  /**
   * Upserts a traveler account config using the composite PK `travel_id,traveler_id`.
   * Creates the record if it does not exist, or replaces it if it does.
   * @param config - The account config to upsert
   * @throws {PostgrestError} on Supabase failure
   */
  async function upsertAccountConfig(config: TravelerAccountConfig): Promise<void> {
    const { error } = await supabase
      .from('traveler_account_configs')
      .upsert(mapTravelerAccountConfigToUpsert(config), { onConflict: 'travel_id,traveler_id' });

    if (error)
      throw error;
  };

  return {
    fetchPaymentsByTravel,
    fetchPaymentsByTraveler,
    fetchConfigsByTravel,
    fetchConfigsByTraveler,
    insertPayment,
    updatePayment,
    removePayment,
    upsertAccountConfig,
  };
}

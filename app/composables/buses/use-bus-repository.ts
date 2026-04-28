import type { Bus, BusFormData, BusUpdateData } from '~/types/bus';
import type { TablesUpdate } from '~/types/database.types';

/**
 * Data access layer for the `buses` table.
 * Each function performs a single Supabase operation and either returns domain data
 * or throws — it never touches reactive state. Cache management is the store's responsibility.
 * @returns Object with all repository methods
 */
export function useBusRepository() {
  const supabase = useSupabase();

  /**
   * Fetches all buses ordered by creation date ascending.
   * @returns All bus records mapped to domain objects
   * @throws {PostgrestError} on Supabase failure
   */
  async function fetchAll(): Promise<Bus[]> {
    const { data, error } = await supabase
      .from('buses')
      .select('*')
      .order('created_at');
    if (error)
      throw error;

    return data.map(mapBusRowToDomain);
  };
  /**
   * Inserts a new bus record.
   * @param data - Form data for the new bus
   * @returns The created bus mapped to a domain object
   * @throws {PostgrestError} on Supabase failure
   */
  async function insert(data: BusFormData): Promise<Bus> {
    const { data: row, error } = await supabase
      .from('buses')
      .insert(mapBusToInsert(data))
      .select()
      .single();

    if (error)
      throw error;

    return mapBusRowToDomain(row);
  };
  /**
   * Updates an existing bus. Only fields present in `data` are sent to Supabase
   * (camelCase keys are translated to snake_case here, not in the store).
   * @param id - UUID of the bus to update
   * @param data - Partial update data; omitted fields are left unchanged
   * @returns The updated bus mapped to a domain object
   * @throws {PostgrestError} on Supabase failure
   */
  async function update(id: string, data: Partial<BusUpdateData>): Promise<Bus> {
    const update: TablesUpdate<'buses'> = {};
    if (data.providerId !== undefined)
      update.provider_id = data.providerId;
    if (data.active !== undefined)
      update.active = data.active;
    if (data.seatCount !== undefined)
      update.seat_count = data.seatCount;
    if (data.rentalPrice !== undefined)
      update.rental_price = data.rentalPrice;
    if ('brand' in data)
      update.brand = data.brand ?? null;
    if ('model' in data)
      update.model = data.model ?? null;
    if ('year' in data)
      update.year = data.year ?? null;

    const { data: row, error } = await supabase
      .from('buses')
      .update(update)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      throw error;
    }
    return mapBusRowToDomain(row);
  };
  /**
   * Deletes a bus record by ID.
   * @param id - UUID of the bus to delete
   * @throws {PostgrestError} on Supabase failure
   */
  async function remove(id: string): Promise<void> {
    const { error } = await supabase
      .from('buses')
      .delete()
      .eq('id', id);

    if (error) {
      throw error;
    }
  };

  return { fetchAll, insert, update, remove };
}

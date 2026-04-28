import type { Coordinator, CoordinatorFormData, CoordinatorUpdateData } from '~/types/coordinator';
import type { TablesUpdate } from '~/types/database.types';

/**
 * Data access layer for the `coordinators` table.
 * Each function performs a single Supabase operation and either returns domain data
 * or throws — it never touches reactive state. Cache management is the store's responsibility.
 * @returns Object with all repository methods
 */
export function useCoordinatorRepository() {
  const supabase = useSupabase();

  /**
   * Fetches all coordinators ordered by creation date descending.
   * @returns All coordinator records mapped to domain objects
   * @throws {PostgrestError} on Supabase failure
   */
  async function fetchAll(): Promise<Coordinator[]> {
    const { data, error } = await supabase
      .from('coordinators')
      .select('*')
      .order('created_at', { ascending: false });
    if (error)
      throw error;

    return data.map(mapCoordinatorRowToDomain);
  };
  /**
   * Inserts a new coordinator record.
   * @param data - Form data for the new coordinator
   * @returns The created coordinator mapped to a domain object
   * @throws {PostgrestError} on Supabase failure
   */
  async function insert(data: CoordinatorFormData): Promise<Coordinator> {
    const { data: row, error } = await supabase
      .from('coordinators')
      .insert(mapCoordinatorToInsert(data))
      .select()
      .single();
    if (error) {
      throw error;
    }
    return mapCoordinatorRowToDomain(row);
  };

  /**
   * Updates an existing coordinator. Only fields present in `data` are sent to Supabase
   * (camelCase keys are translated to snake_case here, not in the store).
   * @param id - UUID of the coordinator to update
   * @param data - Partial update data; omitted fields are left unchanged
   * @returns The updated coordinator mapped to a domain object
   * @throws {PostgrestError} on Supabase failure
   */
  async function update(id: string, data: CoordinatorUpdateData): Promise<Coordinator> {
    const update: TablesUpdate<'coordinators'> = {};
    if (data.name !== undefined)
      update.name = data.name;
    if (data.age !== undefined)
      update.age = data.age;
    if (data.phone !== undefined)
      update.phone = data.phone;
    if (data.email !== undefined)
      update.email = data.email;
    if ('notes' in data)
      update.notes = data.notes ?? null;

    const { data: row, error } = await supabase
      .from('coordinators')
      .update(update)
      .eq('id', id)
      .select()
      .single();

    if (error)
      throw error;

    return mapCoordinatorRowToDomain(row);
  };
  /**
   * Deletes a coordinator record by ID.
   * @param id - UUID of the coordinator to delete
   * @throws {PostgrestError} on Supabase failure
   */
  async function remove(id: string): Promise<void> {
    const { error } = await supabase
      .from('coordinators')
      .delete()
      .eq('id', id);

    if (error)
      throw error;
  };

  return { fetchAll, insert, update, remove };
}

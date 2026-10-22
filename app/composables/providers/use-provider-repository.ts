import type { TablesUpdate } from '~/types/database.types';
import type { Provider, ProviderFormData, ProviderUpdateData } from '~/types/provider';

import { deleteById } from '~/utils/delete-by-id';
import { mapProviderContactToRow, mapProviderLocationToRow } from '~/utils/mappers/provider-mappers';

/**
 * Data access layer for the `providers` table.
 * Each function performs a single Supabase operation and either returns domain data
 * or throws — it never touches reactive state. Cache management is the store's
  responsibility.
 */
export function useProviderRepository() {
  const supabase = useSupabase();
  const authStore = useAuthStore();

  /**
   * Fetches all providers ordered by name.
   * @returns All provider records mapped to domain objects
   * @throws {PostgrestError} on Supabase failure
   */
  async function fetchAll(): Promise<Provider[]> {
    const { data, error: err } = await supabase
      .from('providers')
      .select('*')
      .order('name');
    if (err)
      throw err;

    return data.map(mapProviderRowToDomain);
  };
  /**
   * Inserts a new provider.
   * @param data The provider data to insert
   * @returns The inserted provider mapped to a domain object
   * @throws {PostgrestError} on Supabase failure
   */
  async function insert(data: ProviderFormData): Promise<Provider> {
    const { data: row, error } = await supabase
      .from('providers')
      .insert({ ...mapProviderToInsert(data), owner_id: authStore.user!.id })
      .select()
      .single();

    if (error)
      throw error;

    return mapProviderRowToDomain(row);
  };

  /**
   * Updates an existing provider.
   * @param id The ID of the provider to update
   * @param data The provider data to update
   * @returns The updated provider mapped to a domain object
   * @throws {PostgrestError} on Supabase failure
   */
  async function update(id: string, data: Partial<ProviderUpdateData>): Promise<Provider> {
    const update: TablesUpdate<'providers'> = {};
    if (data.name !== undefined)
      update.name = data.name;
    if (data.category !== undefined)
      update.category = data.category;
    if (data.active !== undefined)
      update.active = data.active;
    if ('description' in data)
      update.description = data.description ?? null;
    if (data.location)
      Object.assign(update, mapProviderLocationToRow(data.location));
    if (data.contact)
      Object.assign(update, mapProviderContactToRow(data.contact));

    const { data: row, error } = await supabase
      .from('providers')
      .update(update)
      .eq('id', id)
      .select()
      .single();

    if (error)
      throw error;

    return mapProviderRowToDomain(row);
  };
  /**
   * Deletes a provider.
   * @param id The ID of the provider to delete
   * @throws {PostgrestError} on Supabase failure
   */
  async function remove(id: string): Promise<void> {
    await deleteById(supabase, 'providers', id);
  };

  return { fetchAll, insert, update, remove };
}

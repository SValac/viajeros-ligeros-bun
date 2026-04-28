import type { TablesUpdate } from '~/types/database.types';
import type { Provider, ProviderFormData, ProviderUpdateData } from '~/types/provider';

export function useProviderRepository() {
  const supabase = useSupabase();

  async function fetchAll(): Promise<Provider[]> {
    const { data, error: err } = await supabase
      .from('providers')
      .select('*')
      .order('name');
    if (err)
      throw err;

    return data.map(mapProviderRowToDomain);
  };
  async function insert(data: ProviderFormData): Promise<Provider> {
    const { data: row, error } = await supabase
      .from('providers')
      .insert(mapProviderToInsert(data))
      .select()
      .single();

    if (error)
      throw error;

    return mapProviderRowToDomain(row);
  };
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
    if (data.location) {
      update.location_city = data.location.city;
      update.location_state = data.location.state;
      update.location_country = data.location.country;
    }
    if (data.contact) {
      update.contact_name = data.contact.name ?? null;
      update.contact_phone = data.contact.phone ?? null;
      update.contact_email = data.contact.email ?? null;
      update.contact_notes = data.contact.notes ?? null;
    }

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
  async function remove(id: string): Promise<void> {
    const { error } = await supabase
      .from('providers')
      .delete()
      .eq('id', id);

    if (error)
      throw error;
  };

  return { fetchAll, insert, update, remove };
}

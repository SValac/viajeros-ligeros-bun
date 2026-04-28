import type { Coordinator, CoordinatorFormData, CoordinatorUpdateData } from '~/types/coordinator';
import type { TablesUpdate } from '~/types/database.types';

export function useCoordinatorRepository() {
  const supabase = useSupabase();

  async function fetchAll(): Promise<Coordinator[]> {
    const { data, error } = await supabase
      .from('coordinators')
      .select('*')
      .order('created_at', { ascending: false });
    if (error)
      throw error;

    return data.map(mapCoordinatorRowToDomain);
  };
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

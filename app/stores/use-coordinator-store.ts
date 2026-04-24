import type { Coordinator, CoordinatorFormData, CoordinatorUpdateData } from '~/types/coordinator';
import type { TablesUpdate } from '~/types/database.types';

import { mapCoordinatorRowToDomain, mapCoordinatorToInsert } from '~/utils/mappers';

export const useCoordinatorStore = defineStore('useCoordinatorStore', () => {
  const supabase = useSupabase();

  // State
  const coordinators = ref<Coordinator[]>([]);
  const loading = shallowRef(false);
  const error = shallowRef<string | null>(null);

  // Getters
  const allCoordinators = computed((): Coordinator[] => {
    return [...coordinators.value].sort((a, b) =>
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
  });

  const getCoordinatorById = computed(() => {
    return (id: string): Coordinator | undefined => {
      return coordinators.value.find(c => c.id === id);
    };
  });

  // Actions
  async function fetchAll(): Promise<void> {
    loading.value = true;
    error.value = null;
    try {
      const { data, error: err } = await supabase
        .from('coordinators')
        .select('*')
        .order('created_at', { ascending: false });
      if (err)
        throw err;
      coordinators.value = data.map(mapCoordinatorRowToDomain);
    }
    catch (e) {
      error.value = e instanceof Error ? e.message : 'Error al cargar coordinadores';
    }
    finally {
      loading.value = false;
    }
  }

  async function addCoordinator(data: CoordinatorFormData): Promise<Coordinator> {
    const { data: row, error: err } = await supabase
      .from('coordinators')
      .insert(mapCoordinatorToInsert(data))
      .select()
      .single();

    if (err) {
      error.value = err.message;
      throw err;
    }

    const coordinator = mapCoordinatorRowToDomain(row);
    coordinators.value.push(coordinator);
    error.value = null;
    return coordinator;
  }

  async function updateCoordinator(id: string, data: CoordinatorUpdateData): Promise<Coordinator | undefined> {
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

    const { data: row, error: err } = await supabase
      .from('coordinators')
      .update(update)
      .eq('id', id)
      .select()
      .single();

    if (err) {
      error.value = err.message;
      return undefined;
    }

    const coordinator = mapCoordinatorRowToDomain(row);
    const index = coordinators.value.findIndex(c => c.id === id);
    if (index !== -1) {
      coordinators.value[index] = coordinator;
    }
    error.value = null;
    return coordinator;
  }

  async function deleteCoordinator(id: string): Promise<void> {
    const { error: err } = await supabase
      .from('coordinators')
      .delete()
      .eq('id', id);

    if (err) {
      error.value = err.message;
      return;
    }

    coordinators.value = coordinators.value.filter(c => c.id !== id);
    error.value = null;
  }

  return {
    // State
    coordinators,
    loading,
    error,
    // Getters
    allCoordinators,
    getCoordinatorById,
    // Actions
    fetchAll,
    addCoordinator,
    updateCoordinator,
    deleteCoordinator,
  };
});

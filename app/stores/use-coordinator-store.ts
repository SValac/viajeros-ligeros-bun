import type { Coordinator, CoordinatorFormData, CoordinatorUpdateData } from '~/types/coordinator';

import { useCoordinatorRepository } from '~/composables/coordinators/use-coordinator-repository';

export const useCoordinatorStore = defineStore('useCoordinatorStore', () => {
  const repository = useCoordinatorRepository();

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
      coordinators.value = await repository.fetchAll();
    }
    catch (e) {
      error.value = e instanceof Error ? e.message : 'Error al cargar coordinadores';
    }
    finally {
      loading.value = false;
    }
  }

  async function addCoordinator(data: CoordinatorFormData): Promise<Coordinator> {
    loading.value = true;
    error.value = null;
    try {
      const coordinator = await repository.insert(data);
      coordinators.value.push(coordinator);
      return coordinator;
    }
    catch (e) {
      error.value = e instanceof Error ? e.message : 'Error al agregar coordinador';
      throw e;
    }
    finally {
      loading.value = false;
    }
  }

  async function updateCoordinator(id: string, data: CoordinatorUpdateData): Promise<Coordinator | undefined> {
    loading.value = true;
    error.value = null;
    try {
      const coordinator = await repository.update(id, data);
      const index = coordinators.value.findIndex(c => c.id === id);
      if (index !== -1) {
        coordinators.value[index] = coordinator;
      }
      return coordinator;
    }
    catch (e) {
      error.value = e instanceof Error ? e.message : 'Error al actualizar coordinador';
      return undefined;
    }
    finally {
      loading.value = false;
    }
  }

  async function deleteCoordinator(id: string): Promise<void> {
    loading.value = true;
    error.value = null;
    try {
      await repository.remove(id);
      coordinators.value = coordinators.value.filter(c => c.id !== id);
    }
    catch (e) {
      error.value = e instanceof Error ? e.message : 'Error al eliminar coordinador';
    }
    finally {
      loading.value = false;
    }
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

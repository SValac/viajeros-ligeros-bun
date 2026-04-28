import type { Coordinator, CoordinatorFormData, CoordinatorUpdateData } from '~/types/coordinator';

import { useCoordinatorRepository } from '~/composables/coordinators/use-coordinator-repository';

/**
 * Global cache and orchestrator for coordinator data.
 * Delegates all Supabase I/O to `useCoordinatorRepository`.
 * Owns the reactive `coordinators` array — no other layer mutates it.
 * @returns Store state, getters and actions
 */
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
  /**
   * Loads all coordinators from the repository into the cache.
   * Errors are stored in `error` state — they do not propagate to the caller.
   */
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

  /**
   * Creates a new coordinator and appends it to the cache.
   * @param data - Form data for the new coordinator
   * @returns The created coordinator
   * @throws Re-throws repository errors so the caller can react (e.g. show a toast)
   */
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

  /**
   * Updates a coordinator and patches the cache entry by index for minimal re-renders.
   * @param id - UUID of the coordinator to update
   * @param data - Partial update data
   * @returns The updated coordinator, or `undefined` on failure (error is stored in `error` state)
   */
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

  /**
   * Removes a coordinator from the repository and from the cache.
   * @param id - UUID of the coordinator to delete
   */
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

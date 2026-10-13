import type { Coordinator, CoordinatorFormData, CoordinatorUpdateData } from '~/types/coordinator';

import { toCoordinatorInviteError } from '~/composables/coordinators/use-coordinator-domain';
import { useCoordinatorRepository } from '~/composables/coordinators/use-coordinator-repository';
import { coordinatorsCatalogQuery, useCatalogState, useCoordinatorsCatalog } from '~/queries/catalogs';

/**
 * Coordinator catalog and its writes.
 * `coordinators` reads its catalog query (`useCoordinatorsCatalog`, through `useCatalogState`); writes go through `useCoordinatorRepository`
 * and then refetch it.
 * @returns Store state, getters and actions
 */
export const useCoordinatorStore = defineStore('useCoordinatorStore', () => {
  const repository = useCoordinatorRepository();
  const catalog = useCatalogState(useCoordinatorsCatalog, coordinatorsCatalogQuery);

  // State (writes only; the catalog's load state comes from `catalog`)
  const loading = shallowRef(false);
  const error = shallowRef<string | null>(null);

  // Getters
  const coordinators = catalog.items;

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
   * Creates a new coordinator.
   * @param data - Form data for the new coordinator
   * @returns The created coordinator
   * @throws Re-throws repository errors so the caller can react (e.g. show a toast)
   */
  async function addCoordinator(data: CoordinatorFormData): Promise<Coordinator> {
    loading.value = true;
    error.value = null;
    try {
      const coordinator = await repository.insert(data);
      await catalog.refresh();
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
   * Updates a coordinator.
   * @param id - UUID of the coordinator to update
   * @param data - Partial update data
   * @returns The updated coordinator, or `undefined` on failure (error is stored in `error` state)
   */
  async function updateCoordinator(id: string, data: CoordinatorUpdateData): Promise<Coordinator | undefined> {
    loading.value = true;
    error.value = null;
    try {
      const coordinator = await repository.update(id, data);
      await catalog.refresh();
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
   * Deletes a coordinator.
   * @param id - UUID of the coordinator to delete
   */
  async function deleteCoordinator(id: string): Promise<void> {
    loading.value = true;
    error.value = null;
    try {
      await repository.remove(id);
      await catalog.refresh();
    }
    catch (e) {
      error.value = e instanceof Error ? e.message : 'Error al eliminar coordinador';
    }
    finally {
      loading.value = false;
    }
  }

  async function inviteCoordinator(id: string): Promise<void> {
    loading.value = true;
    error.value = null;
    try {
      await repository.invite(id);
      await catalog.refresh();
    }
    catch (e) {
      const domainError = toCoordinatorInviteError(e);
      error.value = domainError.message;
      throw domainError;
    }
    finally {
      loading.value = false;
    }
  }

  async function revokeCoordinatorAccess(id: string): Promise<void> {
    loading.value = true;
    error.value = null;
    try {
      await repository.revokeAccess(id);
      await catalog.refresh();
    }
    catch (e) {
      const domainError = toCoordinatorInviteError(e);
      error.value = domainError.message;
      throw domainError;
    }
    finally {
      loading.value = false;
    }
  }

  return {
    // State
    loading,
    error,
    // Getters
    coordinators,
    isLoaded: catalog.isLoaded,
    loadError: catalog.loadError,
    allCoordinators,
    getCoordinatorById,
    // Actions
    refetch: catalog.refetch,
    addCoordinator,
    updateCoordinator,
    inviteCoordinator,
    revokeCoordinatorAccess,
    deleteCoordinator,
  };
});

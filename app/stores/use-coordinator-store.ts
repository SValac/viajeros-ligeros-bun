import type { Coordinator, CoordinatorFormData, CoordinatorUpdateData } from '~/types/coordinator';

import { toCoordinatorInviteError } from '~/composables/coordinators/use-coordinator-domain';
import { useCoordinatorRepository } from '~/composables/coordinators/use-coordinator-repository';
import { catalogKeys, useCoordinatorsCatalog } from '~/queries/catalogs';

/**
 * Coordinator catalog and its writes.
 * `coordinators` reads the catalog query (`useCoordinatorsCatalog`); writes go through `useCoordinatorRepository`
 * and then refetch it.
 * @returns Store state, getters and actions
 */
export const useCoordinatorStore = defineStore('useCoordinatorStore', () => {
  const repository = useCoordinatorRepository();
  const queryCache = useQueryCache();
  // A defined query, not `useQuery`: inside a store, `useQuery` would bind to the component that
  // happened to create the store and go inactive when it unmounts. Here the query stays active
  // while the store lives, so writes refetch it from any screen.
  const query = useCoordinatorsCatalog();

  // State (writes only; the catalog's own load state comes from the query)
  const loading = shallowRef(false);
  const error = shallowRef<string | null>(null);

  // Getters
  const coordinators = computed(() => query.data.value ?? []);
  /** `false` until the first load resolves: an empty `coordinators` before that is not "no coordinators". */
  const isLoaded = computed(() => query.data.value !== undefined);
  const loadError = computed(() => query.error.value);

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
  /** Retries the catalog load (e.g. from an error state's "Reintentar"). */
  function refetch() {
    return query.refetch();
  }

  /**
   * Refetches the catalog after a write, so the action resolves with fresh data.
   * A failed refetch keeps the previous data: the write itself succeeded.
   */
  async function refreshCatalog(): Promise<void> {
    await queryCache.invalidateQueries({ key: catalogKeys.coordinators }).catch(() => {});
  }

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
      await refreshCatalog();
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
      await refreshCatalog();
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
      await refreshCatalog();
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
      await refreshCatalog();
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
      await refreshCatalog();
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
    isLoaded,
    loadError,
    allCoordinators,
    getCoordinatorById,
    // Actions
    refetch,
    addCoordinator,
    updateCoordinator,
    inviteCoordinator,
    revokeCoordinatorAccess,
    deleteCoordinator,
  };
});

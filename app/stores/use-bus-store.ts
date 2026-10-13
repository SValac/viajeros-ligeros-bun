import { defineStore } from 'pinia';

import type { Bus, BusFormData, BusUpdateData } from '~/types/bus';

import { useBusRepository } from '~/composables/buses/use-bus-repository';
import { catalogKeys, useBusesCatalog } from '~/queries/catalogs';

/**
 * Bus catalog and its writes.
 * `buses` reads the catalog query (`useBusesCatalog`); writes go through `useBusRepository`
 * and then refetch it.
 * @returns Store state, getters and actions
 */
export const useBusStore = defineStore('buses', () => {
  const repository = useBusRepository();
  const queryCache = useQueryCache();
  // A defined query, not `useQuery`: inside a store, `useQuery` would bind to the component that
  // happened to create the store and go inactive when it unmounts. Here the query stays active
  // while the store lives, so writes refetch it from any screen.
  const query = useBusesCatalog();

  // State (writes only; the catalog's own load state comes from the query)
  const loading = shallowRef(false);
  const error = shallowRef<string | null>(null);

  // Getters
  const buses = computed(() => query.data.value ?? []);
  /** `false` until the first load resolves: an empty `buses` before that is not "no buses". */
  const isLoaded = computed(() => query.data.value !== undefined);
  const loadError = computed(() => query.error.value);

  const activeBuses = computed(() => buses.value.filter(b => b.active));

  const getBusById = computed(() => {
    return (id: string): Bus | undefined => buses.value.find(b => b.id === id);
  });

  // Pre-computes the map so the returned function just does a lookup (preserves caching)
  const getBusesByProvider = computed(() => {
    const map = new Map<string, Bus[]>();
    buses.value.filter(b => b.active).forEach((b) => {
      const list = map.get(b.providerId) ?? [];
      list.push(b);
      map.set(b.providerId, list);
    });
    return (providerId: string): Bus[] => map.get(providerId) ?? [];
  });

  const totalBuses = computed(() => buses.value.filter(b => b.active).length);

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
    await queryCache.invalidateQueries({ key: catalogKeys.buses }).catch(() => {});
  }

  /**
   * Creates a new bus.
   * @param data - Form data for the new bus
   * @returns The created bus
   * @throws Re-throws repository errors so the caller can react (e.g. show a toast)
   */
  async function addBus(data: BusFormData): Promise<Bus> {
    loading.value = true;
    error.value = null;
    try {
      const bus = await repository.insert(data);
      await refreshCatalog();
      return bus;
    }
    catch (e) {
      error.value = e instanceof Error ? e.message : 'Error al crear autobús';
      throw e;
    }
    finally {
      loading.value = false;
    }
  }

  /**
   * Updates a bus.
   * @param id - UUID of the bus to update
   * @param data - Partial update data
   * @returns `true` on success, `false` on failure (error is stored in `error` state)
   */
  async function updateBus(id: string, data: Partial<BusUpdateData>): Promise<boolean> {
    loading.value = true;
    error.value = null;
    try {
      await repository.update(id, data);
      await refreshCatalog();
      return true;
    }
    catch (e) {
      error.value = e instanceof Error ? e.message : 'Error al actualizar autobús';
      return false;
    }
    finally {
      loading.value = false;
    }
  }

  /**
   * Deletes a bus.
   * @param id - UUID of the bus to delete
   * @returns `true` on success, `false` on failure (error is stored in `error` state)
   */
  async function deleteBus(id: string): Promise<boolean> {
    loading.value = true;
    error.value = null;
    try {
      await repository.remove(id);
      await refreshCatalog();
      return true;
    }
    catch (e) {
      error.value = e instanceof Error ? e.message : 'Error al eliminar autobús';
      return false;
    }
    finally {
      loading.value = false;
    }
  }

  /**
   * Toggles the `active` flag of a bus.
   * @param id - UUID of the bus to toggle
   * @returns `true` on success, `false` if the bus is not found or on repository failure
   */
  async function toggleBusStatus(id: string): Promise<boolean> {
    const bus = getBusById.value(id);
    if (!bus) {
      error.value = 'Autobús no encontrado';
      return false;
    }
    return updateBus(id, { active: !bus.active });
  }

  return {
    // State
    loading,
    error,
    // Getters
    buses,
    isLoaded,
    loadError,
    activeBuses,
    getBusById,
    getBusesByProvider,
    totalBuses,
    // Actions
    refetch,
    addBus,
    updateBus,
    deleteBus,
    toggleBusStatus,
  };
});

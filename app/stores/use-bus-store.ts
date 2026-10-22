import { defineStore } from 'pinia';

import type { Bus, BusFormData, BusUpdateData } from '~/types/bus';

import { useBusRepository } from '~/composables/buses/use-bus-repository';
import { busesCatalogQuery, useBusesCatalog, useCatalogState } from '~/queries/catalogs';
import { toErrorMessage } from '~/utils/error-message';

/**
 * Bus catalog and its writes.
 * `buses` reads its catalog query (`useBusesCatalog`, through `useCatalogState`); writes go through `useBusRepository`
 * and then refetch it.
 * @returns Store state, getters and actions
 */
export const useBusStore = defineStore('buses', () => {
  const repository = useBusRepository();
  const catalog = useCatalogState(useBusesCatalog, busesCatalogQuery);

  // State (writes only; the catalog's load state comes from `catalog`)
  const loading = shallowRef(false);
  const error = shallowRef<string | null>(null);

  // Getters
  const buses = catalog.items;

  const activeBuses = computed(() => buses.value.filter(b => b.active));

  const getBusById = computed(() => {
    return (id: string): Bus | undefined => buses.value.find(b => b.id === id);
  });

  // Pre-computes the map so the returned function just does a lookup (preserves caching)
  const getAllBusesByProvider = computed(() => {
    const map = new Map<string, Bus[]>();
    buses.value.forEach((b) => {
      const list = map.get(b.providerId) ?? [];
      list.push(b);
      map.set(b.providerId, list);
    });
    return (providerId: string): Bus[] => map.get(providerId) ?? [];
  });

  const getActiveBusesByProvider = computed(() => {
    return (providerId: string): Bus[] => getAllBusesByProvider.value(providerId).filter(bus => bus.active);
  });

  const totalBuses = computed(() => buses.value.filter(b => b.active).length);

  // Actions
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
      await catalog.refresh();
      return bus;
    }
    catch (e) {
      error.value = toErrorMessage(e, 'Error al crear autobús');
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
   * @throws Re-throws repository errors so the caller can react (e.g. show a toast)
   */
  async function updateBus(id: string, data: Partial<BusUpdateData>): Promise<void> {
    loading.value = true;
    error.value = null;
    try {
      await repository.update(id, data);
      await catalog.refresh();
    }
    catch (e) {
      error.value = toErrorMessage(e, 'Error al actualizar autobús');
      throw e;
    }
    finally {
      loading.value = false;
    }
  }

  /**
   * Deletes a bus.
   * @param id - UUID of the bus to delete
   * @throws Re-throws repository errors so the caller can react (e.g. show a toast)
   */
  async function deleteBus(id: string): Promise<void> {
    loading.value = true;
    error.value = null;
    try {
      await repository.remove(id);
      await catalog.refresh();
    }
    catch (e) {
      error.value = toErrorMessage(e, 'Error al eliminar autobús');
      throw e;
    }
    finally {
      loading.value = false;
    }
  }

  /**
   * Toggles the `active` flag of a bus.
   * @param id - UUID of the bus to toggle
   * @throws When the bus isn't loaded, or re-throws repository errors
   */
  async function toggleBusStatus(id: string): Promise<void> {
    const bus = getBusById.value(id);
    if (!bus) {
      error.value = 'Autobús no encontrado';
      throw new Error(error.value);
    }
    await updateBus(id, { active: !bus.active });
  }

  return {
    // State
    loading,
    error,
    // Getters
    buses,
    isLoaded: catalog.isLoaded,
    loadError: catalog.loadError,
    activeBuses,
    getBusById,
    getActiveBusesByProvider,
    getAllBusesByProvider,
    totalBuses,
    // Actions
    refetch: catalog.refetch,
    addBus,
    updateBus,
    deleteBus,
    toggleBusStatus,
  };
});

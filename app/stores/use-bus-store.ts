import { defineStore } from 'pinia';

import type { Bus, BusFormData, BusUpdateData } from '~/types/bus';

import { useBusRepository } from '~/composables/buses/use-bus-repository';

/**
 * Global cache and orchestrator for bus data.
 * Delegates all Supabase I/O to `useBusRepository`.
 * Owns the reactive `buses` array — no other layer mutates it.
 * @returns Store state, getters and actions
 */
export const useBusStore = defineStore('buses', () => {
  const repository = useBusRepository();

  // State
  const buses = ref<Bus[]>([]);
  const loading = ref(false);
  const error = ref<string | null>(null);

  // Getters
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
  /**
   * Loads all buses from the repository into the cache.
   * Errors are stored in `error` state — they do not propagate to the caller.
   */
  async function fetchAll(): Promise<void> {
    loading.value = true;
    error.value = null;
    try {
      buses.value = await repository.fetchAll();
    }
    catch (e) {
      error.value = e instanceof Error ? e.message : 'Error al cargar autobuses';
    }
    finally {
      loading.value = false;
    }
  }

  /**
   * Creates a new bus and appends it to the cache.
   * @param data - Form data for the new bus
   * @returns The created bus
   * @throws Re-throws repository errors so the caller can react (e.g. show a toast)
   */
  async function addBus(data: BusFormData): Promise<Bus> {
    loading.value = true;
    error.value = null;
    try {
      const bus = await repository.insert(data);
      buses.value.push(bus);
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
   * Updates a bus and patches the cache entry by index for minimal re-renders.
   * @param id - UUID of the bus to update
   * @param data - Partial update data
   * @returns `true` on success, `false` on failure (error is stored in `error` state)
   */
  async function updateBus(id: string, data: Partial<BusUpdateData>): Promise<boolean> {
    loading.value = true;
    error.value = null;
    try {
      const bus = await repository.update(id, data);
      const index = buses.value.findIndex(b => b.id === id);
      if (index !== -1) {
        buses.value[index] = bus;
      }
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
   * Removes a bus from the repository and from the cache.
   * @param id - UUID of the bus to delete
   * @returns `true` on success, `false` on failure (error is stored in `error` state)
   */
  async function deleteBus(id: string): Promise<boolean> {
    loading.value = true;
    error.value = null;
    try {
      await repository.remove(id);
      buses.value = buses.value.filter(b => b.id !== id);
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
    buses,
    loading,
    error,
    // Getters
    activeBuses,
    getBusById,
    getBusesByProvider,
    totalBuses,
    // Actions
    fetchAll,
    addBus,
    updateBus,
    deleteBus,
    toggleBusStatus,
  };
});

import { defineStore } from 'pinia';

import type { Provider, ProviderCategory, ProviderFilters, ProviderFormData, ProviderUpdateData } from '~/types/provider';

import { filterProviders } from '~/composables/providers/use-provider-domain';
import { useProviderRepository } from '~/composables/providers/use-provider-repository';
import { catalogKeys, useProvidersCatalog } from '~/queries/catalogs';
import { PROVIDER_CATEGORY } from '~/types/provider';

/**
 * Provider catalog, its writes and the providers list filters.
 * `providers` reads the catalog query (`useProvidersCatalog`); writes go through `useProviderRepository`
 * and then refetch it.
 * @returns Store state, getters and actions
 */
export const useProviderStore = defineStore('providers', () => {
  const repository = useProviderRepository();
  const queryCache = useQueryCache();
  // A defined query, not `useQuery`: inside a store, `useQuery` would bind to the component that
  // happened to create the store and go inactive when it unmounts. Here the query stays active
  // while the store lives, so writes refetch it from any screen.
  const query = useProvidersCatalog();

  // State (writes and filters; the catalog's own load state comes from the query)
  const loading = shallowRef(false);
  const error = shallowRef<string | null>(null);
  const activeFilters = ref<ProviderFilters>({});

  // Getters
  const providers = computed(() => query.data.value ?? []);
  /** `false` until the first load resolves: an empty `providers` before that is not "no providers". */
  const isLoaded = computed(() => query.data.value !== undefined);
  const loadError = computed(() => query.error.value);

  const allProviders = computed(() => {
    return [...providers.value].sort((a, b) =>
      a.name.localeCompare(b.name, 'es'),
    );
  });

  const activeProviders = computed(() => {
    return providers.value.filter(p => p.active);
  });

  const getProviderById = computed(() => {
    return (id: string) => providers.value.find(p => p.id === id);
  });

  const getProvidersByCategory = computed(() => {
    return (category: ProviderCategory) =>
      providers.value.filter(p => p.category === category);
  });

  const statsByCategory = computed(() => {
    const stats: Record<ProviderCategory, number> = {
      [PROVIDER_CATEGORY.GUIDES]: 0,
      [PROVIDER_CATEGORY.TRANSPORTATION]: 0,
      [PROVIDER_CATEGORY.ACCOMMODATION]: 0,
      [PROVIDER_CATEGORY.BUS_AGENCIES]: 0,
      [PROVIDER_CATEGORY.FOOD_SERVICES]: 0,
      [PROVIDER_CATEGORY.TICKETS]: 0,
      [PROVIDER_CATEGORY.OTHER]: 0,
    };

    providers.value
      .filter(p => p.active)
      .forEach(p => stats[p.category]++);

    return stats;
  });

  const totalProviders = computed(() => {
    return providers.value.filter(p => p.active).length;
  });

  const filteredProviders = computed(() => filterProviders(providers.value, activeFilters.value));

  const availableCiudades = computed(() =>
    [...new Set(providers.value.filter(p => p.active).map(p => p.location.city))].sort(),
  );

  const availableEstados = computed(() =>
    [...new Set(providers.value.filter(p => p.active).map(p => p.location.state))].sort(),
  );

  const filteredCount = computed(() => filteredProviders.value.length);

  const hasActiveFilters = computed(() =>
    Object.values(activeFilters.value).some(v => v !== undefined && v !== ''),
  );

  // Actions
  /** Retries the catalog load (e.g. from an error state's "Reintentar"). */
  function refetch() {
    return query.refetch();
  }

  /**
   * Refetches the catalog after a write, so the action resolves with fresh data (e.g. before
   * navigating to the new provider's detail). A failed refetch keeps the previous data: the
   * write itself succeeded.
   */
  async function refreshCatalog(): Promise<void> {
    await queryCache.invalidateQueries({ key: catalogKeys.providers }).catch(() => {});
  }

  async function addProvider(data: ProviderFormData): Promise<Provider> {
    loading.value = true;
    error.value = null;
    try {
      const provider = await repository.insert(data);
      await refreshCatalog();
      return provider;
    }
    catch (e) {
      error.value = e instanceof Error ? e.message : 'Error al agregar proveedor';
      throw e;
    }
    finally {
      loading.value = false;
    }
  }

  async function updateProvider(id: string, data: Partial<ProviderUpdateData>): Promise<boolean> {
    loading.value = true;
    error.value = null;
    try {
      await repository.update(id, data);
      await refreshCatalog();
      return true;
    }
    catch (e) {
      error.value = e instanceof Error ? e.message : 'Error al actualizar proveedor';
      return false;
    }
    finally {
      loading.value = false;
    }
  }

  async function deleteProvider(id: string): Promise<boolean> {
    loading.value = true;
    error.value = null;
    try {
      await repository.remove(id);
      // The DB cascades the delete to the provider's hotel_rooms/hotel_room_types.
      queryCache.invalidateQueries({ key: catalogKeys.hotelRooms }).catch(() => {});
      await refreshCatalog();
      return true;
    }
    catch (e) {
      error.value = e instanceof Error ? e.message : 'Error al eliminar proveedor';
      return false;
    }
    finally {
      loading.value = false;
    }
  }

  async function toggleProviderStatus(id: string): Promise<boolean> {
    const provider = getProviderById.value(id);
    if (!provider) {
      error.value = 'Proveedor no encontrado';
      return false;
    }
    return updateProvider(id, { active: !provider.active });
  }

  // Filter actions
  function setFilters(filters: ProviderFilters): void {
    activeFilters.value = { ...filters };
  }

  function updateFilter<K extends keyof ProviderFilters>(key: K, value: ProviderFilters[K]): void {
    activeFilters.value = { ...activeFilters.value, [key]: value };
  }

  function removeFilter(key: keyof ProviderFilters): void {
    const updated = { ...activeFilters.value };
    delete updated[key];
    activeFilters.value = updated;
  }

  function clearFilters(): void {
    activeFilters.value = {};
  }

  return {
    // State
    loading,
    error,
    activeFilters,
    // Getters
    providers,
    isLoaded,
    loadError,
    allProviders,
    activeProviders,
    getProviderById,
    getProvidersByCategory,
    statsByCategory,
    totalProviders,
    filteredProviders,
    availableCiudades,
    availableEstados,
    filteredCount,
    hasActiveFilters,
    // Actions
    refetch,
    addProvider,
    updateProvider,
    deleteProvider,
    toggleProviderStatus,
    setFilters,
    updateFilter,
    removeFilter,
    clearFilters,
  };
});

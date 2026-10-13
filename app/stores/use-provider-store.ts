import { defineStore } from 'pinia';

import type { Provider, ProviderCategory, ProviderFilters, ProviderFormData, ProviderUpdateData } from '~/types/provider';

import { filterProviders } from '~/composables/providers/use-provider-domain';
import { useProviderRepository } from '~/composables/providers/use-provider-repository';
import { catalogKeys, providersCatalogQuery, useCatalogState, useProvidersCatalog } from '~/queries/catalogs';
import { PROVIDER_CATEGORY } from '~/types/provider';

/**
 * Provider catalog, its writes and the providers list filters.
 * `providers` reads its catalog query (`useProvidersCatalog`, through `useCatalogState`);
 * writes go through `useProviderRepository` and then refetch it.
 * @returns Store state, getters and actions
 */
export const useProviderStore = defineStore('providers', () => {
  const repository = useProviderRepository();
  const queryCache = useQueryCache();
  const catalog = useCatalogState(useProvidersCatalog, providersCatalogQuery);

  // State (writes and filters; the catalog's load state comes from `catalog`)
  const loading = shallowRef(false);
  const error = shallowRef<string | null>(null);
  const activeFilters = ref<ProviderFilters>({});

  // Getters
  const providers = catalog.items;

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

  const availableCities = computed(() =>
    [...new Set(providers.value.filter(p => p.active).map(p => p.location.city))].sort(),
  );

  const availableStates = computed(() =>
    [...new Set(providers.value.filter(p => p.active).map(p => p.location.state))].sort(),
  );

  const filteredCount = computed(() => filteredProviders.value.length);

  const hasActiveFilters = computed(() =>
    Object.values(activeFilters.value).some(v => v !== undefined && v !== ''),
  );

  // Actions
  async function addProvider(data: ProviderFormData): Promise<Provider> {
    loading.value = true;
    error.value = null;
    try {
      const provider = await repository.insert(data);
      // Callers navigate to the new provider's detail: it must be in the catalog even if the
      // refetch below fails.
      catalog.setItems(items => [...items, provider]);
      await catalog.refresh();
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
      await catalog.refresh();
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
      const isAccommodation = getProviderById.value(id)?.category === PROVIDER_CATEGORY.ACCOMMODATION;
      await repository.remove(id);
      // The DB cascades the delete to the hotel's hotel_rooms/hotel_room_types.
      if (isAccommodation)
        queryCache.invalidateQueries({ key: catalogKeys.hotelRooms }).catch(() => {});
      await catalog.refresh();
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
    isLoaded: catalog.isLoaded,
    loadError: catalog.loadError,
    allProviders,
    activeProviders,
    getProviderById,
    getProvidersByCategory,
    statsByCategory,
    totalProviders,
    filteredProviders,
    availableCities,
    availableStates,
    filteredCount,
    hasActiveFilters,
    // Actions
    refetch: catalog.refetch,
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

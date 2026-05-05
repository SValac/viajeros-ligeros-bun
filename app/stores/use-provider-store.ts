import { defineStore } from 'pinia';

import type { Provider, ProviderCategory, ProviderFilters, ProviderFormData, ProviderUpdateData } from '~/types/provider';

import { filterProviders } from '~/composables/providers/use-provider-domain';
import { useProviderRepository } from '~/composables/providers/use-provider-repository';
import { PROVIDER_CATEGORY } from '~/types/provider';

import { useHotelRoomStore } from './use-hotel-room-store';

export const useProviderStore = defineStore('providers', () => {
  const repository = useProviderRepository();

  // State
  const providers = ref<Provider[]>([]);
  const loading = ref(false);
  const error = ref<string | null>(null);
  const activeFilters = ref<ProviderFilters>({});

  // Getters
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
  async function fetchAll(): Promise<void> {
    loading.value = true;
    error.value = null;
    try {
      providers.value = await repository.fetchAll();
    }
    catch (e) {
      error.value = e instanceof Error ? e.message : 'Error al cargar proveedores';
    }
    finally {
      loading.value = false;
    }
  }

  async function addProvider(data: ProviderFormData): Promise<Provider> {
    loading.value = true;
    error.value = null;
    try {
      const provider = await repository.insert(data);
      providers.value.push(provider);
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
      const provider = await repository.update(id, data);
      const index = providers.value.findIndex(p => p.id === id);
      if (index !== -1) {
        providers.value[index] = provider;
      }
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
      const hotelRoomStore = useHotelRoomStore();
      hotelRoomStore.deleteProviderRooms(id);

      providers.value = providers.value.filter(p => p.id !== id);
      error.value = null;
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
    providers,
    loading,
    error,
    activeFilters,
    // Getters
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
    fetchAll,
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

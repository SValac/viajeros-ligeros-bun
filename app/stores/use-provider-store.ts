import { defineStore } from 'pinia';

import type { Provider, ProviderCategory, ProviderFilters, ProviderFormData, ProviderUpdateData } from '~/types/provider';

import { PROVIDER_CATEGORY } from '~/types/provider';

import { useHotelRoomStore } from './use-hotel-room-store';

export const useProviderStore = defineStore('providers', () => {
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

  const filteredProviders = computed(() => {
    let result = [...providers.value];

    if (activeFilters.value.active !== undefined) {
      result = result.filter(p => p.active === activeFilters.value.active);
    }
    else {
      result = result.filter(p => p.active);
    }

    if (activeFilters.value.category) {
      result = result.filter(p => p.category === activeFilters.value.category);
    }

    if (activeFilters.value.city) {
      result = result.filter(
        p => p.location.city.toLowerCase() === activeFilters.value.city!.toLowerCase(),
      );
    }

    if (activeFilters.value.state) {
      result = result.filter(
        p => p.location.state.toLowerCase() === activeFilters.value.state!.toLowerCase(),
      );
    }

    if (activeFilters.value.searchTerm) {
      const term = activeFilters.value.searchTerm.toLowerCase();
      result = result.filter(
        p =>
          p.name.toLowerCase().includes(term)
          || p.description?.toLowerCase().includes(term)
          || p.contact.name?.toLowerCase().includes(term),
      );
    }

    return result.sort((a, b) => a.name.localeCompare(b.name, 'es'));
  });

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
  function addProvider(data: ProviderFormData): Provider {
    const now = new Date().toISOString();
    const newProvider: Provider = {
      ...data,
      id: `provider-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
      createdAt: now,
      updatedAt: now,
    };

    providers.value.push(newProvider);
    error.value = null;
    return newProvider;
  }

  function updateProvider(id: string, data: Partial<ProviderUpdateData>): boolean {
    const index = providers.value.findIndex(p => p.id === id);
    if (index === -1) {
      error.value = 'Proveedor no encontrado';
      return false;
    }

    const existing = providers.value[index];
    if (!existing) {
      error.value = 'Proveedor no encontrado';
      return false;
    }

    providers.value[index] = {
      ...existing,
      ...data,
      id: existing.id,
      createdAt: existing.createdAt,
      updatedAt: new Date().toISOString(),
    };

    error.value = null;
    return true;
  }

  function deleteProvider(id: string): boolean {
    const index = providers.value.findIndex(p => p.id === id);
    if (index === -1) {
      error.value = 'Proveedor no encontrado';
      return false;
    }

    // Cascade delete: eliminar datos de habitaciones si el proveedor es de hospedaje
    const hotelRoomStore = useHotelRoomStore();
    hotelRoomStore.deleteProviderRooms(id);

    providers.value.splice(index, 1);
    error.value = null;
    return true;
  }

  function toggleProviderStatus(id: string): boolean {
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
    addProvider,
    updateProvider,
    deleteProvider,
    toggleProviderStatus,
    setFilters,
    updateFilter,
    removeFilter,
    clearFilters,
  };
}, {
  persist: {
    key: 'viajeros-ligeros-providers',
    storage: import.meta.client ? localStorage : undefined,
    pick: ['providers'],
  },
});

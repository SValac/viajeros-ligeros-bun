import { defineStore } from 'pinia';

import type { TablesUpdate } from '~/types/database.types';
import type { Provider, ProviderCategory, ProviderFilters, ProviderFormData, ProviderUpdateData } from '~/types/provider';

import { PROVIDER_CATEGORY } from '~/types/provider';
import { mapProviderRowToDomain, mapProviderToInsert } from '~/utils/mappers';

import { useHotelRoomStore } from './use-hotel-room-store';

export const useProviderStore = defineStore('providers', () => {
  const supabase = useSupabase();

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
  async function fetchAll(): Promise<void> {
    loading.value = true;
    error.value = null;
    try {
      const { data, error: err } = await supabase
        .from('providers')
        .select('*')
        .order('name');
      if (err)
        throw err;
      providers.value = data.map(mapProviderRowToDomain);
    }
    catch (e) {
      error.value = e instanceof Error ? e.message : 'Error al cargar proveedores';
    }
    finally {
      loading.value = false;
    }
  }

  async function addProvider(data: ProviderFormData): Promise<Provider> {
    const { data: row, error: err } = await supabase
      .from('providers')
      .insert(mapProviderToInsert(data))
      .select()
      .single();

    if (err) {
      error.value = err.message;
      throw err;
    }

    const provider = mapProviderRowToDomain(row);
    providers.value.push(provider);
    error.value = null;
    return provider;
  }

  async function updateProvider(id: string, data: Partial<ProviderUpdateData>): Promise<boolean> {
    const update: TablesUpdate<'providers'> = {};
    if (data.name !== undefined)
      update.name = data.name;
    if (data.category !== undefined)
      update.category = data.category;
    if (data.active !== undefined)
      update.active = data.active;
    if ('description' in data)
      update.description = data.description ?? null;
    if (data.location) {
      update.location_city = data.location.city;
      update.location_state = data.location.state;
      update.location_country = data.location.country;
    }
    if (data.contact) {
      update.contact_name = data.contact.name ?? null;
      update.contact_phone = data.contact.phone ?? null;
      update.contact_email = data.contact.email ?? null;
      update.contact_notes = data.contact.notes ?? null;
    }

    const { data: row, error: err } = await supabase
      .from('providers')
      .update(update)
      .eq('id', id)
      .select()
      .single();

    if (err) {
      error.value = err.message;
      return false;
    }

    const index = providers.value.findIndex(p => p.id === id);
    if (index !== -1) {
      providers.value[index] = mapProviderRowToDomain(row);
    }
    error.value = null;
    return true;
  }

  async function deleteProvider(id: string): Promise<boolean> {
    const { error: err } = await supabase
      .from('providers')
      .delete()
      .eq('id', id);

    if (err) {
      error.value = err.message;
      return false;
    }

    // Keep in-memory hotel room store in sync until it migrates to Supabase
    const hotelRoomStore = useHotelRoomStore();
    hotelRoomStore.deleteProviderRooms(id);

    providers.value = providers.value.filter(p => p.id !== id);
    error.value = null;
    return true;
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

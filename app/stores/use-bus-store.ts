import { defineStore } from 'pinia';

import type { Bus, BusFormData, BusUpdateData } from '~/types/bus';
import type { TablesUpdate } from '~/types/database.types';

import { mapBusRowToDomain, mapBusToInsert } from '~/utils/mappers';

export const useBusStore = defineStore('buses', () => {
  const supabase = useSupabase();

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
  async function fetchAll(): Promise<void> {
    loading.value = true;
    error.value = null;
    try {
      const { data, error: err } = await supabase
        .from('buses')
        .select('*')
        .order('created_at');
      if (err)
        throw err;
      buses.value = data.map(mapBusRowToDomain);
    }
    catch (e) {
      error.value = e instanceof Error ? e.message : 'Error al cargar autobuses';
    }
    finally {
      loading.value = false;
    }
  }

  async function addBus(data: BusFormData): Promise<Bus> {
    const { data: row, error: err } = await supabase
      .from('buses')
      .insert(mapBusToInsert(data))
      .select()
      .single();

    if (err) {
      error.value = err.message;
      throw err;
    }

    const bus = mapBusRowToDomain(row);
    buses.value.push(bus);
    error.value = null;
    return bus;
  }

  async function updateBus(id: string, data: Partial<BusUpdateData>): Promise<boolean> {
    const update: TablesUpdate<'buses'> = {};
    if (data.providerId !== undefined)
      update.provider_id = data.providerId;
    if (data.active !== undefined)
      update.active = data.active;
    if (data.seatCount !== undefined)
      update.seat_count = data.seatCount;
    if (data.rentalPrice !== undefined)
      update.rental_price = data.rentalPrice;
    if ('brand' in data)
      update.brand = data.brand ?? null;
    if ('model' in data)
      update.model = data.model ?? null;
    if ('year' in data)
      update.year = data.year ?? null;

    const { data: row, error: err } = await supabase
      .from('buses')
      .update(update)
      .eq('id', id)
      .select()
      .single();

    if (err) {
      error.value = err.message;
      return false;
    }

    const index = buses.value.findIndex(b => b.id === id);
    if (index !== -1) {
      buses.value[index] = mapBusRowToDomain(row);
    }
    error.value = null;
    return true;
  }

  async function deleteBus(id: string): Promise<boolean> {
    const { error: err } = await supabase
      .from('buses')
      .delete()
      .eq('id', id);

    if (err) {
      error.value = err.message;
      return false;
    }

    buses.value = buses.value.filter(b => b.id !== id);
    error.value = null;
    return true;
  }

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

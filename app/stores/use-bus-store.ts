import { defineStore } from 'pinia';

import type { Bus, BusFormData, BusUpdateData } from '~/types/bus';

export const useBusStore = defineStore('buses', () => {
  // State
  const buses = ref<Bus[]>([]);
  const error = ref<string | null>(null);

  // Getters
  const activeBuses = computed(() => buses.value.filter(b => b.activo));

  const getBusById = computed(() => {
    return (id: string): Bus | undefined => buses.value.find(b => b.id === id);
  });

  // Pre-computes the map so the returned function just does a lookup (preserves caching)
  const getBusesByProvider = computed(() => {
    const map = new Map<string, Bus[]>();
    buses.value.filter(b => b.activo).forEach((b) => {
      const list = map.get(b.providerId) ?? [];
      list.push(b);
      map.set(b.providerId, list);
    });
    return (providerId: string): Bus[] => map.get(providerId) ?? [];
  });

  const totalBuses = computed(() => buses.value.filter(b => b.activo).length);

  // Actions
  function addBus(data: BusFormData): Bus {
    const now = new Date().toISOString();
    const newBus: Bus = {
      ...data,
      id: `bus-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
      createdAt: now,
      updatedAt: now,
    };

    buses.value.push(newBus);
    error.value = null;
    return newBus;
  }

  function updateBus(id: string, data: Partial<BusUpdateData>): boolean {
    const index = buses.value.findIndex(b => b.id === id);
    if (index === -1) {
      error.value = 'Autobús no encontrado';
      return false;
    }

    const existing = buses.value[index];
    if (!existing) {
      error.value = 'Autobús no encontrado';
      return false;
    }

    buses.value[index] = {
      ...existing,
      ...data,
      id: existing.id,
      createdAt: existing.createdAt,
      updatedAt: new Date().toISOString(),
    };

    error.value = null;
    return true;
  }

  function deleteBus(id: string): boolean {
    const index = buses.value.findIndex(b => b.id === id);
    if (index === -1) {
      error.value = 'Autobús no encontrado';
      return false;
    }

    buses.value.splice(index, 1);
    error.value = null;
    return true;
  }

  function toggleBusStatus(id: string): boolean {
    const bus = getBusById.value(id);
    if (!bus) {
      error.value = 'Autobús no encontrado';
      return false;
    }

    return updateBus(id, { activo: !bus.activo });
  }

  return {
    // State
    buses,
    error,
    // Getters
    activeBuses,
    getBusById,
    getBusesByProvider,
    totalBuses,
    // Actions
    addBus,
    updateBus,
    deleteBus,
    toggleBusStatus,
  };
}, {
  persist: {
    key: 'viajeros-ligeros-buses',
    storage: import.meta.client ? localStorage : undefined,
    pick: ['buses'],
  },
});

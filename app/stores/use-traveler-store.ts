import type { Traveler, TravelerFilters, TravelerFormData, TravelerUpdateData, TravelerWithChildren } from '~/types/traveler';

export const useTravelerStore = defineStore('useTravelerStore', () => {
  // State
  const travelers = ref<Traveler[]>([]);
  const loading = shallowRef(false);
  const error = shallowRef<string | null>(null);
  const filters = ref<TravelerFilters>({});

  // Getters (computed)
  const allTravelers = computed((): Traveler[] => {
    return [...travelers.value].sort((a, b) =>
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
  });

  const getTravelerById = computed(() => {
    return (id: string): Traveler | undefined => {
      return travelers.value.find(t => t.id === id);
    };
  });

  const getTravelersByTravel = computed(() => {
    return (travelId: string): Traveler[] => {
      return travelers.value.filter(t => t.travelId === travelId);
    };
  });

  const getTravelersByBus = computed(() => {
    return (travelBusId: string): Traveler[] => {
      return travelers.value.filter(t => t.travelBusId === travelBusId);
    };
  });

  const getGroupMembers = computed(() => {
    return (representanteId: string): Traveler[] => {
      return travelers.value.filter(t => t.representanteId === representanteId);
    };
  });

  const filteredTravelers = computed((): Traveler[] => {
    return travelers.value.filter((t) => {
      if (filters.value.travelId && t.travelId !== filters.value.travelId) {
        return false;
      }
      if (filters.value.travelBusId && t.travelBusId !== filters.value.travelBusId) {
        return false;
      }
      return true;
    });
  });

  const filteredGroupedTravelers = computed((): TravelerWithChildren[] => {
    // Base: viajeros ya filtrados por travelId y travelBusId
    const base = filteredTravelers.value;

    // Si hay filtro de representante, retorna solo ese representante con sus acompañantes
    if (filters.value.representanteId) {
      const rep = base.find(t => t.id === filters.value.representanteId);
      if (!rep)
        return [];
      const children = base.filter(t => t.representanteId === rep.id);
      return [{ ...rep, children: children.length > 0 ? children : undefined }];
    }

    // Agrupar: separar acompañantes (tienen representanteId) de los demás
    const grouped = Object.groupBy(base, t => t.representanteId ?? '');
    const acompañantesIds = new Set(
      base.filter(t => t.representanteId).map(t => t.id),
    );

    const result: TravelerWithChildren[] = [];

    for (const t of base) {
      // Si este viajero es acompañante de alguien, se incluye como child — no como fila raíz
      if (acompañantesIds.has(t.id))
        continue;

      const children = grouped[t.id];
      result.push({
        ...t,
        children: children && children.length > 0 ? children : undefined,
      });
    }

    return result;
  });

  // Actions
  function addTraveler(data: TravelerFormData): Traveler {
    const now = new Date().toISOString();
    const newTraveler: Traveler = {
      ...data,
      id: crypto.randomUUID(),
      createdAt: now,
      updatedAt: now,
    };

    travelers.value.push(newTraveler);
    error.value = null;
    return newTraveler;
  }

  function updateTraveler(id: string, data: TravelerUpdateData): Traveler | undefined {
    const index = travelers.value.findIndex(t => t.id === id);
    if (index === -1) {
      error.value = 'Viajero no encontrado';
      return undefined;
    }

    const existing = travelers.value[index];
    if (!existing) {
      error.value = 'Viajero no encontrado';
      return undefined;
    }

    const updated: Traveler = {
      ...existing,
      ...data,
      id: existing.id,
      createdAt: existing.createdAt,
      updatedAt: new Date().toISOString(),
    };

    travelers.value[index] = updated;
    error.value = null;
    return updated;
  }

  function deleteTraveler(id: string): void {
    const index = travelers.value.findIndex(t => t.id === id);
    if (index === -1) {
      error.value = 'Viajero no encontrado';
      return;
    }

    travelers.value.splice(index, 1);
    error.value = null;
  }

  function setFilters(newFilters: TravelerFilters): void {
    filters.value = { ...newFilters };
  }

  function clearFilters(): void {
    filters.value = {};
  }

  // Retornar todo el API público del store
  return {
    // State
    travelers,
    loading,
    error,
    filters,
    // Getters
    allTravelers,
    getTravelerById,
    getTravelersByTravel,
    getTravelersByBus,
    getGroupMembers,
    filteredTravelers,
    filteredGroupedTravelers,
    // Actions
    addTraveler,
    updateTraveler,
    deleteTraveler,
    setFilters,
    clearFilters,
  };
}, {
  // Persistencia en localStorage
  persist: {
    key: 'viajeros-ligeros-travelers',
    storage: import.meta.client ? localStorage : undefined,
  },
});

import type { Traveler, TravelerFilters, TravelerFormData, TravelerUpdateData } from '~/types/traveler';

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

  function loadMockData(): void {
    if (travelers.value.length > 0) {
      return;
    }

    const mockTravelId = 'travel-mock-001';
    const mockBusId1 = 'bus-mock-001';
    const mockBusId2 = 'bus-mock-002';

    const representante1Id = crypto.randomUUID();
    const representante2Id = crypto.randomUUID();

    const mockTravelers: (TravelerFormData & { id: string })[] = [
      {
        id: representante1Id,
        nombre: 'Alejandro',
        apellido: 'Torres Medina',
        telefono: '55-1234-5678',
        travelId: mockTravelId,
        travelBusId: mockBusId1,
        asiento: '1A',
        puntoAbordaje: 'Plaza de la Constitución',
        esRepresentante: true,
      },
      {
        id: crypto.randomUUID(),
        nombre: 'Fernanda',
        apellido: 'Torres Medina',
        telefono: '55-1234-5679',
        travelId: mockTravelId,
        travelBusId: mockBusId1,
        asiento: '1B',
        puntoAbordaje: 'Plaza de la Constitución',
        esRepresentante: false,
        representanteId: representante1Id,
      },
      {
        id: crypto.randomUUID(),
        nombre: 'Marco Antonio',
        apellido: 'Torres Medina',
        telefono: '55-1234-5680',
        travelId: mockTravelId,
        travelBusId: mockBusId1,
        asiento: '2A',
        puntoAbordaje: 'Plaza de la Constitución',
        esRepresentante: false,
        representanteId: representante1Id,
      },
      {
        id: representante2Id,
        nombre: 'Lucía',
        apellido: 'Ramírez Vega',
        telefono: '55-9876-5432',
        travelId: mockTravelId,
        travelBusId: mockBusId1,
        asiento: '3A',
        puntoAbordaje: 'Metro Indios Verdes',
        esRepresentante: true,
      },
      {
        id: crypto.randomUUID(),
        nombre: 'Diego',
        apellido: 'Ramírez Vega',
        telefono: '55-9876-5433',
        travelId: mockTravelId,
        travelBusId: mockBusId1,
        asiento: '3B',
        puntoAbordaje: 'Metro Indios Verdes',
        esRepresentante: false,
        representanteId: representante2Id,
      },
      {
        id: crypto.randomUUID(),
        nombre: 'Valentina',
        apellido: 'Cruz Hernández',
        telefono: '55-5555-1111',
        travelId: mockTravelId,
        travelBusId: mockBusId2,
        asiento: '1A',
        puntoAbordaje: 'Glorieta de los Insurgentes',
        esRepresentante: true,
      },
      {
        id: crypto.randomUUID(),
        nombre: 'Roberto',
        apellido: 'Flores Castillo',
        telefono: '55-5555-2222',
        travelId: mockTravelId,
        travelBusId: mockBusId2,
        asiento: '2A',
        puntoAbordaje: 'Glorieta de los Insurgentes',
        esRepresentante: true,
      },
      {
        id: crypto.randomUUID(),
        nombre: 'Carmen',
        apellido: 'Morales Jiménez',
        telefono: '55-5555-3333',
        travelId: mockTravelId,
        travelBusId: mockBusId2,
        asiento: '2B',
        puntoAbordaje: 'Terminal del Norte',
        esRepresentante: true,
      },
    ];

    const now = new Date().toISOString();
    mockTravelers.forEach(({ id, ...data }) => {
      travelers.value.push({
        ...data,
        id,
        createdAt: now,
        updatedAt: now,
      });
    });
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
    // Actions
    addTraveler,
    updateTraveler,
    deleteTraveler,
    setFilters,
    clearFilters,
    loadMockData,
  };
}, {
  // Persistencia en localStorage
  persist: {
    key: 'viajeros-ligeros-travelers',
    storage: import.meta.client ? localStorage : undefined,
  },
});

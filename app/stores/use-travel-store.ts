import type { Travel, TravelBus, TravelFormData, TravelStatus, TravelUpdateData } from '~/types/travel';

type TravelStats = {
  total: number;
  pendiente: number;
  confirmado: number;
  enCurso: number;
  completado: number;
  cancelado: number;
};

export const useTravelsStore = defineStore('useTravelsStore', () => {
  // State
  const travels = ref<Travel[]>([]);
  const loading = ref(false);
  const error = ref<string | null>(null);

  // Getters (computed)
  const allTravels = computed((): Travel[] => {
    return [...travels.value].sort((a, b) =>
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
  });

  const getTravelById = computed(() => {
    return (id: string): Travel | undefined => {
      return travels.value.find(travel => travel.id === id);
    };
  });

  const getTravelsByStatus = computed(() => {
    return (status: TravelStatus): Travel[] => {
      return travels.value.filter(travel => travel.estado === status);
    };
  });

  const stats = computed((): TravelStats => {
    return {
      total: travels.value.length,
      pendiente: travels.value.filter(t => t.estado === 'pendiente').length,
      confirmado: travels.value.filter(t => t.estado === 'confirmado').length,
      enCurso: travels.value.filter(t => t.estado === 'en-curso').length,
      completado: travels.value.filter(t => t.estado === 'completado').length,
      cancelado: travels.value.filter(t => t.estado === 'cancelado').length,
    };
  });

  const totalRevenue = computed((): number => {
    return travels.value
      .filter(t => t.estado === 'confirmado' || t.estado === 'completado')
      .reduce((sum, travel) => sum + travel.precio, 0);
  });

  // Actions (funciones)
  function addTravel(data: TravelFormData): Travel {
    const now = new Date().toISOString();
    const newTravel: Travel = {
      ...data,
      id: `travel-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      createdAt: now,
      updatedAt: now,
    };

    travels.value.push(newTravel);
    error.value = null;
    return newTravel;
  }

  function updateTravel(id: string, data: Partial<TravelUpdateData>): boolean {
    const index = travels.value.findIndex(t => t.id === id);
    if (index === -1) {
      error.value = 'Viaje no encontrado';
      return false;
    }

    const existingTravel = travels.value[index];
    if (!existingTravel) {
      error.value = 'Viaje no encontrado';
      return false;
    }

    travels.value[index] = {
      ...existingTravel,
      ...data,
      id: existingTravel.id,
      createdAt: existingTravel.createdAt,
      updatedAt: new Date().toISOString(),
    };

    error.value = null;
    return true;
  }

  function deleteTravel(id: string): boolean {
    const index = travels.value.findIndex(t => t.id === id);
    if (index === -1) {
      error.value = 'Viaje no encontrado';
      return false;
    }

    travels.value.splice(index, 1);
    error.value = null;
    return true;
  }

  function updateTravelStatus(id: string, status: TravelStatus): boolean {
    return updateTravel(id, { estado: status });
  }

  function addBusToTravel(travelId: string, data: Omit<TravelBus, 'id'>): TravelBus | null {
    const index = travels.value.findIndex(t => t.id === travelId);
    if (index === -1) {
      error.value = 'Viaje no encontrado';
      return null;
    }

    const existingTravel = travels.value[index];
    if (!existingTravel) {
      error.value = 'Viaje no encontrado';
      return null;
    }

    // Registrar en catálogo si el bus no viene referenciado del catálogo
    const busStore = useBusStore();
    let resolvedBusId = data.busId;

    if (!resolvedBusId) {
      const catalogBus = busStore.addBus({
        providerId: data.providerId,
        marca: data.marca,
        modelo: data.modelo,
        año: data.año,
        cantidadAsientos: data.cantidadAsientos,
        precioRenta: data.precioRenta,
        activo: true,
      });
      resolvedBusId = catalogBus.id;
    }

    const newBus: TravelBus = {
      ...data,
      busId: resolvedBusId,
      id: `bus-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
    };

    travels.value[index] = {
      ...existingTravel,
      autobuses: [...(existingTravel.autobuses ?? []), newBus],
      updatedAt: new Date().toISOString(),
    };

    error.value = null;
    return newBus;
  }

  function updateTravelBus(travelId: string, busId: string, data: Partial<Omit<TravelBus, 'id'>>): boolean {
    const travelIndex = travels.value.findIndex(t => t.id === travelId);
    if (travelIndex === -1) {
      error.value = 'Viaje no encontrado';
      return false;
    }

    const existingTravel = travels.value[travelIndex];
    if (!existingTravel) {
      error.value = 'Viaje no encontrado';
      return false;
    }

    const busIndex = (existingTravel.autobuses ?? []).findIndex(b => b.id === busId);
    if (busIndex === -1) {
      error.value = 'Autobús no encontrado en el viaje';
      return false;
    }

    const existingBus = (existingTravel.autobuses ?? [])[busIndex];
    if (!existingBus) {
      error.value = 'Autobús no encontrado en el viaje';
      return false;
    }

    const currentBuses = existingTravel.autobuses ?? [];
    const updatedBuses = [
      ...currentBuses.slice(0, busIndex),
      { ...existingBus, ...data },
      ...currentBuses.slice(busIndex + 1),
    ];

    travels.value[travelIndex] = {
      ...existingTravel,
      autobuses: updatedBuses,
      updatedAt: new Date().toISOString(),
    };

    error.value = null;
    return true;
  }

  function removeBusFromTravel(travelId: string, busId: string): boolean {
    const travelIndex = travels.value.findIndex(t => t.id === travelId);
    if (travelIndex === -1) {
      error.value = 'Viaje no encontrado';
      return false;
    }

    const existingTravel = travels.value[travelIndex];
    if (!existingTravel) {
      error.value = 'Viaje no encontrado';
      return false;
    }

    const currentBuses = existingTravel.autobuses ?? [];
    const busExists = currentBuses.some(b => b.id === busId);
    if (!busExists) {
      error.value = 'Autobús no encontrado en el viaje';
      return false;
    }

    travels.value[travelIndex] = {
      ...existingTravel,
      autobuses: currentBuses.filter(b => b.id !== busId),
      updatedAt: new Date().toISOString(),
    };

    error.value = null;
    return true;
  }

  // Retornar todo el API público del store
  return {
    // State
    travels,
    loading,
    error,
    // Getters
    allTravels,
    getTravelById,
    getTravelsByStatus,
    stats,
    totalRevenue,
    // Actions
    addTravel,
    updateTravel,
    deleteTravel,
    updateTravelStatus,
    addBusToTravel,
    updateTravelBus,
    removeBusFromTravel,
  };
}, {
  // Persistencia en localStorage
  persist: {
    key: 'viajeros-ligeros-travels',
    storage: import.meta.client ? localStorage : undefined,
  },
});

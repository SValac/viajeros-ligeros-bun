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

  function loadMockData(): void {
    if (travels.value.length > 0) {
      return;
    }

    const mockTravels: TravelFormData[] = [
      {
        destino: 'París, Francia',
        cliente: 'María García López',
        fechaInicio: '2025-03-15',
        fechaFin: '2025-03-22',
        precio: 1850.00,
        estado: 'confirmado',
        descripcion: 'Viaje romántico a París con visita a la Torre Eiffel, Museo del Louvre, crucero por el Sena y cena en restaurante Michelin.',
        imagenUrl: 'https://images.unsplash.com/photo-1502602898657-3e91760cbb34',
        itinerario: [
          {
            id: 'act-1',
            dia: 1,
            titulo: 'Llegada y Tour de Orientación',
            descripcion: 'Traslado al hotel y tour panorámico por los principales monumentos',
            hora: '14:00',
            ubicacion: 'Centro de París',
          },
          {
            id: 'act-2',
            dia: 2,
            titulo: 'Torre Eiffel y Louvre',
            descripcion: 'Visita guiada a la Torre Eiffel y Museo del Louvre',
            hora: '09:00',
            ubicacion: 'Torre Eiffel',
          },
          {
            id: 'act-3',
            dia: 3,
            titulo: 'Crucero por el Sena',
            descripcion: 'Crucero romántico con cena al atardecer',
            hora: '19:00',
            ubicacion: 'Río Sena',
          },
        ],
        servicios: [
          {
            id: 'serv-1',
            nombre: 'Vuelos ida y vuelta',
            descripcion: 'Clase turista desde Madrid',
            incluido: true,
          },
          {
            id: 'serv-2',
            nombre: 'Hotel 4 estrellas',
            descripcion: '7 noches con desayuno incluido',
            incluido: true,
          },
          {
            id: 'serv-3',
            nombre: 'Seguro de viaje',
            descripcion: 'Cobertura completa',
            incluido: true,
          },
          {
            id: 'serv-4',
            nombre: 'Traslados aeropuerto',
            descripcion: 'Transporte privado',
            incluido: true,
          },
        ],
        autobuses: [],
        notasInternas: 'Cliente VIP. Preferencia por habitaciones con vista. Aniversario de bodas.',
      },
      {
        destino: 'Tokio, Japón',
        cliente: 'Carlos Martínez Ruiz',
        fechaInicio: '2025-04-10',
        fechaFin: '2025-04-20',
        precio: 3200.00,
        estado: 'pendiente',
        descripcion: 'Experiencia cultural japonesa: templos de Kioto, Monte Fuji, ceremonia del té, y gastronomía tradicional.',
        imagenUrl: 'https://images.unsplash.com/photo-1540959733332-eab4deabeeaf',
        itinerario: [
          {
            id: 'act-4',
            dia: 1,
            titulo: 'Llegada a Tokio',
            descripcion: 'Recepción en aeropuerto y traslado al hotel',
            hora: '16:00',
            ubicacion: 'Aeropuerto Narita',
          },
          {
            id: 'act-5',
            dia: 2,
            titulo: 'Tour por Tokio Moderno',
            descripcion: 'Shibuya, Harajuku, Akihabara y Tokyo Tower',
            hora: '09:00',
            ubicacion: 'Tokio',
          },
          {
            id: 'act-6',
            dia: 5,
            titulo: 'Excursión Monte Fuji',
            descripcion: 'Visita al Monte Fuji y lago Kawaguchiko',
            hora: '07:00',
            ubicacion: 'Monte Fuji',
          },
        ],
        servicios: [
          {
            id: 'serv-5',
            nombre: 'Vuelos internacionales',
            descripcion: 'Clase business desde Barcelona',
            incluido: true,
          },
          {
            id: 'serv-6',
            nombre: 'Hotel 5 estrellas',
            descripcion: '10 noches en el centro de Tokio',
            incluido: true,
          },
          {
            id: 'serv-7',
            nombre: 'JR Pass 7 días',
            descripcion: 'Pase de tren ilimitado',
            incluido: true,
          },
          {
            id: 'serv-8',
            nombre: 'Guía turístico privado',
            descripcion: 'Guía en español para excursiones principales',
            incluido: false,
          },
        ],
        autobuses: [],
        notasInternas: 'Cliente interesado en gastronomía. Solicitar restaurantes con opciones vegetarianas.',
      },
    ];

    mockTravels.forEach(travel => addTravel(travel));
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
    loadMockData,
  };
}, {
  // Persistencia en localStorage
  persist: {
    key: 'viajeros-ligeros-travels',
    storage: import.meta.client ? localStorage : undefined,
  },
});

import type { Tables } from '~/types/database.types';
import type { Travel, TravelAccommodation, TravelBus, TravelFormData, TravelStatus, TravelUpdateData } from '~/types/travel';

import { useTravelRepository } from '~/composables/travels/use-travel-repository';

type TravelStats = {
  total: number;
  pending: number;
  confirmed: number;
  inProgress: number;
  completed: number;
  cancelled: number;
};

export const useTravelsStore = defineStore('useTravelsStore', () => {
  const repository = useTravelRepository();

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
      return travels.value.filter(travel => travel.status === status);
    };
  });

  const getAccommodationsByTravel = computed(() => {
    return (travelId: string): TravelAccommodation[] => {
      return travels.value.find(t => t.id === travelId)?.accommodations ?? [];
    };
  });

  const stats = computed((): TravelStats => {
    return {
      total: travels.value.length,
      pending: travels.value.filter(t => t.status === 'pending').length,
      confirmed: travels.value.filter(t => t.status === 'confirmed').length,
      inProgress: travels.value.filter(t => t.status === 'in_progress').length,
      completed: travels.value.filter(t => t.status === 'completed').length,
      cancelled: travels.value.filter(t => t.status === 'cancelled').length,
    };
  });

  const totalRevenue = computed((): number => {
    return travels.value
      .filter(t => t.status === 'confirmed' || t.status === 'completed')
      .reduce((sum, travel) => sum + travel.price, 0);
  });

  // Actions
  async function fetchAll(): Promise<void> {
    loading.value = true;
    error.value = null;
    try {
      travels.value = await repository.fetchAll();
    }
    catch (e) {
      error.value = e instanceof Error ? e.message : 'Error al cargar viajes';
    }
    finally {
      loading.value = false;
    }
  }

  async function addTravel(data: TravelFormData): Promise<Travel> {
    loading.value = true;
    error.value = null;
    try {
      const travel = await repository.insertTravel(data);
      const extras = {
        coordinatorIds: data.coordinatorIds,
        itinerary: data.itinerary,
        services: data.services,
        buses: data.buses,
        accommodations: [],
      };

      if (data.itinerary.length > 0)
        extras.itinerary = await repository.insertActivities(travel.id, data.itinerary);
      if (data.services.length > 0)
        extras.services = await repository.insertServices(travel.id, data.services);
      if (data.buses.length > 0)
        extras.buses = await repository.insertBuses(travel.id, data.buses);
      if (data.coordinatorIds.length > 0)
        await repository.insertCoordinators(travel.id, data.coordinatorIds);

      const newTravel = mapTravelRowToDomain(travel, extras);

      travels.value.push(newTravel);
      error.value = null;
      return newTravel;
    }
    catch (e) {
      error.value = e instanceof Error ? e.message : 'Error al agregar viaje';
      throw e;
    }
    finally {
      loading.value = false;
    }
  }

  async function updateTravel(id: string, data: Partial<TravelUpdateData>): Promise<boolean> {
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

    loading.value = true;
    error.value = null;
    try {
      let travelRow: Tables<'travels'> | null = null;
      const travelRootKeys: (keyof TravelUpdateData)[] = [
        'destination',
        'startDate',
        'endDate',
        'price',
        'description',
        'imageUrl',
        'status',
        'internalNotes',
        'totalOperationCost',
        'minimumSeats',
        'projectedProfit',
        'accumulatedTravelers',
      ];
      const haveTravelFields = travelRootKeys.some(key => key in data);

      if (haveTravelFields) {
        travelRow = await repository.updateTravel(id, data);
      }
      let itinerary = travels.value[index]?.itinerary ?? [];
      let services = travels.value[index]?.services ?? [];
      let buses = travels.value[index]?.buses ?? [];
      let accommodations = travels.value[index]?.accommodations ?? [];
      let coordinatorIds = travels.value[index]?.coordinatorIds ?? [];

      if (data.itinerary !== undefined)
        itinerary = await repository.replaceActivities(id, data.itinerary);
      if (data.services !== undefined)
        services = await repository.replaceServices(id, data.services);
      if (data.buses !== undefined)
        buses = await repository.replaceBuses(id, data.buses);
      if (data.accommodations !== undefined)
        accommodations = await repository.replaceAccommodations(id, data.accommodations);
      if (data.coordinatorIds !== undefined) {
        await repository.replaceCoordinators(id, data.coordinatorIds);
        coordinatorIds = data.coordinatorIds;
      }

      travels.value[index] = travelRow
        ? mapTravelRowToDomain(travelRow, {
            coordinatorIds,
            itinerary,
            services,
            buses,
            accommodations,
          })
        : {
            ...existingTravel,
            coordinatorIds,
            itinerary,
            services,
            buses,
            accommodations,
          };

      return true;
    }
    catch (e) {
      error.value = e instanceof Error ? e.message : 'Error al actualizar viaje';
      return false;
    }
    finally {
      loading.value = false;
    }
  }

  async function deleteTravel(id: string): Promise<boolean> {
    loading.value = true;
    error.value = null;
    try {
      await repository.removeTravel(id);
    }
    catch (e) {
      error.value = e instanceof Error ? e.message : 'Error al eliminar viaje';
      return false;
    }
    finally {
      loading.value = false;
    }

    travels.value = travels.value.filter(t => t.id !== id);
    error.value = null;
    return true;
  }

  async function updateTravelStatus(id: string, status: TravelStatus): Promise<boolean> {
    return updateTravel(id, { status });
  }

  async function addBusToTravel(travelId: string, data: Omit<TravelBus, 'id'>): Promise<TravelBus | null> {
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

    const busStore = useBusStore();
    let resolvedBusId = data.busId;

    if (!resolvedBusId) {
      const catalogBus = await busStore.addBus({
        providerId: data.providerId,
        brand: data.brand,
        model: data.model,
        year: data.year,
        seatCount: data.seatCount,
        rentalPrice: data.rentalPrice,
        active: true,
      });
      resolvedBusId = catalogBus.id;
    }

    loading.value = true;
    error.value = null;
    try {
      const newBus = await repository.insertTravelBus(travelId, { ...data, busId: resolvedBusId });
      travels.value[index] = {
        ...existingTravel,
        buses: [...(existingTravel.buses ?? []), newBus],
      };

      return newBus;
    }
    catch (e) {
      error.value = e instanceof Error ? e.message : 'Error al agregar autobús al viaje';
      return null;
    }
    finally {
      loading.value = false;
    }
  }

  async function updateTravelBus(travelId: string, busId: string, data: Partial<Omit<TravelBus, 'id'>>): Promise<boolean> {
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

    const busIndex = (existingTravel.buses ?? []).findIndex(b => b.id === busId);
    if (busIndex === -1) {
      error.value = 'Autobús no encontrado en el viaje';
      return false;
    }

    loading.value = true;
    error.value = null;
    try {
      const updatedBus = await repository.updateTravelBus(busId, data);
      const currentBuses = existingTravel.buses ?? [];
      const updatedBuses = [
        ...currentBuses.slice(0, busIndex),
        updatedBus,
        ...currentBuses.slice(busIndex + 1),
      ];

      travels.value[travelIndex] = {
        ...existingTravel,
        buses: updatedBuses,
      };
      return true;
    }
    catch (e) {
      error.value = e instanceof Error ? e.message : 'Error al actualizar autobús del viaje';
      return false;
    }
    finally {
      loading.value = false;
    }
  }

  async function removeBusFromTravel(travelId: string, busId: string): Promise<boolean> {
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

    const busExists = (existingTravel.buses ?? []).some(b => b.id === busId);
    if (!busExists) {
      error.value = 'Autobús no encontrado en el viaje';
      return false;
    }

    loading.value = true;
    error.value = null;
    try {
      await repository.removeTravelBus(busId);
      travels.value[travelIndex] = {
        ...existingTravel,
        buses: (existingTravel.buses ?? []).filter(b => b.id !== busId),
      };
      return true;
    }
    catch (e) {
      error.value = e instanceof Error ? e.message : 'Error al eliminar autobús del viaje';
      return false;
    }
    finally {
      loading.value = false;
    }
  }

  async function updateTravelAccommodation(
    travelId: string,
    accommodationId: string,
    data: { roomNumber?: string | null; floor?: number | null },
  ): Promise<boolean> {
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

    const accIndex = (existingTravel.accommodations ?? []).findIndex(a => a.id === accommodationId);
    if (accIndex === -1) {
      error.value = 'Habitación no encontrada en el viaje';
      return false;
    }

    loading.value = true;
    error.value = null;
    try {
      const updatedAcc = await repository.updateTravelAccommodation(accommodationId, data);
      const currentAccommodations = existingTravel.accommodations ?? [];
      const updatedAccommodations = [
        ...currentAccommodations.slice(0, accIndex),
        updatedAcc,
        ...currentAccommodations.slice(accIndex + 1),
      ];

      travels.value[travelIndex] = {
        ...existingTravel,
        accommodations: updatedAccommodations,
      };
      return true;
    }
    catch (e) {
      error.value = e instanceof Error ? e.message : 'Error al actualizar alojamiento del viaje';
      return false;
    }
    finally {
      loading.value = false;
    }
  }

  function updateLocalAccommodations(
    travelId: string,
    deletedIds: Set<string>,
    added: TravelAccommodation[],
  ): void {
    const index = travels.value.findIndex(t => t.id === travelId);
    if (index === -1)
      return;
    const existing = travels.value[index]?.accommodations ?? [];
    const kept = existing.filter(a => !deletedIds.has(a.id));
    travels.value[index] = {
      ...travels.value[index]!,
      accommodations: [...kept, ...added],
    };
  }

  return {
    // State
    travels,
    loading,
    error,
    // Getters
    allTravels,
    getTravelById,
    getTravelsByStatus,
    getAccommodationsByTravel,
    stats,
    totalRevenue,
    // Actions
    fetchAll,
    addTravel,
    updateTravel,
    deleteTravel,
    updateTravelStatus,
    addBusToTravel,
    updateTravelBus,
    removeBusFromTravel,
    updateTravelAccommodation,
    updateLocalAccommodations,
  };
});

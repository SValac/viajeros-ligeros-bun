import type { TablesUpdate } from '~/types/database.types';
import type { Travel, TravelActivity, TravelBus, TravelFormData, TravelService, TravelStatus, TravelUpdateData } from '~/types/travel';

type TravelStats = {
  total: number;
  pending: number;
  confirmed: number;
  inProgress: number;
  completed: number;
  cancelled: number;
};

export const useTravelsStore = defineStore('useTravelsStore', () => {
  const supabase = useSupabase();

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
      const { data, error: err } = await supabase
        .from('travels')
        .select('*, travel_activities(*), travel_services(*), travel_buses(*), travel_coordinators(coordinator_id)')
        .order('created_at', { ascending: false });

      if (err)
        throw err;

      travels.value = data.map((row) => {
        const activities: TravelActivity[] = (row.travel_activities ?? [])
          .slice()
          .sort((a: { day: number }, b: { day: number }) => a.day - b.day)
          .map(mapTravelActivityRowToDomain);

        const services: TravelService[] = (row.travel_services ?? []).map(mapTravelServiceRowToDomain);
        const buses: TravelBus[] = (row.travel_buses ?? []).map(mapTravelBusRowToDomain);
        const coordinatorIds: string[] = (row.travel_coordinators ?? []).map(
          (tc: { coordinator_id: string }) => tc.coordinator_id,
        );

        return mapTravelRowToDomain(row, { coordinatorIds, itinerary: activities, services, buses });
      });
    }
    catch (e) {
      error.value = e instanceof Error ? e.message : 'Error al cargar viajes';
    }
    finally {
      loading.value = false;
    }
  }

  async function addTravel(data: TravelFormData): Promise<Travel> {
    const { data: travelRow, error: travelErr } = await supabase
      .from('travels')
      .insert(mapTravelToInsert(data))
      .select()
      .single();

    if (travelErr) {
      error.value = travelErr.message;
      throw travelErr;
    }

    const travelId = travelRow.id;

    let insertedActivities: TravelActivity[] = [];
    if (data.itinerary.length > 0) {
      const { data: actRows, error: actErr } = await supabase
        .from('travel_activities')
        .insert(
          data.itinerary.map(a => ({
            travel_id: travelId,
            day: a.day,
            title: a.title,
            description: a.description,
            time: a.time ?? null,
            location: a.location ?? null,
          })),
        )
        .select();

      if (actErr) {
        error.value = actErr.message;
        throw actErr;
      }
      insertedActivities = (actRows ?? [])
        .slice()
        .sort((a, b) => a.day - b.day)
        .map(mapTravelActivityRowToDomain);
    }

    let insertedServices: TravelService[] = [];
    if (data.services.length > 0) {
      const { data: svcRows, error: svcErr } = await supabase
        .from('travel_services')
        .insert(
          data.services.map(s => ({
            travel_id: travelId,
            name: s.name,
            description: s.description ?? null,
            included: s.included,
            provider_id: s.providerId ?? null,
          })),
        )
        .select();

      if (svcErr) {
        error.value = svcErr.message;
        throw svcErr;
      }
      insertedServices = (svcRows ?? []).map(mapTravelServiceRowToDomain);
    }

    let insertedBuses: TravelBus[] = [];
    if (data.buses.length > 0) {
      const { data: busRows, error: busErr } = await supabase
        .from('travel_buses')
        .insert(
          data.buses.map(b => ({
            travel_id: travelId,
            bus_id: b.busId ?? null,
            provider_id: b.providerId,
            model: b.model ?? null,
            brand: b.brand ?? null,
            year: b.year ?? null,
            operator1_name: b.operator1Name,
            operator1_phone: b.operator1Phone,
            operator2_name: b.operator2Name ?? null,
            operator2_phone: b.operator2Phone ?? null,
            seat_count: b.seatCount,
            rental_price: b.rentalPrice,
          })),
        )
        .select();

      if (busErr) {
        error.value = busErr.message;
        throw busErr;
      }
      insertedBuses = (busRows ?? []).map(mapTravelBusRowToDomain);
    }

    if (data.coordinatorIds.length > 0) {
      const { error: coordErr } = await supabase
        .from('travel_coordinators')
        .insert(
          data.coordinatorIds.map(coordinatorId => ({
            travel_id: travelId,
            coordinator_id: coordinatorId,
          })),
        );

      if (coordErr) {
        error.value = coordErr.message;
        throw coordErr;
      }
    }

    const newTravel = mapTravelRowToDomain(travelRow, {
      coordinatorIds: data.coordinatorIds,
      itinerary: insertedActivities,
      services: insertedServices,
      buses: insertedBuses,
    });

    travels.value.push(newTravel);
    error.value = null;
    return newTravel;
  }

  async function updateTravel(id: string, data: Partial<TravelUpdateData>): Promise<boolean> {
    const index = travels.value.findIndex(t => t.id === id);
    if (index === -1) {
      error.value = 'Viaje no encontrado';
      return false;
    }

    const update: TablesUpdate<'travels'> = {};
    if (data.destination !== undefined)
      update.destination = data.destination;
    if (data.startDate !== undefined)
      update.start_date = data.startDate;
    if (data.endDate !== undefined)
      update.end_date = data.endDate;
    if (data.price !== undefined)
      update.price = data.price;
    if (data.description !== undefined)
      update.description = data.description;
    if ('imageUrl' in data)
      update.image_url = data.imageUrl ?? null;
    if (data.status !== undefined)
      update.status = data.status;
    if ('internalNotes' in data)
      update.internal_notes = data.internalNotes ?? null;
    if ('totalOperationCost' in data)
      update.total_operation_cost = data.totalOperationCost ?? null;
    if ('minimumSeats' in data)
      update.minimum_seats = data.minimumSeats ?? null;
    if ('projectedProfit' in data)
      update.projected_profit = data.projectedProfit ?? null;
    if ('accumulatedTravelers' in data)
      update.accumulated_travelers = data.accumulatedTravelers ?? null;

    const { data: travelRow, error: travelErr } = await supabase
      .from('travels')
      .update(update)
      .eq('id', id)
      .select()
      .single();

    if (travelErr) {
      error.value = travelErr.message;
      return false;
    }

    let itinerary = travels.value[index]?.itinerary ?? [];
    if (data.itinerary !== undefined) {
      await supabase.from('travel_activities').delete().eq('travel_id', id);

      if (data.itinerary.length > 0) {
        const { data: actRows, error: actErr } = await supabase
          .from('travel_activities')
          .insert(
            data.itinerary.map(a => ({
              travel_id: id,
              day: a.day,
              title: a.title,
              description: a.description,
              time: a.time ?? null,
              location: a.location ?? null,
            })),
          )
          .select();

        if (actErr) {
          error.value = actErr.message;
          return false;
        }
        itinerary = (actRows ?? [])
          .slice()
          .sort((a, b) => a.day - b.day)
          .map(mapTravelActivityRowToDomain);
      }
      else {
        itinerary = [];
      }
    }

    let services = travels.value[index]?.services ?? [];
    if (data.services !== undefined) {
      await supabase.from('travel_services').delete().eq('travel_id', id);

      if (data.services.length > 0) {
        const { data: svcRows, error: svcErr } = await supabase
          .from('travel_services')
          .insert(
            data.services.map(s => ({
              travel_id: id,
              name: s.name,
              description: s.description ?? null,
              included: s.included,
              provider_id: s.providerId ?? null,
            })),
          )
          .select();

        if (svcErr) {
          error.value = svcErr.message;
          return false;
        }
        services = (svcRows ?? []).map(mapTravelServiceRowToDomain);
      }
      else {
        services = [];
      }
    }

    let buses = travels.value[index]?.buses ?? [];
    if (data.buses !== undefined) {
      await supabase.from('travel_buses').delete().eq('travel_id', id);

      if (data.buses.length > 0) {
        const { data: busRows, error: busErr } = await supabase
          .from('travel_buses')
          .insert(
            data.buses.map(b => ({
              travel_id: id,
              bus_id: b.busId ?? null,
              provider_id: b.providerId,
              model: b.model ?? null,
              brand: b.brand ?? null,
              year: b.year ?? null,
              operator1_name: b.operator1Name,
              operator1_phone: b.operator1Phone,
              operator2_name: b.operator2Name ?? null,
              operator2_phone: b.operator2Phone ?? null,
              seat_count: b.seatCount,
              rental_price: b.rentalPrice,
            })),
          )
          .select();

        if (busErr) {
          error.value = busErr.message;
          return false;
        }
        buses = (busRows ?? []).map(mapTravelBusRowToDomain);
      }
      else {
        buses = [];
      }
    }

    let coordinatorIds = travels.value[index]?.coordinatorIds ?? [];
    if (data.coordinatorIds !== undefined) {
      await supabase.from('travel_coordinators').delete().eq('travel_id', id);

      if (data.coordinatorIds.length > 0) {
        const { error: coordErr } = await supabase
          .from('travel_coordinators')
          .insert(
            data.coordinatorIds.map(coordinatorId => ({
              travel_id: id,
              coordinator_id: coordinatorId,
            })),
          );

        if (coordErr) {
          error.value = coordErr.message;
          return false;
        }
      }
      coordinatorIds = data.coordinatorIds;
    }

    travels.value[index] = mapTravelRowToDomain(travelRow, {
      coordinatorIds,
      itinerary,
      services,
      buses,
    });

    error.value = null;
    return true;
  }

  async function deleteTravel(id: string): Promise<boolean> {
    const { error: err } = await supabase
      .from('travels')
      .delete()
      .eq('id', id);

    if (err) {
      error.value = err.message;
      return false;
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

    const { data: busRow, error: busErr } = await supabase
      .from('travel_buses')
      .insert({
        travel_id: travelId,
        bus_id: resolvedBusId ?? null,
        provider_id: data.providerId,
        model: data.model ?? null,
        brand: data.brand ?? null,
        year: data.year ?? null,
        operator1_name: data.operator1Name,
        operator1_phone: data.operator1Phone,
        operator2_name: data.operator2Name ?? null,
        operator2_phone: data.operator2Phone ?? null,
        seat_count: data.seatCount,
        rental_price: data.rentalPrice,
      })
      .select()
      .single();

    if (busErr) {
      error.value = busErr.message;
      return null;
    }

    const newBus = mapTravelBusRowToDomain(busRow);

    travels.value[index] = {
      ...existingTravel,
      buses: [...(existingTravel.buses ?? []), newBus],
    };

    error.value = null;
    return newBus;
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

    const update: TablesUpdate<'travel_buses'> = {};
    if ('busId' in data)
      update.bus_id = data.busId ?? null;
    if (data.providerId !== undefined)
      update.provider_id = data.providerId;
    if ('model' in data)
      update.model = data.model ?? null;
    if ('brand' in data)
      update.brand = data.brand ?? null;
    if ('year' in data)
      update.year = data.year ?? null;
    if (data.operator1Name !== undefined)
      update.operator1_name = data.operator1Name;
    if (data.operator1Phone !== undefined)
      update.operator1_phone = data.operator1Phone;
    if ('operator2Name' in data)
      update.operator2_name = data.operator2Name ?? null;
    if ('operator2Phone' in data)
      update.operator2_phone = data.operator2Phone ?? null;
    if (data.seatCount !== undefined)
      update.seat_count = data.seatCount;
    if (data.rentalPrice !== undefined)
      update.rental_price = data.rentalPrice;

    const { data: busRow, error: busErr } = await supabase
      .from('travel_buses')
      .update(update)
      .eq('id', busId)
      .select()
      .single();

    if (busErr) {
      error.value = busErr.message;
      return false;
    }

    const updatedBus = mapTravelBusRowToDomain(busRow);
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

    error.value = null;
    return true;
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

    const { error: busErr } = await supabase
      .from('travel_buses')
      .delete()
      .eq('id', busId);

    if (busErr) {
      error.value = busErr.message;
      return false;
    }

    travels.value[travelIndex] = {
      ...existingTravel,
      buses: (existingTravel.buses ?? []).filter(b => b.id !== busId),
    };

    error.value = null;
    return true;
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
  };
});

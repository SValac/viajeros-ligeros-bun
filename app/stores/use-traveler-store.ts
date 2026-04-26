import type { TablesUpdate } from '~/types/database.types';
import type { Traveler, TravelerFilters, TravelerFormData, TravelerUpdateData, TravelerWithChildren } from '~/types/traveler';

import { mapTravelerRowToDomain, mapTravelerToInsert } from '~/utils/mappers';

export const useTravelerStore = defineStore('useTravelerStore', () => {
  const supabase = useSupabase();

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
    return (representativeId: string): Traveler[] => {
      return travelers.value.filter(t => t.representativeId === representativeId);
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
    if (filters.value.representativeId) {
      const rep = base.find(t => t.id === filters.value.representativeId);
      if (!rep)
        return [];
      const children = base.filter(t => t.representativeId === rep.id);
      return [{ ...rep, children: children.length > 0 ? children : undefined }];
    }

    // Agrupar: separar acompañantes (tienen representativeId) de los demás
    const grouped = Object.groupBy(base, t => t.representativeId ?? '');
    const acompañantesIds = new Set(
      base.filter(t => t.representativeId).map(t => t.id),
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
  async function fetchAll(): Promise<void> {
    loading.value = true;
    error.value = null;
    try {
      const { data, error: err } = await supabase
        .from('travelers')
        .select('*')
        .order('created_at', { ascending: false });
      if (err)
        throw err;
      travelers.value = data.map(mapTravelerRowToDomain);
    }
    catch (e) {
      error.value = e instanceof Error ? e.message : 'Error desconocido';
    }
    finally {
      loading.value = false;
    }
  }

  async function fetchByTravel(travelId: string): Promise<void> {
    loading.value = true;
    error.value = null;
    try {
      const { data, error: err } = await supabase
        .from('travelers')
        .select('*')
        .eq('travel_id', travelId)
        .order('created_at', { ascending: false });
      if (err)
        throw err;
      const fetched = data.map(mapTravelerRowToDomain);
      travelers.value = [
        ...travelers.value.filter(t => t.travelId !== travelId),
        ...fetched,
      ];
    }
    catch (e) {
      error.value = e instanceof Error ? e.message : 'Error desconocido';
    }
    finally {
      loading.value = false;
    }
  }

  async function addTraveler(data: TravelerFormData): Promise<Traveler> {
    loading.value = true;
    error.value = null;
    try {
      const { data: row, error: err } = await supabase
        .from('travelers')
        .insert(mapTravelerToInsert(data))
        .select()
        .single();

      if (err)
        throw err;

      const traveler = mapTravelerRowToDomain(row);
      travelers.value.push(traveler);
      return traveler;
    }
    catch (e) {
      error.value = e instanceof Error ? e.message : 'Error desconocido';
      throw e;
    }
    finally {
      loading.value = false;
    }
  }

  async function updateTraveler(id: string, data: TravelerUpdateData): Promise<Traveler> {
    loading.value = true;
    error.value = null;
    try {
      const update: TablesUpdate<'travelers'> = {};
      if (data.firstName !== undefined)
        update.first_name = data.firstName;
      if (data.lastName !== undefined)
        update.last_name = data.lastName;
      if (data.phone !== undefined)
        update.phone = data.phone;
      if (data.travelId !== undefined)
        update.travel_id = data.travelId;
      if (data.travelBusId !== undefined)
        update.travel_bus_id = data.travelBusId || null;
      if (data.seat !== undefined)
        update.seat = data.seat;
      if (data.boardingPoint !== undefined)
        update.boarding_point = data.boardingPoint;
      if (data.isRepresentative !== undefined)
        update.is_representative = data.isRepresentative;
      if (data.representativeId !== undefined)
        update.representative_id = data.representativeId ?? null;

      const { data: row, error: err } = await supabase
        .from('travelers')
        .update(update)
        .eq('id', id)
        .select()
        .single();

      if (err)
        throw err;

      const traveler = mapTravelerRowToDomain(row);
      const index = travelers.value.findIndex(t => t.id === id);
      if (index !== -1) {
        travelers.value[index] = traveler;
      }
      return traveler;
    }
    catch (e) {
      error.value = e instanceof Error ? e.message : 'Error desconocido';
      throw e;
    }
    finally {
      loading.value = false;
    }
  }

  async function deleteTraveler(id: string): Promise<void> {
    loading.value = true;
    error.value = null;
    try {
      // Si este viajero es representante, desvincular sus acompañantes antes de borrar
      const hasCompanions = travelers.value.some(t => t.representativeId === id);
      if (hasCompanions) {
        const { error: unlinkErr } = await supabase
          .from('travelers')
          .update({ representative_id: null, is_representative: false })
          .eq('representative_id', id);
        if (unlinkErr)
          throw unlinkErr;

        // Actualizar en memoria
        travelers.value = travelers.value.map(t =>
          t.representativeId === id
            ? { ...t, representativeId: undefined, isRepresentative: false }
            : t,
        );
      }

      const { error: err } = await supabase
        .from('travelers')
        .delete()
        .eq('id', id);

      if (err)
        throw err;

      travelers.value = travelers.value.filter(t => t.id !== id);
    }
    catch (e) {
      error.value = e instanceof Error ? e.message : 'Error desconocido';
    }
    finally {
      loading.value = false;
    }
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
    fetchAll,
    fetchByTravel,
    addTraveler,
    updateTraveler,
    deleteTraveler,
    setFilters,
    clearFilters,
  };
});

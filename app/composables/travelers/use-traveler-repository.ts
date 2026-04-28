import type { TablesUpdate } from '~/types/database.types';
import type { Traveler, TravelerFormData, TravelerUpdateData } from '~/types/traveler';

export function useTravelerRepository() {
  const supabase = useSupabase();

  async function fetchAll(): Promise<Traveler[]> {
    const { data, error } = await supabase
      .from('travelers')
      .select('*')
      .order('created_at', { ascending: false });

    if (error)
      throw error;

    return data.map(mapTravelerRowToDomain);
  }

  async function fetchByTravel(travelId: string): Promise<Traveler[]> {
    const { data, error } = await supabase
      .from('travelers')
      .select('*')
      .eq('travel_id', travelId)
      .order('created_at', { ascending: false });

    if (error)
      throw error;

    return data.map(mapTravelerRowToDomain);
  }

  async function insert(data: TravelerFormData): Promise<Traveler> {
    const { data: row, error } = await supabase
      .from('travelers')
      .insert(mapTravelerToInsert(data))
      .select()
      .single();

    if (error)
      throw error;

    return mapTravelerRowToDomain(row);
  }

  async function update(id: string, data: TravelerUpdateData): Promise<Traveler> {
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
    if ('travelAccommodationId' in data)
      update.travel_accommodation_id = data.travelAccommodationId ?? null;

    const { data: row, error } = await supabase
      .from('travelers')
      .update(update)
      .eq('id', id)
      .select()
      .single();

    if (error)
      throw error;

    return mapTravelerRowToDomain(row);
  }

  async function unlinkCompanions(representativeId: string): Promise<void> {
    const { error } = await supabase
      .from('travelers')
      .update({ representative_id: null, is_representative: false })
      .eq('representative_id', representativeId);

    if (error)
      throw error;
  }

  async function remove(id: string): Promise<void> {
    const { error } = await supabase
      .from('travelers')
      .delete()
      .eq('id', id);

    if (error)
      throw error;
  }

  async function changeSeat(params: { travelerId: string; travelBusId: string; targetSeat: number }): Promise<unknown> {
    const { data, error } = await supabase
      .rpc('move_or_swap_traveler_seat', {
        p_traveler_id: params.travelerId,
        p_travel_bus_id: params.travelBusId,
        p_target_seat: params.targetSeat,
      });

    if (error)
      throw error;

    return data;
  }

  async function assignRoom(travelerId: string, travelerAccommodationId: string): Promise<Traveler> {
    const { data: row, error } = await supabase
      .from('travelers')
      .update({ travel_accommodation_id: travelerAccommodationId })
      .eq('id', travelerId)
      .select()
      .single();

    if (error)
      throw error;

    return mapTravelerRowToDomain(row);
  }

  async function removeFromRoom(travelerId: string): Promise<Traveler> {
    const { data: row, error } = await supabase
      .from('travelers')
      .update({ travel_accommodation_id: null })
      .eq('id', travelerId)
      .select()
      .single();

    if (error)
      throw error;

    return mapTravelerRowToDomain(row);
  }

  return { fetchAll, fetchByTravel, insert, update, unlinkCompanions, remove, changeSeat, assignRoom, removeFromRoom };
}

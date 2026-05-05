import type { TablesUpdate } from '~/types/database.types';
import type { Traveler, TravelerFormData, TravelerUpdateData } from '~/types/traveler';

/**
 * Data access layer for the `travelers` table.
 * Each function performs a single Supabase operation and either returns domain data
 * or throws — it never touches reactive state. Cache management is the store's responsibility.
 * @returns Object with all repository methods
 */
export function useTravelerRepository() {
  const supabase = useSupabase();

  /**
   * Fetches all travelers ordered by creation date descending.
   * @returns All traveler records mapped to domain objects
   * @throws {PostgrestError} on Supabase failure
   */
  async function fetchAll(): Promise<Traveler[]> {
    const { data, error } = await supabase
      .from('travelers')
      .select('*')
      .order('created_at', { ascending: false });

    if (error)
      throw error;

    return data.map(mapTravelerRowToDomain);
  }

  /**
   * Fetches travelers for a specific travel ordered by creation date descending.
   * Merging with the global cache is the store's responsibility.
   * @param travelId - UUID of the travel to fetch travelers for
   * @returns Travelers belonging to the given travel
   * @throws {PostgrestError} on Supabase failure
   */
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

  /**
   * Inserts a new traveler record.
   * @param data - Form data for the new traveler
   * @returns The created traveler mapped to a domain object
   * @throws {PostgrestError} on Supabase failure
   */
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

  /**
   * Updates an existing traveler. Only fields present in `data` are sent to Supabase
   * (camelCase keys are translated to snake_case here, not in the store).
   * @param id - UUID of the traveler to update
   * @param data - Partial update data; omitted fields are left unchanged
   * @returns The updated traveler mapped to a domain object
   * @throws {PostgrestError} on Supabase failure
   */
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

  /**
   * Removes the representative link from all companions of the given traveler.
   * Must be called before deleting a representative — the DB does not cascade this field.
   * @param representativeId - UUID of the traveler being deleted
   * @throws {PostgrestError} on Supabase failure
   */
  async function unlinkCompanions(representativeId: string): Promise<void> {
    const { error } = await supabase
      .from('travelers')
      .update({ representative_id: null, is_representative: false })
      .eq('representative_id', representativeId);

    if (error)
      throw error;
  }

  /**
   * Deletes a traveler record by ID.
   * @param id - UUID of the traveler to delete
   * @throws {PostgrestError} on Supabase failure
   */
  async function remove(id: string): Promise<void> {
    const { error } = await supabase
      .from('travelers')
      .delete()
      .eq('id', id);

    if (error)
      throw error;
  }

  /**
   * Calls the `move_or_swap_traveler_seat` RPC.
   * Returns `unknown` because payload validation is the domain's responsibility (`isTravelerSeatChangeResult`).
   * @param params - RPC parameters
   * @param params.travelerId - UUID of the traveler to move
   * @param params.travelBusId - UUID of the target travel bus
   * @param params.targetSeat - Seat number to move the traveler to
   * @returns Raw RPC response (validate with `isTravelerSeatChangeResult` before use)
   * @throws {PostgrestError} on Supabase or RPC failure
   */
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

  /**
   * Assigns a traveler to a travel accommodation.
   * @param travelerId - UUID of the traveler to assign
   * @param travelerAccommodationId - UUID of the target accommodation
   * @returns The updated traveler with `travelAccommodationId` set
   * @throws {PostgrestError} on Supabase failure
   */
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

  /**
   * Removes a traveler from their assigned accommodation.
   * @param travelerId - UUID of the traveler to unassign
   * @returns The updated traveler with `travelAccommodationId` set to `null`
   * @throws {PostgrestError} on Supabase failure
   */
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

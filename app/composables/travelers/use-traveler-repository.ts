import type { TablesUpdate } from '~/types/database.types';
import type { TravelAccommodation } from '~/types/travel';
import type { Traveler, TravelerFormData, TravelerRoomAssignment, TravelerUpdateData } from '~/types/traveler';

/**
 * Data access layer for the `travelers` table and their room assignments.
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
   * Seats a coordinator, or clears their bus and seat together (`null`).
   * @param travelerId - UUID of the coordinator's travelers row
   * @param seat - Bus and seat to take, or `null` to leave them without a seat
   * @returns The updated row mapped to a domain object
   * @throws {PostgrestError} on Supabase failure (e.g. the seat is taken)
   */
  async function setCoordinatorSeat(
    travelerId: string,
    seat: { travelBusId: string; seat: number } | null,
  ): Promise<Traveler> {
    const { data: row, error } = await supabase
      .from('travelers')
      .update({ travel_bus_id: seat?.travelBusId ?? null, seat: seat?.seat ?? null })
      .eq('id', travelerId)
      .eq('kind', 'coordinator')
      .select()
      .single();

    if (error)
      throw error;

    return mapTravelerRowToDomain(row);
  }

  /**
   * Clears the bus and seat of every coordinator of a travel. Their rooms stay.
   * @param travelId - UUID of the travel
   * @throws {PostgrestError} on Supabase failure
   */
  async function clearCoordinatorSeats(travelId: string): Promise<void> {
    const { error } = await supabase
      .from('travelers')
      .update({ travel_bus_id: null, seat: null })
      .eq('travel_id', travelId)
      .eq('kind', 'coordinator');

    if (error)
      throw error;
  }

  /**
   * Fetches every room assignment the user can see.
   * @returns All assignments mapped to domain objects
   * @throws {PostgrestError} on Supabase failure
   */
  async function fetchRoomAssignments(): Promise<TravelerRoomAssignment[]> {
    const { data, error } = await supabase
      .from('traveler_room_assignments')
      .select('*');

    if (error)
      throw error;

    return data.map(mapTravelerRoomAssignmentRowToDomain);
  }

  /**
   * Fetches the room assignments of a specific travel.
   * @param travelId - UUID of the travel
   * @returns Assignments belonging to the given travel
   * @throws {PostgrestError} on Supabase failure
   */
  async function fetchRoomAssignmentsByTravel(travelId: string): Promise<TravelerRoomAssignment[]> {
    const { data, error } = await supabase
      .from('traveler_room_assignments')
      .select('*')
      .eq('travel_id', travelId);

    if (error)
      throw error;

    return data.map(mapTravelerRoomAssignmentRowToDomain);
  }

  /**
   * Assigns a traveler to a room. A traveler holds one room per hotel: the DB rejects a
   * second room in the same hotel, and a room already at its `maxOccupancy` (`room_full`).
   * @param travelerId - UUID of the traveler to assign
   * @param accommodation - The room to assign the traveler to
   * @returns The created assignment
   * @throws {PostgrestError} on Supabase failure
   */
  async function assignRoom(
    travelerId: string,
    accommodation: Pick<TravelAccommodation, 'id' | 'travelId' | 'providerId'>,
  ): Promise<TravelerRoomAssignment> {
    const { data: row, error } = await supabase
      .from('traveler_room_assignments')
      .insert({
        traveler_id: travelerId,
        travel_accommodation_id: accommodation.id,
        provider_id: accommodation.providerId,
        travel_id: accommodation.travelId,
      })
      .select()
      .single();

    if (error)
      throw error;

    return mapTravelerRoomAssignmentRowToDomain(row);
  }

  /**
   * Removes a traveler from their room in one hotel.
   * @param travelerId - UUID of the traveler to unassign
   * @param providerId - UUID of the hotel whose room is released
   * @throws {PostgrestError} on Supabase failure, or if RLS filtered the row out (nothing removed)
   */
  async function removeFromRoom(travelerId: string, providerId: string): Promise<void> {
    // `.select().single()` turns an RLS-blocked delete (0 rows, no error) into an error.
    const { error } = await supabase
      .from('traveler_room_assignments')
      .delete()
      .eq('traveler_id', travelerId)
      .eq('provider_id', providerId)
      .select()
      .single();

    if (error)
      throw error;
  }

  return {
    fetchAll,
    fetchByTravel,
    insert,
    update,
    unlinkCompanions,
    remove,
    changeSeat,
    setCoordinatorSeat,
    clearCoordinatorSeats,
    fetchRoomAssignments,
    fetchRoomAssignmentsByTravel,
    assignRoom,
    removeFromRoom,
  };
}

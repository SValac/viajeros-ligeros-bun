import type { HotelRoomData, HotelRoomType, HotelRoomTypeFormData } from '~/types/hotel-room';

/**
 * Data access layer for the `hotel_rooms` and `hotel_room_types` tables.
 * Each function performs a single Supabase operation and either returns domain data
 * or throws — it never touches reactive state. Cache management is the store's responsibility.
 * `fetchAll` loads both tables in one round trip using a JOIN.
 */
export function useHotelRoomRepository() {
  const supabase = useSupabase();

  /**
   * Fetches all hotel rooms with their associated room types in a single JOIN query.
   * @returns All hotel room records with nested room types, mapped to domain objects
   * @throws {PostgrestError} on Supabase failure
   */
  async function fetchAll(): Promise<HotelRoomData[]> {
    const { data, error: err } = await supabase
      .from('hotel_rooms')
      .select('*, hotel_room_types(*)')
      .order('created_at');
    if (err)
      throw err;
    return data.map(row => mapHotelRoomRowToDomain(row, row.hotel_room_types.map(mapHotelRoomTypeRowToDomain)));
  };

  /**
   * Inserts a new hotel room record for a provider.
   * Returns with `roomTypes: []` — room types are added separately via `insertRoomType`.
   * @param providerId - UUID of the provider this room record belongs to
   * @param totalRooms - Initial capacity (can be updated later with `updateRoomTotal`)
   * @returns The created hotel room record with an empty room types array
   * @throws {PostgrestError} on Supabase failure
   */
  async function insertRoomData(providerId: string, totalRooms: number): Promise<HotelRoomData> {
    const { data: row, error } = await supabase
      .from('hotel_rooms')
      .insert({ provider_id: providerId, total_rooms: totalRooms })
      .select()
      .single();

    if (error)
      throw error;
    return mapHotelRoomRowToDomain(row, []);
  };

  /**
   * Updates the total room capacity for a hotel room record.
   * Returns only the fields the store needs to patch the cached object — avoids
   * replacing the reactive object and losing the nested `roomTypes` array.
   * @param roomId - UUID of the hotel room record to update
   * @param total - New total room capacity (must be ≥ sum of configured room type counts)
   * @returns Updated `totalRooms` and `updatedAt` timestamp
   * @throws {PostgrestError} on Supabase failure
   */
  async function updateRoomTotal(roomId: string, total: number): Promise<{ totalRooms: number; updatedAt: string }> {
    const { data: row, error } = await supabase
      .from('hotel_rooms')
      .update({ total_rooms: total })
      .eq('id', roomId)
      .select()
      .single();

    if (error) {
      throw error;
    }

    return { totalRooms: row.total_rooms, updatedAt: row.updated_at };
  };

  /**
   * Inserts a new room type under a hotel room record.
   * `costPerPerson` is pre-calculated by the store (`calculateCostPerPerson`) and passed in —
   * the repository persists it without knowing the formula.
   * @param roomId - UUID of the parent hotel room record
   * @param data - Room type form data (occupancy, count, beds, price)
   * @param costPerPerson - Pre-calculated cost per person (`pricePerNight / maxOccupancy`)
   * @returns The created room type mapped to a domain object
   * @throws {PostgrestError} on Supabase failure
   */
  async function insertRoomType(roomId: string, data: HotelRoomTypeFormData, costPerPerson: number): Promise<HotelRoomType> {
    const { data: row, error } = await supabase
      .from('hotel_room_types')
      .insert({
        hotel_room_id: roomId,
        max_occupancy: data.maxOccupancy,
        room_count: data.roomCount,
        beds: data.beds,
        price_per_night: data.pricePerNight,
        cost_per_person: costPerPerson,
        additional_details: data.additionalDetails ?? null,
      })
      .select()
      .single();

    if (error) {
      throw error;
    }
    return mapHotelRoomTypeRowToDomain(row);
  };

  /**
   * Updates an existing room type.
   * `costPerPerson` is pre-calculated by the store (`calculateCostPerPerson`) and passed in —
   * the repository persists it without knowing the formula.
   * @param roomTypeId - UUID of the room type to update
   * @param data - Updated room type form data
   * @param costPerPerson - Pre-calculated cost per person (`pricePerNight / maxOccupancy`)
   * @returns The updated room type mapped to a domain object
   * @throws {PostgrestError} on Supabase failure
   */
  async function updateRoomType(roomTypeId: string, data: HotelRoomTypeFormData, costPerPerson: number): Promise<HotelRoomType> {
    const { data: row, error } = await supabase
      .from('hotel_room_types')
      .update({
        max_occupancy: data.maxOccupancy,
        room_count: data.roomCount,
        beds: data.beds,
        price_per_night: data.pricePerNight,
        cost_per_person: costPerPerson,
        additional_details: data.additionalDetails ?? null,
      })
      .eq('id', roomTypeId)
      .select()
      .single();

    if (error) {
      throw error;
    }
    return mapHotelRoomTypeRowToDomain(row);
  };

  /**
   * Deletes a room type by ID.
   * The parent `hotel_room` record is not affected — only the type entry is removed.
   * @param roomTypeId - UUID of the room type to delete
   * @throws {PostgrestError} on Supabase failure
   */
  async function removeRoomType(roomTypeId: string): Promise<void> {
    const { error } = await supabase
      .from('hotel_room_types')
      .delete()
      .eq('id', roomTypeId);

    if (error) {
      throw error;
    }
  }

  return {
    fetchAll,
    insertRoomData,
    updateRoomTotal,
    insertRoomType,
    updateRoomType,
    removeRoomType,
  };
}

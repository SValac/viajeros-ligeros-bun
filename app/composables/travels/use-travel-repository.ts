import type { Tables, TablesUpdate } from '~/types/database.types';
import type { Travel, TravelAccommodation, TravelActivity, TravelBus, TravelBusInsert, TravelFormData, TravelService, TravelUpdateData } from '~/types/travel';

import { validateAndMapItinerary } from './use-travel-domain';

/**
 * Data access layer for the `travels` table and its related sub-tables.
 * Each function performs a single Supabase operation and either returns domain data
 * or throws — it never touches reactive state. Cache management is the store's responsibility.
 * @returns Object with all repository methods
 */
export function useTravelRepository() {
  const supabase = useSupabase();

  /**
   * Fetches all travels with their related sub-entities, ordered by creation date descending.
   * @returns All travel records mapped to domain objects with itinerary, services, buses, accommodations, and coordinators
   * @throws {PostgrestError} on Supabase failure
   */
  async function fetchAll(): Promise<Travel[]> {
    const { data, error } = await supabase
      .from('travels')
      .select('*, travel_activities(*), travel_services(*), travel_buses(*), travel_accommodations(*), travel_coordinators(coordinator_id)')
      .order('created_at', { ascending: false });

    if (error)
      throw error;

    return data.map((row) => {
      const activities: TravelActivity[] = (row.travel_activities ?? [])
        .slice()
        .sort((a: { day: number }, b: { day: number }) => a.day - b.day)
        .map(mapTravelActivityRowToDomain);

      const services: TravelService[] = (row.travel_services ?? []).map(mapTravelServiceRowToDomain);
      const buses: TravelBus[] = (row.travel_buses ?? []).map(mapTravelBusRowToDomain);
      const accommodations: TravelAccommodation[] = (row.travel_accommodations ?? []).map(mapTravelAccommodationRowToDomain);
      const coordinatorIds: string[] = (row.travel_coordinators ?? []).map(
        (tc: { coordinator_id: string }) => tc.coordinator_id,
      );

      return mapTravelRowToDomain(row, { coordinatorIds, itinerary: activities, services, buses, accommodations });
    });
  }

  /**
   * Inserts a new travel record.
   * Returns the raw DB row so the store can assemble the full `Travel` domain object
   * by combining it with the separately inserted sub-entities.
   * @param data - Form data for the new travel
   * @returns The created raw `travels` row
   * @throws {PostgrestError} on Supabase failure
   */
  async function insertTravel(data: TravelFormData): Promise<Tables<'travels'>> {
    const { data: row, error } = await supabase
      .from('travels')
      .insert(mapTravelToInsert(data))
      .select()
      .single();

    if (error)
      throw error;

    return row;
  }

  /**
   * Inserts service records for a travel.
   * @param travelId - UUID of the parent travel
   * @param services - Services to insert
   * @returns The inserted services mapped to domain objects
   * @throws {PostgrestError} on Supabase failure
   */
  async function insertServices(travelId: string, services: TravelService[]): Promise<TravelService[]> {
    const { data, error } = await supabase
      .from('travel_services')
      .insert(
        services.map(s => ({
          travel_id: travelId,
          name: s.name,
          description: s.description ?? null,
          included: s.included,
          provider_id: s.providerId ?? null,
        })),
      )
      .select();

    if (error)
      throw error;

    return data.map(mapTravelServiceRowToDomain);
  }

  /**
   * Inserts bus records for a travel.
   * @param travelId - UUID of the parent travel
   * @param buses - Buses to insert
   * @returns The inserted buses mapped to domain objects
   * @throws {PostgrestError} on Supabase failure
   */
  async function insertBuses(travelId: string, buses: TravelBus[]): Promise<TravelBus[]> {
    const { data, error } = await supabase
      .from('travel_buses')
      .insert(
        buses.map(b => ({
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

    if (error)
      throw error;

    return data.map(mapTravelBusRowToDomain);
  }

  /**
   * Inserts coordinator links for a travel.
   * @param travelId - UUID of the parent travel
   * @param ids - Coordinator UUIDs to link
   * @throws {PostgrestError} on Supabase failure
   */
  async function insertCoordinators(travelId: string, ids: string[]): Promise<void> {
    const { error } = await supabase
      .from('travel_coordinators')
      .insert(
        ids.map(coordinatorId => ({
          travel_id: travelId,
          coordinator_id: coordinatorId,
        })),
      );

    if (error)
      throw error;
  }

  /**
   * Validates and inserts itinerary activities for a travel, sorted by day.
   * @param travelId - UUID of the parent travel
   * @param activities - Activities to validate and insert
   * @returns The inserted activities sorted by day and mapped to domain objects
   * @throws {Error} if any activity fails domain validation
   * @throws {PostgrestError} on Supabase failure
   */
  async function insertActivities(travelId: string, activities: TravelActivity[]): Promise<TravelActivity[]> {
    const itineraryInserts = validateAndMapItinerary(travelId, activities);
    const { data, error } = await supabase
      .from('travel_activities')
      .insert(itineraryInserts)
      .select();

    if (error)
      throw error;

    return data
      .slice()
      .sort((a, b) => a.day - b.day)
      .map(mapTravelActivityRowToDomain);
  }

  /**
   * Inserts accommodation records for a travel.
   * @param travelId - UUID of the parent travel
   * @param accommodations - Accommodations to insert
   * @returns The inserted accommodations mapped to domain objects
   * @throws {PostgrestError} on Supabase failure
   */
  async function insertAccommodations(travelId: string, accommodations: TravelAccommodation[]): Promise<TravelAccommodation[]> {
    const { data, error } = await supabase
      .from('travel_accommodations')
      .insert(
        accommodations.map(a => ({
          travel_id: travelId,
          provider_id: a.providerId,
          hotel_room_type_id: a.hotelRoomTypeId ?? null,
          max_occupancy: a.maxOccupancy,
          room_number: a.roomNumber ?? null,
          floor: a.floor ?? null,
        })),
      )
      .select();

    if (error)
      throw error;

    return data.map(mapTravelAccommodationRowToDomain);
  }

  /**
   * Inserts a single bus record for a travel.
   * Used by `addBusToTravel` when adding an individual bus outside of a full travel update.
   * @param travelId - UUID of the parent travel
   * @param data - Bus data to insert
   * @returns The inserted bus mapped to a domain object
   * @throws {PostgrestError} on Supabase failure
   */
  async function insertTravelBus(travelId: string, data: TravelBusInsert): Promise<TravelBus> {
    const { data: row, error } = await supabase
      .from('travel_buses')
      .insert({
        travel_id: travelId,
        bus_id: data.busId ?? null,
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

    if (error)
      throw error;

    return mapTravelBusRowToDomain(row);
  }

  /**
   * Updates a single bus record. Only fields present in `data` are sent to Supabase.
   * @param busId - UUID of the `travel_buses` record to update
   * @param data - Partial bus data; omitted fields are left unchanged
   * @returns The updated bus mapped to a domain object
   * @throws {PostgrestError} on Supabase failure
   */
  async function updateTravelBus(busId: string, data: Partial<TravelBusInsert>): Promise<TravelBus> {
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

    const { data: row, error } = await supabase
      .from('travel_buses')
      .update(update)
      .eq('id', busId)
      .select()
      .single();

    if (error)
      throw error;

    return mapTravelBusRowToDomain(row);
  }

  /**
   * Updates room number and/or floor for a single accommodation record.
   * @param id - UUID of the `travel_accommodations` record to update
   * @param data - Fields to update; omitted fields are left unchanged
   * @param data.roomNumber - Room identifier string, or `null` to clear it
   * @param data.floor - Floor number, or `null` to clear it
   * @returns The updated accommodation mapped to a domain object
   * @throws {PostgrestError} on Supabase failure
   */
  async function updateTravelAccommodation(
    id: string,
    data: {
      roomNumber?: string | null;
      floor?: number | null;
    },
  ): Promise<TravelAccommodation> {
    const update: TablesUpdate<'travel_accommodations'> = {};
    if ('roomNumber' in data)
      update.room_number = data.roomNumber ?? null;
    if ('floor' in data)
      update.floor = data.floor ?? null;

    const { data: row, error } = await supabase
      .from('travel_accommodations')
      .update(update)
      .eq('id', id)
      .select()
      .single();

    if (error)
      throw error;

    return mapTravelAccommodationRowToDomain(row);
  }

  /**
   * Updates the root `travels` record. Only fields present in `data` are sent to Supabase.
   * Returns the raw DB row so the store can reassemble the full `Travel` domain object.
   * @param travelId - UUID of the travel to update
   * @param data - Partial travel data; omitted fields are left unchanged
   * @returns The updated raw `travels` row
   * @throws {PostgrestError} on Supabase failure
   */
  async function updateTravel(travelId: string, data: Partial<TravelUpdateData>): Promise<Tables<'travels'>> {
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

    const { data: row, error } = await supabase
      .from('travels')
      .update(update)
      .eq('id', travelId)
      .select()
      .single();

    if (error)
      throw error;

    return row;
  }

  /**
   * Replaces all itinerary activities for a travel (delete then insert).
   * If `activities` is empty, only the delete runs and returns `[]`.
   * @param travelId - UUID of the parent travel
   * @param activities - New activities to insert after deletion
   * @returns The newly inserted activities sorted by day
   * @throws {PostgrestError} on Supabase failure
   */
  async function replaceActivities(travelId: string, activities: TravelActivity[]): Promise<TravelActivity[]> {
    await removeActivities(travelId);
    if (activities.length === 0)
      return [];
    return insertActivities(travelId, activities);
  }

  /**
   * Replaces all services for a travel (delete then insert).
   * If `services` is empty, only the delete runs and returns `[]`.
   * @param travelId - UUID of the parent travel
   * @param services - New services to insert after deletion
   * @returns The newly inserted services mapped to domain objects
   * @throws {PostgrestError} on Supabase failure
   */
  async function replaceServices(travelId: string, services: TravelService[]): Promise<TravelService[]> {
    await removeServices(travelId);
    if (services.length === 0)
      return [];
    return insertServices(travelId, services);
  }

  /**
   * Replaces all buses for a travel (delete then insert).
   * If `buses` is empty, only the delete runs and returns `[]`.
   * @param travelId - UUID of the parent travel
   * @param buses - New buses to insert after deletion
   * @returns The newly inserted buses mapped to domain objects
   * @throws {PostgrestError} on Supabase failure
   */
  async function replaceBuses(travelId: string, buses: TravelBus[]): Promise<TravelBus[]> {
    await removeBuses(travelId);
    if (buses.length === 0)
      return [];
    return insertBuses(travelId, buses);
  }

  /**
   * Replaces all accommodations for a travel (delete then insert).
   * If `accommodations` is empty, only the delete runs and returns `[]`.
   * @param travelId - UUID of the parent travel
   * @param accommodations - New accommodations to insert after deletion
   * @returns The newly inserted accommodations mapped to domain objects
   * @throws {PostgrestError} on Supabase failure
   */
  async function replaceAccommodations(travelId: string, accommodations: TravelAccommodation[]): Promise<TravelAccommodation[]> {
    await removeAccommodations(travelId);
    if (accommodations.length === 0)
      return [];
    return insertAccommodations(travelId, accommodations);
  }

  /**
   * Replaces all coordinator links for a travel (delete then insert).
   * If `coordinatorIds` is empty, only the delete runs.
   * @param travelId - UUID of the parent travel
   * @param coordinatorIds - New coordinator UUIDs to link after deletion
   * @throws {PostgrestError} on Supabase failure
   */
  async function replaceCoordinators(travelId: string, coordinatorIds: string[]): Promise<void> {
    await removeCoordinators(travelId);
    if (coordinatorIds.length === 0)
      return;
    await insertCoordinators(travelId, coordinatorIds);
  }

  async function removeActivities(travelId: string): Promise<void> {
    const { error } = await supabase
      .from('travel_activities')
      .delete()
      .eq('travel_id', travelId);

    if (error)
      throw error;
  }

  async function removeServices(travelId: string): Promise<void> {
    const { error } = await supabase
      .from('travel_services')
      .delete()
      .eq('travel_id', travelId);

    if (error)
      throw error;
  }

  async function removeBuses(travelId: string): Promise<void> {
    const { error } = await supabase
      .from('travel_buses')
      .delete()
      .eq('travel_id', travelId);

    if (error)
      throw error;
  }

  async function removeAccommodations(travelId: string): Promise<void> {
    const { error } = await supabase
      .from('travel_accommodations')
      .delete()
      .eq('travel_id', travelId);

    if (error)
      throw error;
  }

  async function removeCoordinators(travelId: string): Promise<void> {
    const { error } = await supabase
      .from('travel_coordinators')
      .delete()
      .eq('travel_id', travelId);

    if (error)
      throw error;
  }

  /**
   * Deletes a travel record by ID. Related sub-entities are cascade-deleted by the DB.
   * @param id - UUID of the travel to delete
   * @throws {PostgrestError} on Supabase failure
   */
  async function removeTravel(id: string): Promise<void> {
    const { error } = await supabase
      .from('travels')
      .delete()
      .eq('id', id);

    if (error)
      throw error;
  }

  /**
   * Deletes a single bus record from a travel.
   * @param busId - UUID of the `travel_buses` record to delete
   * @throws {PostgrestError} on Supabase failure
   */
  async function removeTravelBus(busId: string): Promise<void> {
    const { error } = await supabase
      .from('travel_buses')
      .delete()
      .eq('id', busId);

    if (error)
      throw error;
  }

  return {
    fetchAll,
    updateTravel,
    updateTravelAccommodation,
    updateTravelBus,
    removeTravel,
    removeTravelBus,
    insertTravel,
    insertTravelBus,
    insertActivities,
    insertServices,
    insertBuses,
    insertCoordinators,
    insertAccommodations,
    replaceActivities,
    replaceServices,
    replaceBuses,
    replaceAccommodations,
    replaceCoordinators,
  };
}

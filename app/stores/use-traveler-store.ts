import type { TravelAccommodation } from '~/types/travel';
import type { Traveler, TravelerFormData, TravelerSeatChangeResult, TravelerUpdateData } from '~/types/traveler';

import { isTravelerSeatChangeResult, toRoomAssignmentErrorMessage, toTravelerSeatChangeError } from '~/composables/travelers/use-traveler-domain';
import { useTravelerRepository } from '~/composables/travelers/use-traveler-repository';
import { paymentKeys } from '~/queries/payments';
import { quotationKeys } from '~/queries/quotations';
import { travelerKeys } from '~/queries/travelers';
import { travelKeys } from '~/queries/travels';
import { TravelerSeatChangeError } from '~/types/traveler';

/**
 * Traveler writes. Reads go through `travelersByTravelQuery` / `travelerDetailQuery`;
 * every successful write invalidates `travelerKeys.root` so those queries refetch.
 * Delegates all Supabase I/O to `useTravelerRepository` and domain logic to `use-traveler-domain`.
 * @returns Store state and actions
 */
export const useTravelerStore = defineStore('useTravelerStore', () => {
  const repository = useTravelerRepository();
  const queryCache = useQueryCache();

  // State
  const loading = shallowRef(false);
  const error = shallowRef<string | null>(null);

  // Actions
  /**
   * Creates a new traveler.
   * @param data - Form data for the new traveler
   * @returns The created traveler
   * @throws Re-throws repository errors so the caller can react (e.g. close modal, show toast)
   */
  async function addTraveler(data: TravelerFormData): Promise<Traveler> {
    loading.value = true;
    error.value = null;
    try {
      const traveler = await repository.insert(data);
      queryCache.invalidateQueries({ key: travelerKeys.root }); // traveler list changed
      queryCache.invalidateQueries({ key: travelKeys.root }); // traveler count
      // What's owed to per-person providers is recomputed in the DB from the travelers.
      queryCache.invalidateQueries({ key: quotationKeys.byTravel(traveler.travelId) });
      return traveler;
    }
    catch (e) {
      error.value = e instanceof Error ? e.message : 'Error desconocido';
      // return the error up the call stack so the UI can react to it (e.g. show a toast)
      throw e;
    }
    finally {
      loading.value = false;
    }
  }

  /**
   * Updates a traveler.
   * @param id - UUID of the traveler to update
   * @param data - Partial update data
   * @returns The updated traveler
   * @throws Re-throws repository errors so the caller can react
   */
  async function updateTraveler(id: string, data: TravelerUpdateData): Promise<Traveler> {
    loading.value = true;
    error.value = null;
    try {
      const traveler = await repository.update(id, data);
      queryCache.invalidateQueries({ key: travelerKeys.root });
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

  /**
   * Unlinks all companions before deleting the traveler.
   * Required because the DB does not cascade `representative_id` on traveler delete.
   * @param id - UUID of the traveler to delete
   */
  async function deleteTraveler(id: string): Promise<void> {
    loading.value = true;
    error.value = null;
    try {
      // If they represent a group, unlink the companions first (no-op when there are none)
      await repository.unlinkCompanions(id);

      await repository.remove(id);
      // The DB cascades the traveler's payments and account config, so payment totals change.
      queryCache.invalidateQueries({ key: paymentKeys.root });
      queryCache.invalidateQueries({ key: travelKeys.root }); // traveler count
      // The DB cascades the traveler's room assignments too.
      queryCache.invalidateQueries({ key: travelerKeys.root }); // traveler list changed
      // What's owed to per-person providers is recomputed in the DB from the travelers.
      queryCache.invalidateQueries({ key: quotationKeys.root });
    }
    catch (e) {
      error.value = e instanceof Error ? e.message : 'Error desconocido';
    }
    finally {
      loading.value = false;
    }
  }

  /**
   * Moves or swaps a traveler's seat via RPC.
   * The RPC may update two travelers (swap); the travelers query refetches both.
   * @param params - Seat change parameters
   * @param params.travelerId - UUID of the traveler to move
   * @param params.travelBusId - UUID of the travel bus context
   * @param params.targetSeat - Destination seat number
   * @returns The RPC result with operation type and updated seat data
   * @throws {TravelerSeatChangeError} with a typed code and user-facing message
   */
  async function changeTravelerSeat(params: {
    travelerId: string;
    travelBusId: string;
    targetSeat: number;
  }): Promise<TravelerSeatChangeResult> {
    loading.value = true;
    error.value = null;

    try {
      const data = await repository.changeSeat(params);
      queryCache.invalidateQueries({ key: travelerKeys.root });

      if (!isTravelerSeatChangeResult(data)) {
        throw new TravelerSeatChangeError('unknown-error', 'La respuesta del servidor para cambiar asiento es inválida.');
      }

      return data;
    }
    catch (e) {
      const seatChangeError = e instanceof TravelerSeatChangeError
        ? e
        : toTravelerSeatChangeError(e);
      error.value = seatChangeError.message;
      throw seatChangeError;
    }
    finally {
      loading.value = false;
    }
  }

  /**
   * Seats a coordinator, or takes their seat away (`null`).
   * @param travelerId - UUID of the coordinator's travelers row
   * @param seat - Bus and seat to take, or `null` to leave them without a seat
   * @throws Re-throws repository errors so the caller can react
   */
  async function setCoordinatorSeat(
    travelerId: string,
    seat: { travelBusId: string; seat: number } | null,
  ): Promise<void> {
    loading.value = true;
    error.value = null;
    try {
      await repository.setCoordinatorSeat(travelerId, seat);
      queryCache.invalidateQueries({ key: travelerKeys.root });
    }
    catch (e) {
      error.value = e instanceof Error ? e.message : 'Error desconocido';
      throw e;
    }
    finally {
      loading.value = false;
    }
  }

  /**
   * Takes every coordinator of a travel off their seat (their rooms stay). Used when the
   * quotation stops counting coordinators as passengers.
   * @param travelId - UUID of the travel
   * @throws Re-throws repository errors so the caller can react
   */
  async function clearCoordinatorSeats(travelId: string): Promise<void> {
    loading.value = true;
    error.value = null;
    try {
      await repository.clearCoordinatorSeats(travelId);
      queryCache.invalidateQueries({ key: travelerKeys.root });
    }
    catch (e) {
      error.value = e instanceof Error ? e.message : 'Error desconocido';
      throw e;
    }
    finally {
      loading.value = false;
    }
  }

  /**
   * Assigns a traveler to a room.
   * @param travelerId - UUID of the traveler to assign
   * @param accommodation - The room to assign the traveler to
   * @throws Re-throws repository errors so the caller can react; `error` holds a user-facing message
   */
  async function assignTravelerToRoom(
    travelerId: string,
    accommodation: Pick<TravelAccommodation, 'id' | 'travelId' | 'providerId'>,
  ): Promise<void> {
    loading.value = true;
    error.value = null;
    try {
      await repository.assignRoom(travelerId, accommodation);
      queryCache.invalidateQueries({ key: travelerKeys.root });
    }
    catch (e) {
      error.value = toRoomAssignmentErrorMessage(e);
      throw e;
    }
    finally {
      loading.value = false;
    }
  }

  /**
   * Removes a traveler from their room in one hotel.
   * @param travelerId - UUID of the traveler to unassign
   * @param providerId - UUID of the hotel whose room is released
   * @throws Re-throws repository errors so the caller can react
   */
  async function removeTravelerFromRoom(travelerId: string, providerId: string): Promise<void> {
    loading.value = true;
    error.value = null;
    try {
      await repository.removeFromRoom(travelerId, providerId);
      queryCache.invalidateQueries({ key: travelerKeys.root });
    }
    catch (e) {
      error.value = e instanceof Error ? e.message : 'Error desconocido';
      throw e;
    }
    finally {
      loading.value = false;
    }
  }

  return {
    // State
    loading,
    error,
    // Actions
    addTraveler,
    updateTraveler,
    deleteTraveler,
    changeTravelerSeat,
    setCoordinatorSeat,
    clearCoordinatorSeats,
    assignTravelerToRoom,
    removeTravelerFromRoom,
  };
});

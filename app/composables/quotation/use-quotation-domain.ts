import type { Quotation, QuotationAccommodation, QuotationBus, QuotationProvider } from '~/types/quotation';
import type { TravelAccommodation } from '~/types/travel';

type ProviderPaymentStatus = 'pending' | 'partial' | 'paid';

export type RoomSlot = { providerId: string; hotelRoomTypeId?: string; maxOccupancy: number };
export type DesiredGroup = { key: string; slots: RoomSlot[] };
export type ReconcileResult = {
  toDeleteIds: string[];
  toInsert: RoomSlot[];
  skippedOccupied: number;
};

/**
 * Derives the payment status of a quotation item from the amount paid vs. the total cost.
 * Used uniformly for providers, accommodations, and buses to avoid duplicating this logic.
 * @param paid - Total amount already paid
 * @param total - Full cost of the item
 * @returns `'pending'` if nothing has been paid, `'paid'` if fully covered, `'partial'` otherwise
 */
export function calculatePaymentStatus(paid: number, total: number): ProviderPaymentStatus {
  if (paid <= 0)
    return 'pending';
  if (paid >= total)
    return 'paid';
  return 'partial';
}

/**
 * Calculates the price per seat for a quotation based on provider and bus costs.
 * Costs split by `'minimum'` are divided by `minimumSeatTarget`; costs split by `'total'`
 * are divided by `busCapacity`. The two parts are summed and rounded up.
 * Returns 0 if both parts are zero (no costs entered yet).
 * @param quotation - Quotation with seat targets needed for the formula
 * @param providers - Providers belonging to this quotation (pre-filtered by caller)
 * @param buses - Buses belonging to this quotation (pre-filtered by caller)
 * @returns Price per seat in whole units (ceiling), or 0 if no costs are defined
 */
export function calculateSeatPrice(
  quotation: Pick<Quotation, 'minimumSeatTarget' | 'busCapacity'>,
  providers: Pick<QuotationProvider, 'totalCost' | 'splitType'>[],
  buses: Pick<QuotationBus, 'totalCost' | 'splitType'>[],
): number {
  const minCost = providers.filter(p => (p.splitType ?? 'minimum') === 'minimum').reduce((acc, p) => acc + p.totalCost, 0);
  const occupiedCost = providers.filter(p => (p.splitType ?? 'minimum') === 'total').reduce((acc, p) => acc + p.totalCost, 0);
  const minBusesCost = buses.filter(b => (b.splitType ?? 'minimum') === 'minimum').reduce((acc, b) => acc + (b.totalCost ?? 0), 0);
  const busesTotalCost = buses.filter(b => (b.splitType ?? 'minimum') === 'total').reduce((acc, b) => acc + (b.totalCost ?? 0), 0);

  const minPart = quotation.minimumSeatTarget > 0 ? (minCost + minBusesCost) / quotation.minimumSeatTarget : 0;
  const occupiedPart = quotation.busCapacity > 0 ? (occupiedCost + busesTotalCost) / quotation.busCapacity : 0;

  if (minPart === 0 && occupiedPart === 0) {
    return 0;
  }

  return Math.ceil(minPart + occupiedPart);
}

/**
 * Builds the desired room state from the accommodations in a quotation.
 * Groups room slots by `"providerId:hotelRoomTypeId"` key, expanding each detail's
 * `quantity` into individual `RoomSlot` entries. Used as input for `reconcileAccommodations`.
 * @param accommodations - Accommodations for a single quotation (pre-filtered by caller)
 * @returns Map keyed by `"providerId:roomTypeId"`, each entry holding its desired slots
 */
export function buildDesiredRoomsMap(accommodations: QuotationAccommodation[]): Map<string, DesiredGroup> {
  const desiredGroupMap = new Map<string, DesiredGroup>();
  for (const accommodation of accommodations) {
    for (const detail of accommodation.details) {
      const key = `${accommodation.providerId}:${detail.roomTypeId ?? ''}`;
      if (!desiredGroupMap.has(key)) {
        desiredGroupMap.set(key, { key, slots: [] });
      }
      for (let i = 0; i < detail.quantity; i++) {
        desiredGroupMap.get(key)?.slots.push({
          providerId: accommodation.providerId,
          hotelRoomTypeId: detail.roomTypeId,
          maxOccupancy: detail.maxOccupancy,
        });
      }
    }
  }
  return desiredGroupMap;
}

/**
 * Compares the desired room state against existing `travel_accommodations` and produces
 * the minimal set of DB changes needed to reach the desired state.
 * Occupied rooms (rooms with a traveler assigned) are never deleted — they are counted
 * as `skippedOccupied` so the caller can surface a warning to the user.
 * @param desired - Output of `buildDesiredRoomsMap` for this quotation
 * @param existing - Current `travel_accommodations` rows for this travel
 * @param occupiedIds - Set of `travel_accommodation` IDs that have a traveler assigned
 * @returns IDs to delete, slots to insert, and count of occupied rooms skipped
 */
export function reconcileAccommodations(
  desired: Map<string, DesiredGroup>,
  existing: TravelAccommodation[],
  occupiedIds: Set<string>,
): ReconcileResult {
  const existingGroupMap = new Map<string, TravelAccommodation[]>();
  for (const acc of existing) {
    const key = `${acc.providerId}:${acc.hotelRoomTypeId ?? ''}`;
    if (!existingGroupMap.has(key))
      existingGroupMap.set(key, []);
    existingGroupMap.get(key)!.push(acc);
  }

  const toDeleteIds: string[] = [];
  const toInsert: RoomSlot[] = [];
  let skippedOccupied = 0;

  for (const [key, desiredGroup] of desired) {
    const existingGroup = existingGroupMap.get(key) ?? [];
    const desiredCount = desiredGroup.slots.length;
    const existingCount = existingGroup.length;

    if (desiredCount > existingCount) {
      for (let i = 0; i < desiredCount - existingCount; i++) {
        toInsert.push(desiredGroup.slots[0]!);
      }
    }
    else if (desiredCount < existingCount) {
      let removed = 0;
      for (let i = existingGroup.length - 1; i >= 0 && removed < existingCount
        - desiredCount; i--) {
        const acc = existingGroup[i]!;
        if (!occupiedIds.has(acc.id)) {
          toDeleteIds.push(acc.id);
          removed++;
        }
        else {
          skippedOccupied++;
        }
      }
    }
  }

  for (const [key, existingGroup] of existingGroupMap) {
    if (!desired.has(key)) {
      for (const acc of existingGroup) {
        if (!occupiedIds.has(acc.id))
          toDeleteIds.push(acc.id);
        else skippedOccupied++;
      }
    }
  }

  return { toDeleteIds, toInsert, skippedOccupied };
}

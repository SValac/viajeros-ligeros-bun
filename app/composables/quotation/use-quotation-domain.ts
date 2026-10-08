import type { Quotation, QuotationAccommodation, QuotationBus, QuotationProvider } from '~/types/quotation';
import type { TravelAccommodation } from '~/types/travel';

type ProviderPaymentStatus = 'pending' | 'partial' | 'paid';

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
 * Total cost of a service quoted per person, rounded to cents so float artifacts of the
 * multiplication never reach the database.
 * @param unitCost - Price per person given by the provider
 * @param personCount - Number of people the service is paid for
 * @returns `unitCost × personCount` rounded to 2 decimals
 */
export function calculateProviderTotalCost(unitCost: number, personCount: number): number {
  return Math.round(unitCost * personCount * 100) / 100;
}

/**
 * Seats that can be sold: the total minus the coordinators when the quotation says they
 * take passenger seats. Never negative.
 * @param quotation - Quotation with its total seats and the coordinators option
 * @param coordinatorCount - Number of coordinators of the quotation's travel
 * @returns Seats left for paying travelers
 */
export function calculateSellableSeats(
  quotation: Pick<Quotation, 'totalSeats' | 'coordinatorsTakeSeats'>,
  coordinatorCount: number,
): number {
  const coordinatorSeats = quotation.coordinatorsTakeSeats ? coordinatorCount : 0;
  return Math.max(quotation.totalSeats - coordinatorSeats, 0);
}

/**
 * Whether a provider charges per person. Those are paid for the travelers that take the
 * service and add their unit cost straight to the seat price, without a split.
 */
export function isPerPersonProvider(provider: Pick<QuotationProvider, 'costType'>): boolean {
  return provider.costType === 'per_person';
}

/**
 * Cost of a provider with the bus full: per-person ones are their unit cost × the sellable
 * seats; the rest, their total. Used for the trip's cost and projected profit.
 * @param provider - The quotation provider
 * @param sellableSeats - Seats that can be sold (see `calculateSellableSeats`)
 */
export function calculateProviderQuotedCost(
  provider: Pick<QuotationProvider, 'costType' | 'unitCost' | 'totalCost'>,
  sellableSeats: number,
): number {
  return isPerPersonProvider(provider)
    ? calculateProviderTotalCost(provider.unitCost ?? 0, sellableSeats)
    : provider.totalCost;
}

/**
 * Calculates the price per seat for a quotation based on provider and bus costs.
 * Costs split by `'minimum'` are divided by `minimumSeatTarget`; costs split by `'total'`
 * are divided by `sellableSeats`. Per-person providers add their unit cost directly, since
 * each traveler takes one. The parts are summed and rounded up.
 * Returns 0 if there are no costs yet.
 * @param seats - The quotation's seat target and its sellable seats (see `calculateSellableSeats`)
 * @param seats.minimumSeatTarget - Divisor for costs split by `'minimum'`
 * @param seats.sellableSeats - Divisor for costs split by `'total'`
 * @param providers - Providers belonging to this quotation (pre-filtered by caller)
 * @param buses - Buses belonging to this quotation (pre-filtered by caller)
 * @returns Price per seat in whole units (ceiling), or 0 if no costs are defined
 */
export function calculateSeatPrice(
  seats: { minimumSeatTarget: number; sellableSeats: number },
  providers: Pick<QuotationProvider, 'totalCost' | 'splitType' | 'costType' | 'unitCost'>[],
  buses: Pick<QuotationBus, 'totalCost' | 'splitType'>[],
): number {
  const totalProviders = providers.filter(p => !isPerPersonProvider(p));
  const minCost = totalProviders.filter(p => (p.splitType ?? 'minimum') === 'minimum').reduce((acc, p) => acc + p.totalCost, 0);
  const occupiedCost = totalProviders.filter(p => (p.splitType ?? 'minimum') === 'total').reduce((acc, p) => acc + p.totalCost, 0);
  const minBusesCost = buses.filter(b => (b.splitType ?? 'minimum') === 'minimum').reduce((acc, b) => acc + (b.totalCost ?? 0), 0);
  const busesTotalCost = buses.filter(b => (b.splitType ?? 'minimum') === 'total').reduce((acc, b) => acc + (b.totalCost ?? 0), 0);

  const minPart = seats.minimumSeatTarget > 0 ? (minCost + minBusesCost) / seats.minimumSeatTarget : 0;
  const occupiedPart = seats.sellableSeats > 0 ? (occupiedCost + busesTotalCost) / seats.sellableSeats : 0;
  const perPersonPart = providers.filter(isPerPersonProvider).reduce((acc, p) => acc + (p.unitCost ?? 0), 0);

  if (minPart === 0 && occupiedPart === 0 && perPersonPart === 0) {
    return 0;
  }

  return Math.ceil(minPart + occupiedPart + perPersonPart);
}

/**
 * Key that ties a travel room to the quoted room type it was booked as.
 * @param providerId - Hotel (provider) UUID
 * @param roomTypeId - Hotel room type UUID
 * @returns `"providerId:roomTypeId"`
 */
export function roomTypeKey(providerId: string, roomTypeId?: string): string {
  return `${providerId}:${roomTypeId ?? ''}`;
}

/**
 * Counts a travel's rooms per hotel room type. The room count lives on the travel (it can
 * change until the trip leaves), so the quotation reads it from here.
 * @param rooms - The travel's `travel_accommodations`
 * @returns Map keyed by {@link roomTypeKey} with the number of rooms of that type
 */
export function countRoomsByType(rooms: TravelAccommodation[]): Map<string, number> {
  const counts = new Map<string, number>();
  for (const room of rooms) {
    const key = roomTypeKey(room.providerId, room.hotelRoomTypeId);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return counts;
}

/**
 * Finds the travel's rooms whose hotel room type isn't quoted any more, e.g. after a type
 * or a whole hotel is removed from the quotation. Those rooms would cost nothing, so the
 * caller deletes them when empty and refuses the change while someone is in them.
 * @param accommodations - The quotation's hotels as they'll be after the change
 * @param rooms - The travel's `travel_accommodations`
 * @returns Rooms that no quoted hotel room type covers
 */
export function findRoomsOutsideQuotation(
  accommodations: Pick<QuotationAccommodation, 'providerId' | 'details'>[],
  rooms: TravelAccommodation[],
): TravelAccommodation[] {
  const quoted = new Set(
    accommodations.flatMap(acc => acc.details.map(d => roomTypeKey(acc.providerId, d.roomTypeId))),
  );
  return rooms.filter(room => !quoted.has(roomTypeKey(room.providerId, room.hotelRoomTypeId)));
}

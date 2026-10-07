/**
 * `'coordinator'` rows belong to the travel's coordinators: they can take a seat and a
 * room like anyone else, but never pay, so payments only look at `'traveler'` rows.
 */
export type TravelerKind = 'traveler' | 'coordinator';

export type Traveler = {
  id: string;
  kind: TravelerKind;
  /** Set only on `'coordinator'` rows. */
  coordinatorId?: string;
  firstName: string;
  lastName: string;
  phone: string;
  travelId: string;
  travelBusId: string;
  /** `null` only for a coordinator without a seat. */
  seat: number | null;
  boardingPoint: string;
  isRepresentative: boolean;
  representativeId?: string;
  createdAt: string;
  updatedAt: string;
};

/**
 * A traveler's room in one hotel. A traveler holds at most one room per hotel,
 * so on a multi-hotel travel they have one assignment per hotel.
 */
export type TravelerRoomAssignment = {
  travelerId: string;
  travelAccommodationId: string;
  /** Hotel of the room (the accommodation's provider). */
  providerId: string;
  travelId: string;
};

export type TravelerFormData = Omit<Traveler, 'id' | 'kind' | 'coordinatorId' | 'seat' | 'createdAt' | 'updatedAt'> & {
  id?: string;
  seat: number;
};

export type TravelerUpdateData = Partial<TravelerFormData>;

export type TravelerFilters = {
  travelId?: string;
  travelBusId?: string;
  representativeId?: string;
};

export type TravelerWithChildren = Traveler & {
  children?: Traveler[];
};

export type TravelerSeatChangeOperation = 'moved' | 'swapped';

export type TravelerSeatChangeResult = {
  operation: TravelerSeatChangeOperation;
  travelId: string;
  sourceTravelerId: string;
  targetTravelerId: string | null;
  sourceSeat: number;
  targetSeat: number;
  travelers: Array<{
    id: string;
    seat: number;
  }>;
};

export type TravelerSeatChangeErrorCode
  = | 'invalid-travel-bus'
    | 'invalid-target-seat'
    | 'traveler-not-found'
    | 'same-seat-selected'
    | 'seat-conflict'
    | 'unknown-error';

export class TravelerSeatChangeError extends Error {
  code: TravelerSeatChangeErrorCode;

  constructor(code: TravelerSeatChangeErrorCode, message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = 'TravelerSeatChangeError';
    this.code = code;
  }
}

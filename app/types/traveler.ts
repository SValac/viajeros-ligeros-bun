export type Traveler = {
  id: string;
  firstName: string;
  lastName: string;
  phone: string;
  travelId: string;
  travelBusId: string;
  seat: number;
  boardingPoint: string;
  isRepresentative: boolean;
  representativeId?: string;
  travelAccommodationId?: string;
  createdAt: string;
  updatedAt: string;
};

export type TravelerFormData = Omit<Traveler, 'id' | 'createdAt' | 'updatedAt'> & {
  id?: string;
};

export type TravelerUpdateData = Partial<TravelerFormData>;

export type TravelerFilters = {
  travelId?: string;
  travelBusId?: string;
  representativeId?: string;
  travelAccommodationId?: string;
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

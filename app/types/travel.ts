export type TravelStatus = 'pending' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled';

export type MapLocation = {
  lat: number;
  lng: number;
  placeId?: string;
  address?: string;
};

export type TravelActivity = {
  id: string;
  day: number;
  title: string;
  description: string;
  time?: string;
  location?: string;
  mapLocation?: MapLocation;
};

export type TravelBus = {
  id: string;
  busId?: string;
  providerId: string;
  model?: string;
  brand?: string;
  year?: number;
  operator1Name: string;
  operator1Phone: string;
  operator2Name?: string;
  operator2Phone?: string;
  seatCount: number;
  rentalPrice: number;
};

export type TravelService = {
  id: string;
  name: string;
  description?: string;
  included: boolean;
  providerId?: string;
};

export type Travel = {
  id: string;
  destination: string;
  startDate: string;
  endDate: string;
  price: number;
  description: string;
  imageUrl?: string;
  status: TravelStatus;
  coordinatorIds: string[];
  itinerary: TravelActivity[];
  services: TravelService[];
  buses: TravelBus[];
  internalNotes?: string;
  totalOperationCost?: number;
  minimumSeats?: number;
  projectedProfit?: number;
  accumulatedTravelers?: number;
  createdAt: string;
  updatedAt: string;
};

export type TravelFormData = Omit<Travel, 'id' | 'createdAt' | 'updatedAt'> & {
  id?: string;
};

export type TravelUpdateData = Omit<Travel, 'id' | 'createdAt' | 'updatedAt'>;

export type TravelFilters = {
  status?: TravelStatus;
  dateFrom?: string;
  dateTo?: string;
};

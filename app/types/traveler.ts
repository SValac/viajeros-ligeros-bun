export type Traveler = {
  id: string;
  firstName: string;
  lastName: string;
  phone: string;
  travelId: string;
  travelBusId: string;
  seat: string;
  boardingPoint: string;
  isRepresentative: boolean;
  representativeId?: string;
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
};

export type TravelerWithChildren = Traveler & {
  children?: Traveler[];
};

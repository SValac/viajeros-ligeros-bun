export type Bus = {
  id: string;
  providerId: string;
  model?: string;
  brand?: string;
  year?: number;
  seatCount: number;
  rentalPrice: number;
  active: boolean;
  createdAt: string;
  updatedAt: string;
};

export type BusFormData = Omit<Bus, 'id' | 'createdAt' | 'updatedAt'> & {
  id?: string;
};

export type BusUpdateData = Omit<Bus, 'id' | 'createdAt' | 'updatedAt'>;

export type BedSize = 'single' | 'double' | 'queen' | 'king';

export type BedConfiguration = {
  size: BedSize;
  count: number;
};

export type HotelRoomType = {
  id: string;
  maxOccupancy: number;
  roomCount: number;
  beds: BedConfiguration[];
  pricePerNight: number;
  costPerPerson: number;
  additionalDetails?: string;
  createdAt: string;
  updatedAt: string;
};

export type HotelRoomData = {
  id: string;
  providerId: string;
  totalRooms: number;
  roomTypes: HotelRoomType[];
  createdAt: string;
  updatedAt: string;
};

export type HotelRoomTypeFormData = Omit<HotelRoomType, 'id' | 'createdAt' | 'updatedAt' | 'costPerPerson'>;

export type HotelRoomDataFormData = Omit<HotelRoomData, 'id' | 'createdAt' | 'updatedAt' | 'roomTypes'> & {
  id?: string;
};

export type RoomTypesByOccupancy = {
  occupancy: number;
  totalRooms: number;
  types: HotelRoomType[];
};

export type BedSize = 'individual' | 'matrimonial' | 'queen' | 'king';

export type BedConfiguration = {
  tamaño: BedSize;
  cantidad: number;
};

export type HotelRoomType = {
  id: string;
  ocupacionMaxima: number;
  cantidadHabitaciones: number;
  camas: BedConfiguration[];
  precioPorNoche: number;
  costoHabitacionPorPersona: number; // precioPorNoche / ocupacionMaxima (calculado automáticamente)
  detallesAdicionales?: string;
  createdAt: string;
  updatedAt: string;
};

export type HotelRoomData = {
  id: string;
  providerId: string;
  totalHabitaciones: number;
  roomTypes: HotelRoomType[];
  createdAt: string;
  updatedAt: string;
};

export type HotelRoomTypeFormData = Omit<HotelRoomType, 'id' | 'createdAt' | 'updatedAt' | 'costoHabitacionPorPersona'>;

export type HotelRoomDataFormData = Omit<HotelRoomData, 'id' | 'createdAt' | 'updatedAt' | 'roomTypes'> & {
  id?: string;
};

export type RoomTypesByOccupancy = {
  ocupacion: number;
  totalHabitaciones: number;
  tipos: HotelRoomType[];
};

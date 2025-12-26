// Estado de un viaje (enum como union type)
export type TravelStatus = 'pendiente' | 'confirmado' | 'en-curso' | 'completado' | 'cancelado';

// Actividad del itinerario
export type TravelActivity = {
  id: string;
  dia: number;
  titulo: string;
  descripcion: string;
  hora?: string;
  ubicacion?: string;
};

// Servicio incluido
export type TravelService = {
  id: string;
  nombre: string;
  descripcion?: string;
  incluido: boolean;
};

// Modelo principal de viaje
export type Travel = {
  id: string;
  destino: string;
  fechaInicio: string; // ISO date string para facilitar serialización
  fechaFin: string;
  precio: number;
  descripcion: string;
  imagenUrl?: string;
  estado: TravelStatus;
  cliente: string;
  itinerario: TravelActivity[];
  servicios: TravelService[];
  notasInternas?: string;
  createdAt: string;
  updatedAt: string;
};

// Tipo para formulario (campos opcionales durante creación)
export type TravelFormData = Omit<Travel, 'id' | 'createdAt' | 'updatedAt'> & {
  id?: string;
};

// Tipo para actualización de viajes (excluye campos inmutables)
export type TravelUpdateData = Omit<Travel, 'id' | 'createdAt' | 'updatedAt'>;

// Tipo para filtros de tabla
export type TravelFilters = {
  estado?: TravelStatus;
  cliente?: string;
  fechaDesde?: string;
  fechaHasta?: string;
};

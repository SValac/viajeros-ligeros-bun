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

// Autobús asignado a un viaje
export type TravelBus = {
  id: string;
  busId?: string; // Optional reference to catalog Bus.id
  providerId: string; // Required - agencias-autobus provider
  modelo?: string;
  marca?: string;
  año?: number;
  operador1Nombre: string; // Required
  operador1Telefono: string; // Required
  operador2Nombre?: string;
  operador2Telefono?: string;
  cantidadAsientos: number; // Required
  precioRenta: number; // Required (may differ from catalog)
};

// Servicio incluido
export type TravelService = {
  id: string;
  nombre: string;
  descripcion?: string;
  incluido: boolean;
  providerId?: string; // Vinculación opcional con proveedor
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
  coordinadorIds: string[];
  itinerario: TravelActivity[];
  servicios: TravelService[];
  autobuses: TravelBus[];
  notasInternas?: string;
  costoTotalOperacion?: number;
  asientoMinimo?: number;
  gananciaProyectada?: number;
  acumuladoViajeros?: number;
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
  fechaDesde?: string;
  fechaHasta?: string;
};

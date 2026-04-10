// Modelo principal de viajero
export type Traveler = {
  id: string;
  nombre: string;
  apellido: string;
  telefono: string;
  travelId: string; // FK → Travel.id
  travelBusId: string; // FK → TravelBus.id dentro del viaje
  asiento: string;
  puntoAbordaje: string;
  esRepresentante: boolean;
  representanteId?: string; // FK → Traveler.id (solo si esRepresentante=false)
  createdAt: string;
  updatedAt: string;
};

// Tipo para formulario (campos editables, sin campos generados)
export type TravelerFormData = Omit<Traveler, 'id' | 'createdAt' | 'updatedAt'> & {
  id?: string;
};

// Tipo para actualización de viajero (todos los campos editables opcionales)
export type TravelerUpdateData = Partial<TravelerFormData>;

// Tipo para filtros de tabla
export type TravelerFilters = {
  travelId?: string;
  travelBusId?: string;
  representanteId?: string;
};

// Tipo para viajero con hijos (árbol de representante + acompañantes)
export type TravelerWithChildren = Traveler & {
  children?: Traveler[];
};

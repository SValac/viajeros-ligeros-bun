// Bus model for the units catalog within agencias-autobus providers
export type Bus = {
  id: string;
  providerId: string; // Relation to Provider (agencias-autobus category)
  modelo?: string;
  marca?: string;
  año?: number;
  cantidadAsientos: number; // Required
  precioRenta: number; // Required (reference/base price)
  activo: boolean; // Soft delete / active status
  createdAt: string;
  updatedAt: string;
};

// Form data type (omits generated fields)
export type BusFormData = Omit<Bus, 'id' | 'createdAt' | 'updatedAt'> & {
  id?: string;
};

// Update data type (excludes immutable fields)
export type BusUpdateData = Omit<Bus, 'id' | 'createdAt' | 'updatedAt'>;

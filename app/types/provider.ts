// Provider category as union type (extensible by adding more values)
export type ProviderCategory
  = 'guias'
    | 'transporte'
    | 'hospedaje'
    | 'operadores-autobus'
    | 'comidas'
    | 'otros';

// Contact information for provider
export type ProviderContact = {
  nombre?: string;
  telefono?: string;
  email?: string;
  notas?: string;
};

// Location information for provider
export type ProviderLocation = {
  ciudad: string;
  estado: string;
  pais: string;
};

// Main provider model
export type Provider = {
  id: string;
  nombre: string;
  categoria: ProviderCategory;
  descripcion?: string;
  ubicacion: ProviderLocation;
  contacto: ProviderContact;
  activo: boolean; // Soft delete / active status
  createdAt: string;
  updatedAt: string;
};

// Form data type (omits generated fields)
export type ProviderFormData = Omit<Provider, 'id' | 'createdAt' | 'updatedAt'> & {
  id?: string;
};

// Update data type (excludes immutable fields)
export type ProviderUpdateData = Omit<Provider, 'id' | 'createdAt' | 'updatedAt'>;

// Filters for provider table
export type ProviderFilters = {
  categoria?: ProviderCategory;
  activo?: boolean;
  searchTerm?: string;
};

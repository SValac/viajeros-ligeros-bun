export const PROVIDER_CATEGORY = {
  GUIDES: 'guides',
  TRANSPORTATION: 'transportation',
  ACCOMMODATION: 'accommodation',
  BUS_AGENCIES: 'bus_agencies',
  FOOD_SERVICES: 'food_services',
  OTHER: 'other',
} as const;

export type ProviderCategory = typeof PROVIDER_CATEGORY[keyof typeof PROVIDER_CATEGORY];

export type ProviderContact = {
  name?: string;
  phone?: string;
  email?: string;
  notes?: string;
};

export type ProviderLocation = {
  city: string;
  state: string;
  country: string;
};

export type Provider = {
  id: string;
  name: string;
  category: ProviderCategory;
  description?: string;
  location: ProviderLocation;
  contact: ProviderContact;
  active: boolean;
  createdAt: string;
  updatedAt: string;
};

export type ProviderFormData = Omit<Provider, 'id' | 'createdAt' | 'updatedAt'> & {
  id?: string;
};

export type ProviderUpdateData = Omit<Provider, 'id' | 'createdAt' | 'updatedAt'>;

export type ProviderFilters = {
  category?: ProviderCategory;
  active?: boolean;
  searchTerm?: string;
  city?: string;
  state?: string;
};

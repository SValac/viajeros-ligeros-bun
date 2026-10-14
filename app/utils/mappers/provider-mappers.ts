import type { Json, Tables } from '~/types/database.types';
import type { Provider, ProviderFormData } from '~/types/provider';
import type { MapLocation } from '~/types/travel';

export function mapProviderRowToDomain(row: Tables<'providers'>): Provider {
  const mapLocationData = row.map_location as MapLocation | null;
  return {
    id: row.id,
    name: row.name,
    category: row.category,
    description: row.description ?? undefined,
    location: {
      city: row.location_city,
      state: row.location_state,
      country: row.location_country,
      mapLocation: mapLocationData ?? undefined,
    },
    contact: {
      name: row.contact_name ?? undefined,
      phone: row.contact_phone ?? undefined,
      email: row.contact_email ?? undefined,
      notes: row.contact_notes ?? undefined,
    },
    active: row.active,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function mapProviderToInsert(data: ProviderFormData): Omit<Tables<'providers'>, 'id' | 'created_at' | 'updated_at' | 'owner_id'> {
  return {
    name: data.name,
    category: data.category,
    description: data.description ?? null,
    location_city: data.location.city,
    location_state: data.location.state,
    location_country: data.location.country,
    map_location: (data.location.mapLocation as unknown as Json) ?? null,
    contact_name: data.contact.name ?? null,
    contact_phone: data.contact.phone ?? null,
    contact_email: data.contact.email ?? null,
    contact_notes: data.contact.notes ?? null,
    active: data.active,
  };
}

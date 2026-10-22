import type { Json, Tables, TablesUpdate } from '~/types/database.types';
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

export function mapProviderLocationToRow(location: ProviderFormData['location']) {
  return {
    location_city: location.city,
    location_state: location.state,
    location_country: location.country,
    map_location: (location.mapLocation as unknown as Json) ?? null,
  } satisfies TablesUpdate<'providers'>;
}

export function mapProviderContactToRow(contact: ProviderFormData['contact']) {
  return {
    contact_name: contact.name ?? null,
    contact_phone: contact.phone ?? null,
    contact_email: contact.email ?? null,
    contact_notes: contact.notes ?? null,
  } satisfies TablesUpdate<'providers'>;
}

export function mapProviderToInsert(data: ProviderFormData): Omit<Tables<'providers'>, 'id' | 'created_at' | 'updated_at' | 'owner_id'> {
  return {
    name: data.name,
    category: data.category,
    description: data.description ?? null,
    ...mapProviderLocationToRow(data.location),
    ...mapProviderContactToRow(data.contact),
    active: data.active,
  };
}

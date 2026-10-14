import type { Bus, BusFormData } from '~/types/bus';
import type { Tables } from '~/types/database.types';

export function mapBusRowToDomain(row: Tables<'buses'>): Bus {
  return {
    id: row.id,
    providerId: row.provider_id,
    brand: row.brand ?? undefined,
    model: row.model ?? undefined,
    year: row.year ?? undefined,
    seatCount: row.seat_count,
    active: row.active,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function mapBusToInsert(data: BusFormData): Omit<Tables<'buses'>, 'id' | 'created_at' | 'updated_at'> {
  return {
    provider_id: data.providerId,
    brand: data.brand ?? null,
    model: data.model ?? null,
    year: data.year ?? null,
    seat_count: data.seatCount,
    active: data.active,
  };
}

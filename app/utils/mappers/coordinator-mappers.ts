import type { Coordinator, CoordinatorFormData } from '~/types/coordinator';
import type { Tables } from '~/types/database.types';

export function mapCoordinatorRowToDomain(row: Tables<'coordinators'>): Coordinator {
  return {
    id: row.id,
    name: row.name,
    age: row.age,
    phone: row.phone,
    email: row.email,
    userId: row.user_id,
    notes: row.notes ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function mapCoordinatorToInsert(data: CoordinatorFormData): Omit<Tables<'coordinators'>, 'id' | 'created_at' | 'updated_at' | 'owner_id'> {
  return {
    name: data.name,
    age: data.age,
    phone: data.phone,
    email: data.email,
    notes: data.notes ?? null,
    user_id: null,
  };
}

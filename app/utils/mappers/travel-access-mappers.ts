import type { Tables } from '~/types/database.types';
import type { TravelAccessCode, TravelAccessCodeGenerated } from '~/types/travel-access';

export function mapTravelAccessCodeRowToDomain(row: Omit<Tables<'travel_access_codes'>, 'code_hash'>): TravelAccessCode {
  return {
    id: row.id,
    travelId: row.travel_id,
    expiresAt: row.expires_at,
    revokedAt: row.revoked_at,
    createdAt: row.created_at,
    createdBy: row.created_by,
  };
}

export function mapGeneratedRpcResultToDomain(data: Omit<TravelAccessCodeGenerated, 'revokedAt'>): TravelAccessCodeGenerated {
  return {
    id: data.id,
    code: data.code,
    travelId: data.travelId,
    expiresAt: data.expiresAt,
    revokedAt: null,
    createdAt: data.createdAt,
    createdBy: data.createdBy,
  };
}

import type { TravelAccessCode, TravelAccessCodeGenerated } from '~/types/travel-access';

import { mapGeneratedRpcResultToDomain } from '~/utils/mappers';

export function useTravelAccessRepository() {
  const supabase = useSupabase();

  async function fetchActiveCode(travelId: string): Promise<TravelAccessCode | null> {
    const { data, error } = await supabase
      .from('travel_access_codes')
      .select('id, travel_id, expires_at, revoked_at, created_by, created_at')
      .eq('travel_id', travelId)
      .is('revoked_at', null)
      .maybeSingle();

    if (error) {
      throw error;
    }

    if (data) {
      return mapTravelAccessCodeRowToDomain(data);
    }

    return null;
  }

  async function generate(travelId: string): Promise<TravelAccessCodeGenerated> {
    const { data, error } = await supabase.rpc('generate_travel_access_code', { p_travel_id: travelId });

    if (error) {
      throw error;
    }

    return mapGeneratedRpcResultToDomain(data as unknown as Omit<TravelAccessCodeGenerated, 'revokedAt'>);
  }

  async function revoke(travelId: string): Promise<void> {
    const { error } = await supabase.rpc('revoke_travel_access_code', { p_travel_id: travelId });

    if (error) {
      throw error;
    }
  }

  return {
    fetchActiveCode,
    generate,
    revoke,
  };
}

import { useQuotationContext } from '~/composables/quotation/use-quotation-context';
import { countRoomsByType, roomTypeKey } from '~/composables/quotation/use-quotation-domain';
import { travelDetailQuery } from '~/queries/travels';

/**
 * Rooms the quotation's travel holds per hotel room type. They're added on the travel's rooms
 * page, not in the quotation, so they come from travelDetailQuery.
 * @param quotationId - The quotation
 * @returns `roomCounts` (by `roomTypeKey`) and `getRoomCount(providerId, roomTypeId)`, 0 when none
 */
export function useQuotationRoomCounts(quotationId: MaybeRefOrGetter<string>) {
  const { travelId } = useQuotationContext(quotationId);
  const { data: travel } = useQuery(() => travelDetailQuery(travelId.value));
  const roomCounts = computed(() => countRoomsByType(travel.value?.accommodations ?? []));

  function getRoomCount(providerId: string, roomTypeId: string): number {
    return roomCounts.value.get(roomTypeKey(providerId, roomTypeId)) ?? 0;
  }

  return { roomCounts, getRoomCount };
}

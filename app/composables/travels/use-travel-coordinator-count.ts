import { travelDetailQuery } from '~/queries/travels';

/**
 * How many coordinators a travel has, read from travelDetailQuery (the same cache entry the
 * screen already uses, so no extra request). The quotation store's seat getters
 * (`getAsientosVendibles` and the ones built on it) take it as a parameter.
 * @param travelId - The travel; while it's `undefined` the count is 0
 * @returns The coordinator count, 0 until the travel loads
 */
export function useTravelCoordinatorCount(travelId: MaybeRefOrGetter<string | undefined>) {
  const { data: travel } = useQuery(() => travelDetailQuery(toValue(travelId)));
  return computed(() => travel.value?.coordinatorIds.length ?? 0);
}

import { useQueryLoadState } from '~/queries/load-state';
import { quotationByTravelQuery } from '~/queries/quotations';

/**
 * Loads a travel's quotation (quotationByTravelQuery copies it into the store) and reads it back.
 * Already cached and fresh = no request.
 * @param travelId - The travel; while it's `undefined` nothing loads
 * @returns `quotation` (`undefined` until it loads or when the travel has none), `load` for
 *   `<LoadState v-bind="load">` and `refetch` for its retry
 */
export function useTravelQuotation(travelId: MaybeRefOrGetter<string | undefined>) {
  const quotationStore = useQuotationStore();
  const query = useQuery(() => quotationByTravelQuery(toValue(travelId)));
  const load = useQueryLoadState(query);
  const quotation = computed(() => {
    const id = toValue(travelId);
    return id ? quotationStore.getQuotationByTravel(id) : undefined;
  });

  return { quotation, load, refetch: query.refetch };
}

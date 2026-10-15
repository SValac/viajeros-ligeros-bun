import { useTravelCoordinatorCount } from '~/composables/travels/use-travel-coordinator-count';

/**
 * What a quotation component needs around its `quotationId`: the quotation from the store, its
 * travel and how many coordinators that travel has (the seat getters take it as a parameter).
 * The coordinator count reads travelDetailQuery, which the quotation page already loads.
 * @param quotationId - The quotation
 * @returns `quotation` and `travelId` (`undefined` until the quotation loads) and `coordinatorCount`
 */
export function useQuotationContext(quotationId: MaybeRefOrGetter<string>) {
  const quotationStore = useQuotationStore();
  const quotation = computed(() => quotationStore.quotations.find(q => q.id === toValue(quotationId)));
  const travelId = computed(() => quotation.value?.travelId);
  const coordinatorCount = useTravelCoordinatorCount(travelId);

  return { quotation, travelId, coordinatorCount };
}

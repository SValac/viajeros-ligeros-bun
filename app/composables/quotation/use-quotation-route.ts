// State shared by app/pages/quotations/[id].vue and its tabs (app/pages/quotations/[id]/*).
// The route's `id` param is the travel id: the quotation is 1:1 with the travel.
export function useQuotationRoute() {
  const route = useRoute();
  const quotationStore = useQuotationStore();

  const travelId = computed(() => route.params.id as string);
  const quotation = computed(() => quotationStore.getQuotationByTravel(travelId.value));
  const readonly = computed(() => quotation.value?.status === 'confirmed');

  return { travelId, quotation, readonly };
}

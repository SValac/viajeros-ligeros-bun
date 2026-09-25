// Estado compartido por app/pages/quotations/[id].vue y sus pestañas (app/pages/quotations/[id]/*).
// El param `id` de la ruta es el id del viaje: la cotización es 1:1 con el viaje.
export function useQuotationRoute() {
  const route = useRoute();
  const cotizacionStore = useCotizacionStore();

  const travelId = computed(() => route.params.id as string);
  const quotation = computed(() => cotizacionStore.getCotizacionByTravel(travelId.value));
  const readonly = computed(() => quotation.value?.status === 'confirmed');

  return { travelId, quotation, readonly };
}

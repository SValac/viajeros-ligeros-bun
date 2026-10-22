import { toErrorMessage } from '~/utils/error-message';

/**
 * Loads a travel's traveler payments and account configs into the payment store, again
 * each time the travel changes. Screens read them with the store's getters.
 * @param travelId - The travel; while it's `undefined` nothing loads
 * @returns `loadState` for `<LoadState v-bind="loadState">` (or a `loading` figure) and `refetch`
 *   for its retry
 */
export function useTravelPayments(travelId: MaybeRefOrGetter<string | undefined>) {
  const paymentStore = usePaymentStore();
  const toast = useToast();

  // Until the current travel's payments arrive, its balances would read $0
  const loadedTravelId = shallowRef<string>();
  const loadError = shallowRef<unknown>(null);

  async function load(id: string) {
    loadError.value = null;
    try {
      await paymentStore.fetchByTravel(id);
      if (id === toValue(travelId))
        loadedTravelId.value = id;
    }
    catch (e) {
      // A late answer for a travel the screen already left
      if (id !== toValue(travelId))
        return;
      loadError.value = e;
      toast.add({ title: 'No se pudieron cargar los pagos', description: toErrorMessage(e, 'Recarga la página'), color: 'error' });
    }
  }

  watch(() => toValue(travelId), (id) => {
    if (id)
      load(id);
  }, { immediate: true });

  return {
    loadState: reactive({
      isLoaded: computed(() => !!loadedTravelId.value && loadedTravelId.value === toValue(travelId)),
      loadError: computed(() => loadError.value),
    }),
    refetch: () => {
      const id = toValue(travelId);
      return id ? load(id) : Promise.resolve();
    },
  };
}

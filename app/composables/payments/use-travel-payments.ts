import { toErrorMessage } from '~/utils/error-message';

/**
 * Loads a travel's traveler payments and account configs into the payment store, again
 * each time the travel changes. Screens read them with the store's getters.
 * @param travelId - The travel; while it's `undefined` nothing loads
 */
export function useTravelPayments(travelId: MaybeRefOrGetter<string | undefined>) {
  const paymentStore = usePaymentStore();
  const toast = useToast();

  watch(() => toValue(travelId), (id) => {
    if (!id)
      return;
    paymentStore.fetchByTravel(id).catch((e) => {
      toast.add({ title: 'No se pudieron cargar los pagos', description: toErrorMessage(e, 'Recarga la página'), color: 'error' });
    });
  }, { immediate: true });
}

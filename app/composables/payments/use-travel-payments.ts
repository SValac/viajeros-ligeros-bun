/**
 * Loads a travel's traveler payments and account configs into the payment store, again
 * each time the travel changes. Screens read them with the store's getters.
 * @param travelId - The travel; while it's `undefined` nothing loads
 */
export function useTravelPayments(travelId: MaybeRefOrGetter<string | undefined>) {
  const paymentStore = usePaymentStore();

  watch(() => toValue(travelId), (id) => {
    if (id)
      paymentStore.fetchByTravel(id);
  }, { immediate: true });
}

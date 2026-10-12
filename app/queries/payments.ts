import { summarizeTravelPayments } from '~/composables/payments/use-payments-domain';
import { usePaymentsRepository } from '~/composables/payments/use-payments-repository';

export const paymentKeys = {
  root: ['payments'] as const,
  travelTotals: (travelIds: string[]) => ['payments', 'travel-totals', travelIds] as const,
};

/**
 * Expected, collected, balance and percent per travel, computed from the travels' account
 * configs and payments. Every id gets an entry (zeros if it has neither).
 * Pass the ids sorted: the same set in another order would be another cache entry.
 * An empty list disables the query.
 * Usage: `useQuery(() => travelPaymentTotalsQuery(sortedIds.value))`.
 */
export const travelPaymentTotalsQuery = defineQueryOptions((travelIds: string[]) => ({
  key: paymentKeys.travelTotals(travelIds),
  query: async () => {
    // Inside the query, not at module level: the repository needs the Nuxt app context
    const repository = usePaymentsRepository();
    const [configs, payments] = await Promise.all([
      repository.fetchConfigsByTravels(travelIds),
      repository.fetchPaymentsByTravels(travelIds),
    ]);

    return summarizeTravelPayments(travelIds, configs, payments);
  },
  enabled: travelIds.length > 0,
}));

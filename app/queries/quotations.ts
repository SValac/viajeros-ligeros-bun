import { useQuotationRepository } from '~/composables/quotation/use-quotation-repository';
import { useCotizacionStore } from '~/stores/use-cotizacion-store';

export const quotationKeys = {
  root: ['quotations'] as const,
  byTravel: (travelId: string) => ['quotations', 'by-travel', travelId] as const,
};

/**
 * A travel's quotation with its providers, lodging, buses, expenses, public prices and their
 * payments. `data` is `null` once resolved if the travel has no quotation.
 *
 * Screens keep reading the cotizacion store: each fetch copies the result into it, and its
 * getters and write actions work on that copy. The query decides when to fetch (dedupe,
 * `staleTime`, refetch on window focus, invalidation after writes); mount it with `useQuery`
 * so the copy stays fresh and the screen gets `status`/`error` for its loading states.
 * Writes invalidate `quotationKeys.byTravel(travelId)`.
 * An empty or missing `travelId` disables the query.
 * Usage: `useQuery(() => quotationByTravelQuery(travelId.value))`.
 */
export const quotationByTravelQuery = defineQueryOptions((travelId: string | undefined) => ({
  key: quotationKeys.byTravel(travelId ?? ''),
  query: async ({ signal }) => {
    // `enabled` keeps the query from running without a travelId, hence the `!`.
    const result = await useQuotationRepository().fetchByTravel(travelId!);
    // An invalidation (after a write) aborts this fetch and starts a new one: the old
    // result may predate the write, so only the current fetch updates the store.
    if (!signal.aborted)
      useCotizacionStore().hydrateTravel(travelId!, result);
    return result;
  },
  enabled: !!travelId,
}));

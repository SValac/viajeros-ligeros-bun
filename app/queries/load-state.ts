import type { UseQueryReturn } from '@pinia/colada';

/**
 * The `LoadState` props (`isLoaded`, `loadError`) for a query: `<LoadState v-bind="state" …>`.
 * - `isLoaded`: `false` until the first load resolves. `null` is a resolved answer ("no
 *   quotation", "travel not found"): the slot still needs a `v-if` on the record. A list with
 *   `placeholderData` stays loaded while the next page or month loads.
 * - `loadError`: the last load's error, hidden while a retry runs so the screen shows the spinner
 *   again (Colada's `status` stays `'error'` during the retry).
 * @param query - What `useQuery` returned
 */
export function useQueryLoadState(query: Pick<UseQueryReturn<unknown>, 'data' | 'error' | 'asyncStatus'>) {
  return reactive({
    isLoaded: computed(() => query.data.value !== undefined),
    loadError: computed(() => (query.asyncStatus.value === 'loading' ? null : query.error.value)),
  });
}

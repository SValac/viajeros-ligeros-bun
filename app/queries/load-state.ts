import type { UseQueryReturn } from '@pinia/colada';

import { useQuery } from '@pinia/colada';

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

/**
 * `useQuery` plus its `LoadState` props, for the screens that put the query in a `LoadState`:
 * `const { data, refetch, loadState } = useQueryWithLoadState(() => travelDetailQuery(id.value))`.
 * @param options - What `useQuery` takes
 * @returns Everything `useQuery` returns, plus `loadState` (see `useQueryLoadState`)
 */
export function useQueryWithLoadState<TData>(options: Parameters<typeof useQuery<TData>>[0]) {
  const query = useQuery(options);
  return { ...query, loadState: useQueryLoadState(query) };
}

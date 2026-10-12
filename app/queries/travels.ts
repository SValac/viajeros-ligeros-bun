import type { TravelSummaryFilters } from '~/types/travel';

import { useTravelRepository } from '~/composables/travels/use-travel-repository';

export const travelKeys = {
  root: ['travels'] as const,
  stats: () => ['travels', 'stats'] as const,
  detail: (id: string) => ['travels', 'detail', id] as const,
  list: (filters: TravelSummaryFilters) => ['travels', 'list', filters] as const,
};

/**
 * A single travel with its relations and traveler count. `data` is `undefined` while loading (or on error)
 * and `null` once resolved if the travel doesn't exist or RLS hides it.
 * An empty or missing `id` (e.g. no travel picked yet in a form) disables the query: no
 * request is made and `data` stays `undefined`.
 * Usage: `useQuery(() => travelDetailQuery(id.value))`.
 */
export const travelDetailQuery = defineQueryOptions((id: string | undefined) => ({
  key: travelKeys.detail(id ?? ''),
  // `enabled` keeps the query from running without an id
  query: () => useTravelRepository().fetchById(id!),
  enabled: !!id,
}));

/**
 * Travel summaries for list screens. Each filter combination is its own cache entry,
 * so going back to a page or month already seen is instant (within `staleTime`).
 * Usage: `useQuery(() => travelListQuery(filters.value))`.
 */
export const travelListQuery = defineQueryOptions((filters: TravelSummaryFilters) => ({
  key: travelKeys.list(filters),
  query: () => useTravelRepository().fetchSummaries(filters),
}));

/**
 * Travel totals per status for the dashboard cards. Lives under `travelKeys.root`, so
 * invalidating `['travels']` after a write refreshes it along with lists and details.
 * Usage: `useQuery(() => travelStatsQuery())`.
 */
export const travelStatsQuery = defineQueryOptions(() => ({
  key: travelKeys.stats(),
  query: () => useTravelRepository().fetchStatusCounts(),
}));

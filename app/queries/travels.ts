import { useTravelRepository } from '~/composables/travels/use-travel-repository';

export const travelKeys = {
  root: ['travels'] as const,
  detail: (id: string) => ['travels', 'detail', id] as const,
};

/**
 * A single travel with its relations. `data` is `undefined` while loading (or on error)
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

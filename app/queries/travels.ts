import { useTravelRepository } from '~/composables/travels/use-travel-repository';

export const travelKeys = {
  root: ['travels'] as const,
  detail: (id: string) => ['travels', 'detail', id] as const,
};

/**
 * A single travel with its relations. `data` is `undefined` while loading (or on error)
 * and `null` once resolved if the travel doesn't exist or RLS hides it.
 * Usage: `useQuery(() => travelDetailQuery(id.value))`.
 */
export const travelDetailQuery = defineQueryOptions((id: string) => ({
  key: travelKeys.detail(id),
  query: () => useTravelRepository().fetchById(id),
}));

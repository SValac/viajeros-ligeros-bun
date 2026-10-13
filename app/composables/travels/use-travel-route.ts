import { useQueryLoadState } from '~/queries/load-state';
import { travelDetailQuery } from '~/queries/travels';

// State shared by app/pages/travels/[id].vue and its tabs (app/pages/travels/[id]/*).
// They all use the same query key, so Colada makes a single request for the travel.
export function useTravelRoute() {
  const route = useRoute();

  const travelId = computed(() => route.params.id as string);
  const query = useQuery(() => travelDetailQuery(travelId.value));
  const { data: travel, status, error, refetch } = query;
  /** Props for `<LoadState>` around anything that reads `travel`. */
  const loadState = useQueryLoadState(query);

  return { travelId, travel, status, error, refetch, loadState };
}

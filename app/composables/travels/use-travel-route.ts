import { useQueryLoadState } from '~/queries/load-state';
import { travelDetailQuery } from '~/queries/travels';

// Estado compartido por app/pages/travels/[id].vue y sus pestañas (app/pages/travels/[id]/*).
// Todas usan la misma clave de query, así que Colada hace una sola petición del viaje.
export function useTravelRoute() {
  const route = useRoute();

  const travelId = computed(() => route.params.id as string);
  const query = useQuery(() => travelDetailQuery(travelId.value));
  const { data: travel, status, error, refetch } = query;
  /** Props for `<LoadState>` around anything that reads `travel`. */
  const loadState = useQueryLoadState(query);

  return { travelId, travel, status, error, refetch, loadState };
}

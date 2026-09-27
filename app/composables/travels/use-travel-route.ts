// Estado compartido por app/pages/travels/[id].vue y sus pestañas (app/pages/travels/[id]/*).
export function useTravelRoute() {
  const route = useRoute();
  const travelsStore = useTravelsStore();

  const travelId = computed(() => route.params.id as string);
  const travel = computed(() => travelsStore.getTravelById(travelId.value));

  return { travelId, travel };
}

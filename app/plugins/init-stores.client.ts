export default defineNuxtPlugin(() => {
  const providerStore = useProviderStore();
  const coordinatorStore = useCoordinatorStore();
  const busStore = useBusStore();
  const hotelRoomStore = useHotelRoomStore();

  Promise.all([
    providerStore.fetchAll(),
    coordinatorStore.fetchAll(),
    busStore.fetchAll(),
    hotelRoomStore.fetchAll(),
  ]);
});

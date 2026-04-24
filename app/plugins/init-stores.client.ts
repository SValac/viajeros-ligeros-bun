export default defineNuxtPlugin(() => {
  const providerStore = useProviderStore();
  const coordinatorStore = useCoordinatorStore();
  const busStore = useBusStore();
  const hotelRoomStore = useHotelRoomStore();
  const travelsStore = useTravelsStore();
  const travelerStore = useTravelerStore();

  Promise.all([
    providerStore.fetchAll(),
    coordinatorStore.fetchAll(),
    busStore.fetchAll(),
    hotelRoomStore.fetchAll(),
    travelsStore.fetchAll(),
    travelerStore.fetchAll(),
  ]);
});

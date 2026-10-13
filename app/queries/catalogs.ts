import { useBusRepository } from '~/composables/buses/use-bus-repository';
import { useCoordinatorRepository } from '~/composables/coordinators/use-coordinator-repository';
import { useHotelRoomRepository } from '~/composables/hotel-rooms/use-hotel-room-repository';
import { useProviderRepository } from '~/composables/providers/use-provider-repository';

export const catalogKeys = {
  root: ['catalog'] as const,
  providers: ['catalog', 'providers'] as const,
  coordinators: ['catalog', 'coordinators'] as const,
  buses: ['catalog', 'buses'] as const,
  hotelRooms: ['catalog', 'hotel-rooms'] as const,
};

// Catalogs are small, change rarely and almost always by the same user, whose writes
// invalidate them: a long staleTime avoids refetching them on every window focus.
const CATALOG_STALE_TIME = 5 * 60_000;

/*
 * Each catalog is loaded whole and read through its store, which calls the catalog's
 * `useXCatalog()` (below) in its setup: the request starts the first time a screen uses the
 * store, not at app boot. From then on the query stays active while the store lives (the whole
 * session): writes invalidate it and it refetches, also on window focus once stale.
 * Repositories are called inside the query, not at module level: they need the Nuxt app context.
 */

/** Every provider, ordered by name. Read through `useProviderStore`. */
export const providersCatalogQuery = defineQueryOptions({
  key: catalogKeys.providers,
  query: () => useProviderRepository().fetchAll(),
  staleTime: CATALOG_STALE_TIME,
});

/** Every coordinator. Read through `useCoordinatorStore`. */
export const coordinatorsCatalogQuery = defineQueryOptions({
  key: catalogKeys.coordinators,
  query: () => useCoordinatorRepository().fetchAll(),
  staleTime: CATALOG_STALE_TIME,
});

/** Every bus of every bus agency. Read through `useBusStore`. */
export const busesCatalogQuery = defineQueryOptions({
  key: catalogKeys.buses,
  query: () => useBusRepository().fetchAll(),
  staleTime: CATALOG_STALE_TIME,
});

/** Room data (total rooms + room types) of every accommodation provider. Read through `useHotelRoomStore`. */
export const hotelRoomsCatalogQuery = defineQueryOptions({
  key: catalogKeys.hotelRooms,
  query: () => useHotelRoomRepository().fetchAll(),
  staleTime: CATALOG_STALE_TIME,
});

/*
 * Defined queries (shared state) for the stores. Not `useQuery` inside the store: it would bind
 * to the component that happened to create the store and go inactive when that one unmounts.
 */
export const useProvidersCatalog = defineQuery(() => useQuery(providersCatalogQuery));

export const useCoordinatorsCatalog = defineQuery(() => useQuery(coordinatorsCatalogQuery));

export const useBusesCatalog = defineQuery(() => useQuery(busesCatalogQuery));

export const useHotelRoomsCatalog = defineQuery(() => useQuery(hotelRoomsCatalogQuery));

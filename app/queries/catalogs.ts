import type { DefineQueryOptionsTagged, UseQueryReturn } from '@pinia/colada';

import { useBusRepository } from '~/composables/buses/use-bus-repository';
import { useCoordinatorRepository } from '~/composables/coordinators/use-coordinator-repository';
import { useHotelRoomRepository } from '~/composables/hotel-rooms/use-hotel-room-repository';
import { useProviderRepository } from '~/composables/providers/use-provider-repository';
import { useQueryLoadState } from '~/queries/load-state';

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
 * Each catalog is loaded whole and read through its store, which calls `useCatalogState` (below)
 * in its setup: the request starts the first time a screen uses the store, not at app boot.
 * From then on the query stays active while the store lives (the whole session): writes
 * invalidate it and it refetches, also on window focus once stale.
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

/**
 * What every catalog store needs from its query. Call it in the store's setup.
 * @param useCatalog - The catalog's defined query (`useProvidersCatalog`…)
 * @param queryOptions - The same catalog's query options (`providersCatalogQuery`…)
 */
export function useCatalogState<T>(
  useCatalog: () => UseQueryReturn<T[]>,
  queryOptions: DefineQueryOptionsTagged<T[]>,
) {
  const queryCache = useQueryCache();
  const query = useCatalog();

  /** The catalog; empty until the first load resolves. */
  const items = computed(() => query.data.value ?? []);
  // Computed (not refs) so the stores expose them as getters, not state
  const loadState = useQueryLoadState(query);
  /** `false` until the first load resolves: an empty `items` before that is not "no records". */
  const isLoaded = computed(() => loadState.isLoaded);
  /** The last load's error, hidden while a retry runs so the screen shows the skeleton again. */
  const loadError = computed(() => loadState.loadError);

  /** Retries the load (e.g. from an error state's "Reintentar"). */
  function refetch() {
    return query.refetch();
  }

  /**
   * Refetches the catalog after a write, so the action resolves with fresh data.
   * A failed refetch keeps the previous data: the write itself succeeded.
   */
  async function refresh(): Promise<void> {
    await queryCache.invalidateQueries({ key: queryOptions.key }).catch(() => {});
  }

  /**
   * The catalog as the server has it, for writes whose checks read it: reuses a request in
   * flight and refetches if the catalog never loaded, failed or was invalidated by a write.
   * @throws If the catalog can't be loaded
   */
  async function ensureFresh(): Promise<T[]> {
    const state = await queryCache.refresh(queryCache.ensure(queryOptions));
    return state.data ?? [];
  }

  /**
   * Updates the cached catalog right away, before the refetch that follows a write: a screen
   * that needs the new record (e.g. the detail of a provider just created) finds it even if
   * that refetch fails.
   */
  function setItems(update: (items: T[]) => T[]): void {
    queryCache.setQueryData(queryOptions.key, (current: T[] | undefined) => update(current ?? []));
  }

  return { items, isLoaded, loadError, refetch, refresh, ensureFresh, setItems };
}

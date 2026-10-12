import { useTravelerRepository } from '~/composables/travelers/use-traveler-repository';

export const travelerKeys = {
  root: ['travelers'] as const,
  byTravel: (travelId: string) => ['travelers', 'by-travel', travelId] as const,
};

/**
 * Every traveler of a travel, coordinators included, plus their room assignments.
 * Screens split paying travelers from occupants (coordinators) themselves.
 * Writes invalidate `travelerKeys.root`.
 * An empty or missing `travelId` (e.g. it comes from a query still loading) disables the
 * query: no request is made and `data` stays `undefined`.
 * Usage: `useQuery(() => travelersByTravelQuery(travelId.value))`.
 */
export const travelersByTravelQuery = defineQueryOptions((travelId: string | undefined) => ({
  key: travelerKeys.byTravel(travelId ?? ''),
  query: async () => {
    // `enabled` keeps the query from running without a travelId, hence the `!`.
    // Inside the query, not at module level: the repository needs the Nuxt app context.
    const repository = useTravelerRepository();
    const [travelers, roomAssignments] = await Promise.all([
      repository.fetchByTravel(travelId!),
      repository.fetchRoomAssignmentsByTravel(travelId!),
    ]);

    return { travelers, roomAssignments };
  },
  enabled: !!travelId,
}));

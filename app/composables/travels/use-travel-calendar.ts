import type { DateValue } from '@internationalized/date';
import type { MaybeRefOrGetter } from 'vue';

import { endOfMonth, startOfMonth } from '@internationalized/date';

import type { TravelStatus, TravelSummary } from '~/types/travel';

import { useQueryLoadState } from '~/queries/load-state';
import { travelListQuery } from '~/queries/travels';
import { assignTravelLanes, getCalendarGridRange, getTravelDateRange, isTravelInRange } from '~/utils/travel-calendar';

// Derived data for app/pages/calendar.vue. Travels come from travelListQuery for the
// visible grid's range; statuses are filtered here, on the client, so checking or
// unchecking a status doesn't make another request. Lanes and the per-day index too.
export function useTravelCalendar(visibleStatuses: MaybeRefOrGetter<TravelStatus[]>, month: MaybeRefOrGetter<DateValue>) {
  const range = computed(() => getCalendarGridRange(toValue(month)));

  const query = useQuery(() => ({
    ...travelListQuery({
      overlapsFrom: range.value.start.toString(),
      overlapsTo: range.value.end.toString(),
    }),
    // When the month changes, keep showing the previous one until the new one arrives (no flash of empty)
    placeholderData: previousList => previousList,
  }));
  const { data, refetch } = query;
  /** Props for `<LoadState>` around the calendar. */
  const loadState = useQueryLoadState(query);

  const travels = computed(() => data.value?.items ?? []);

  const visibleTravels = computed((): TravelSummary[] =>
    travels.value
      .filter(travel => toValue(visibleStatuses).includes(travel.status))
      .sort((a, b) => a.startDate.localeCompare(b.startDate) || a.endDate.localeCompare(b.endDate)),
  );

  const travelLanes = computed(() => assignTravelLanes(visibleTravels.value));

  // `YYYY-MM-DD` index → travels on that day: built once per data change,
  // not in each of the month's 42 cells on every render.
  const travelsByDay = computed(() => {
    const index = new Map<string, TravelSummary[]>();
    for (const travel of visibleTravels.value) {
      const { start, end } = getTravelDateRange(travel);
      for (let day = start; day.compare(end) <= 0; day = day.add({ days: 1 })) {
        const key = day.toString();
        const dayTravels = index.get(key);
        if (dayTravels)
          dayTravels.push(travel);
        else
          index.set(key, [travel]);
      }
    }
    return index;
  });

  function getTravelsOnDay(day: DateValue): TravelSummary[] {
    return travelsByDay.value.get(day.toString()) ?? [];
  }

  function getTravelsInMonth(month: DateValue): TravelSummary[] {
    const from = startOfMonth(month);
    const to = endOfMonth(month);
    return visibleTravels.value.filter(travel => isTravelInRange(travel, from, to));
  }

  return {
    loadState,
    visibleTravels,
    travelLanes,
    refetch,
    getTravelsOnDay,
    getTravelsInMonth,
  };
}

import type { DateValue } from '@internationalized/date';
import type { MaybeRefOrGetter } from 'vue';

import { endOfMonth, startOfMonth } from '@internationalized/date';

import type { TravelStatus, TravelSummary } from '~/types/travel';

import { travelListQuery } from '~/queries/travels';
import { assignTravelLanes, getCalendarGridRange, getTravelDateRange, isTravelInRange } from '~/utils/travel-calendar';

// Datos derivados para app/pages/calendar.vue. Los viajes salen de travelListQuery con el
// rango de la cuadrícula visible; los estados se filtran aquí, en el cliente, para que
// marcar o desmarcar un estado no haga otra petición. Carriles e índice por día también.
export function useTravelCalendar(visibleStatuses: MaybeRefOrGetter<TravelStatus[]>, month: MaybeRefOrGetter<DateValue>) {
  const range = computed(() => getCalendarGridRange(toValue(month)));

  const { data, status, refetch } = useQuery(() => ({
    ...travelListQuery({
      overlapsFrom: range.value.start.toString(),
      overlapsTo: range.value.end.toString(),
    }),
    // Al cambiar de mes, sigue mostrando el anterior hasta que llegue el nuevo (sin parpadeo a vacío)
    placeholderData: previousList => previousList,
  }));

  const travels = computed(() => data.value?.items ?? []);

  const visibleTravels = computed((): TravelSummary[] =>
    travels.value
      .filter(travel => toValue(visibleStatuses).includes(travel.status))
      .sort((a, b) => a.startDate.localeCompare(b.startDate) || a.endDate.localeCompare(b.endDate)),
  );

  const travelLanes = computed(() => assignTravelLanes(visibleTravels.value));

  // Índice `YYYY-MM-DD` → viajes de ese día: se arma una vez por cambio de datos,
  // no en cada una de las 42 celdas del mes en cada render.
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
    status,
    visibleTravels,
    travelLanes,
    refetch,
    getTravelsOnDay,
    getTravelsInMonth,
  };
}

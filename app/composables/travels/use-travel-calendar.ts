import type { DateValue } from '@internationalized/date';
import type { MaybeRefOrGetter } from 'vue';

import { endOfMonth, startOfMonth } from '@internationalized/date';
import { storeToRefs } from 'pinia';

import type { Travel, TravelStatus } from '~/types/travel';

import { assignTravelLanes, getTravelDateRange, isTravelInRange } from '~/utils/travel-calendar';

// Datos derivados para app/pages/calendar.vue. El store de viajes es la fuente de verdad;
// lo que solo le importa al calendario (filtro, carriles, índice por día) se calcula aquí.
export function useTravelCalendar(visibleStatuses: MaybeRefOrGetter<TravelStatus[]>) {
  const { travels, loaded } = storeToRefs(useTravelsStore());

  const visibleTravels = computed((): Travel[] =>
    travels.value
      .filter(travel => toValue(visibleStatuses).includes(travel.status))
      .sort((a, b) => a.startDate.localeCompare(b.startDate) || a.endDate.localeCompare(b.endDate)),
  );

  const travelLanes = computed(() => assignTravelLanes(visibleTravels.value));

  // Índice `YYYY-MM-DD` → viajes de ese día: se arma una vez por cambio de datos,
  // no en cada una de las 42 celdas del mes en cada render.
  const travelsByDay = computed(() => {
    const index = new Map<string, Travel[]>();
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

  function getTravelsOnDay(day: DateValue): Travel[] {
    return travelsByDay.value.get(day.toString()) ?? [];
  }

  function getTravelsInMonth(month: DateValue): Travel[] {
    const from = startOfMonth(month);
    const to = endOfMonth(month);
    return visibleTravels.value.filter(travel => isTravelInRange(travel, from, to));
  }

  return {
    loaded,
    visibleTravels,
    travelLanes,
    getTravelsOnDay,
    getTravelsInMonth,
  };
}

<script setup lang="ts">
import type { DateValue } from '@internationalized/date';

import { getLocalTimeZone, isSameMonth, isToday, startOfMonth, startOfWeek } from '@internationalized/date';

import type { Travel } from '~/types/travel';
import type { MexicanHoliday } from '~/utils/mexican-holidays';

import { HOLIDAY_KIND_TEXT_CLASSES } from '~/utils/mexican-holidays';
import {
  CALENDAR_LOCALE,
  getTravelBarShape,
  TRAVEL_BAR_SHAPE_CLASSES,
  TRAVEL_STATUS_BAR_CLASSES,
  TRAVEL_STATUS_BAR_SELECTED_CLASSES,
} from '~/utils/travel-calendar';
import { getTravelStatusColor } from '~/utils/travel-status';

// Mes completo sobre UCalendar: cada día lista sus viajes como barras de color por estado.
// Las barras son <span>: el día ya es el elemento clicable (role="button"), sin botones anidados.

const props = defineProps<{
  getTravelsOnDay: (day: DateValue) => Travel[];
  travelLanes: Map<string, number>;
  selectedTravelId?: string;
  getHolidayOnDay?: (day: DateValue) => MexicanHoliday | undefined;
}>();

const selectedDay = defineModel<DateValue | undefined>();
const placeholder = defineModel<DateValue>('placeholder', { required: true });

// Barras por día; el resto se resume en "+N más"
const MAX_BARS = 2;
// `fixed-weeks`: el mes siempre se dibuja en 6 semanas
const GRID_DAYS = 42;

type DayBars = {
  bars: (Travel | null)[];
  // Por carril: cuántos días ocupa el nombre desde aquí (0 = sin nombre, lo lleva un día anterior)
  labelSpans: number[];
  hiddenCount: number;
  holiday?: MexicanHoliday;
};

// Cada viaje va en su carril (misma altura todos sus días). Un hueco libre se deja vacío para
// no desalinear; si un viaje de un carril alto no cabe y hay hueco, lo ocupa.
function getDayBars(day: DateValue): DayBars {
  const travels = props.getTravelsOnDay(day);
  const bars: (Travel | null)[] = Array.from({ length: MAX_BARS }, () => null);
  const overflow: Travel[] = [];

  for (const travel of travels) {
    const lane = props.travelLanes.get(travel.id) ?? MAX_BARS;
    if (lane < MAX_BARS)
      bars[lane] = travel;
    else
      overflow.push(travel);
  }

  let hiddenCount = 0;
  for (const travel of overflow) {
    const free = bars.indexOf(null);
    if (free === -1)
      hiddenCount++;
    else
      bars[free] = travel;
  }

  // Quita los huecos del final: solo ocupan alto
  while (bars.length > 0 && bars.at(-1) === null)
    bars.pop();

  return {
    bars,
    labelSpans: bars.map(travel => (travel ? 1 : 0)),
    hiddenCount,
    holiday: props.getHolidayOnDay?.(day),
  };
}

// Barras (y festivo) de los 42 días visibles, por `YYYY-MM-DD`: una vez por mes/datos, no por render de celda
const barsByDay = computed(() => {
  const days: [string, DayBars][] = [];
  let day = startOfWeek(startOfMonth(placeholder.value), CALENDAR_LOCALE);
  for (let i = 0; i < GRID_DAYS; i++, day = day.add({ days: 1 }))
    days.push([day.toString(), getDayBars(day)]);

  // El nombre va al inicio de cada tramo (días seguidos de la misma semana con el viaje en el
  // mismo carril) y se extiende sobre todo el tramo. Así un viaje que entra a un hueco libre a
  // media semana también lleva su nombre.
  const sameTravel = (index: number, lane: number, travelId: string) =>
    days[index]?.[1].bars[lane]?.id === travelId;
  days.forEach(([, dayBars], index) => {
    dayBars.labelSpans = dayBars.bars.map((travel, lane) => {
      if (!travel || (index % 7 !== 0 && sameTravel(index - 1, lane, travel.id)))
        return 0;
      let span = 1;
      while ((index + span) % 7 !== 0 && sameTravel(index + span, lane, travel.id))
        span++;
      return span;
    });
  });

  return new Map(days);
});

function getBars(day: DateValue): DayBars {
  return barsByDay.value.get(day.toString()) ?? getDayBars(day);
}

function getDayHolidays(day: DateValue): MexicanHoliday[] {
  const holiday = getBars(day).holiday;
  return holiday ? [holiday] : [];
}

function getBarClasses(travel: Travel, day: DateValue): string[] {
  const color = getTravelStatusColor(travel.status);
  return [
    travel.id === props.selectedTravelId ? TRAVEL_STATUS_BAR_SELECTED_CLASSES[color] : TRAVEL_STATUS_BAR_CLASSES[color],
    TRAVEL_BAR_SHAPE_CLASSES[getTravelBarShape(travel, day)],
    isSameMonth(day, placeholder.value) ? '' : 'opacity-50',
  ];
}

const timeZone = getLocalTimeZone();

// Número del día: círculo si es hoy; si no, rojo en festivos oficiales del mes visible
// (los días de otro mes se quedan atenuados como el resto de su celda)
function getDayNumberClasses(day: DateValue, holiday: MexicanHoliday | undefined): string {
  if (isToday(day, timeZone))
    return 'bg-primary font-semibold text-inverted';
  if (holiday?.kind === 'official' && isSameMonth(day, placeholder.value))
    return `font-semibold ${HOLIDAY_KIND_TEXT_CLASSES.official}`;
  return '';
}

const calendarUi = {
  root: 'w-full',
  header: 'pb-2',
  heading: 'text-lg font-semibold first-letter:uppercase',
  body: 'pt-2',
  grid: 'w-full space-y-0',
  gridWeekDaysRow: 'mb-0 border-b border-default',
  headCell: 'py-2 text-xs font-medium uppercase text-muted',
  gridBody: 'border-l border-default',
  gridRow: 'place-items-stretch',
  cell: 'min-w-0 border-r border-b border-default',
  cellTrigger: 'm-0 size-auto h-24 w-full flex-col items-stretch justify-start gap-0.5 rounded-none text-sm data-[outside-view]:bg-muted/40',
};
</script>

<template>
  <UCalendar
    v-model="selectedDay"
    v-model:placeholder="placeholder"
    :year-controls="false"
    weekday-format="short"
    variant="outline"
    size="xl"
    fixed-weeks
    prevent-deselect
    :ui="calendarUi"
  >
    <template #day="{ day }">
      <span class="flex min-w-0 items-center gap-0.5 px-1 pt-1">
        <span
          class="inline-flex size-6 shrink-0 items-center justify-center rounded-full"
          :class="getDayNumberClasses(day, getBars(day).holiday)"
        >
          {{ day.day }}
        </span>
        <!-- 0 o 1 festivo: el v-for da una variable tipada sin repetir la búsqueda -->
        <span
          v-for="holiday in getDayHolidays(day)"
          :key="holiday.date.toString()"
          class="min-w-0 truncate text-left text-[11px] font-medium"
          :class="[HOLIDAY_KIND_TEXT_CLASSES[holiday.kind], isSameMonth(day, placeholder) ? '' : 'opacity-50']"
          :title="holiday.name"
        >
          {{ holiday.shortName }}
        </span>
      </span>

      <template v-for="(travel, lane) in getBars(day).bars" :key="travel?.id ?? `empty-${lane}`">
        <span
          v-if="travel"
          class="block h-5 px-1.5 text-left text-xs font-medium leading-5"
          :class="getBarClasses(travel, day)"
          :title="travel.label"
        >
          <!-- El nombre se extiende sobre los días siguientes del tramo: z-10 para quedar sobre sus barras
               y pointer-events-none para que el clic llegue al día de abajo, no al de la etiqueta -->
          <span
            v-if="getBars(day).labelSpans[lane]"
            class="pointer-events-none relative z-10 block truncate"
            :style="{ width: `calc(${getBars(day).labelSpans[lane]} * 100% - 0.25rem)` }"
          >
            {{ travel.label }}
          </span>
        </span>
        <span v-else class="block h-5" />
      </template>

      <span
        v-if="getBars(day).hiddenCount > 0"
        class="px-1.5 text-left text-xs text-muted"
      >
        +{{ getBars(day).hiddenCount }} más
      </span>
    </template>
  </UCalendar>
</template>

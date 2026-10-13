<script setup lang="ts">
import type { DateValue } from '@internationalized/date';

import { getLocalTimeZone, isSameMonth, isToday } from '@internationalized/date';

import type { TravelSummary } from '~/types/travel';
import type { MexicanHoliday } from '~/utils/mexican-holidays';

import { HOLIDAY_KIND_TEXT_CLASSES } from '~/utils/mexican-holidays';
import {
  getCalendarGridRange,
  getTravelBarShape,
  GRID_DAYS,
  TRAVEL_BAR_SHAPE_CLASSES,
  TRAVEL_STATUS_BAR_CLASSES,
  TRAVEL_STATUS_BAR_SELECTED_CLASSES,
} from '~/utils/travel-calendar';
import { getTravelStatusColor } from '~/utils/travel-status';

// Full month over UCalendar: each day lists its travels as bars colored by status.
// The bars are <span>: the day is already the clickable element (role="button"), with no nested buttons.

const props = defineProps<{
  getTravelsOnDay: (day: DateValue) => TravelSummary[];
  travelLanes: Map<string, number>;
  selectedTravelId?: string;
  getHolidayOnDay?: (day: DateValue) => MexicanHoliday | undefined;
}>();

const selectedDay = defineModel<DateValue | undefined>();
const placeholder = defineModel<DateValue>('placeholder', { required: true });

// Bars per day; the rest is summarized as "+N más"
const MAX_BARS = 2;

type DayBars = {
  bars: (TravelSummary | null)[];
  // Per lane: how many days the name spans from here (0 = no name, an earlier day carries it)
  labelSpans: number[];
  hiddenCount: number;
  holiday?: MexicanHoliday;
};

// Each travel goes in its lane (same height on all its days). A free gap is left empty so
// nothing misaligns; if a travel from a higher lane doesn't fit and there's a gap, it takes it.
function getDayBars(day: DateValue): DayBars {
  const travels = props.getTravelsOnDay(day);
  const bars: (TravelSummary | null)[] = Array.from({ length: MAX_BARS }, () => null);
  const overflow: TravelSummary[] = [];

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

  // Drop the trailing gaps: they only take up height
  while (bars.length > 0 && bars.at(-1) === null)
    bars.pop();

  return {
    bars,
    labelSpans: bars.map(travel => (travel ? 1 : 0)),
    hiddenCount,
    holiday: props.getHolidayOnDay?.(day),
  };
}

// Bars (and holiday) of the 42 visible days, by `YYYY-MM-DD`: once per month/data change, not per cell render
const barsByDay = computed(() => {
  const days: [string, DayBars][] = [];
  let day = getCalendarGridRange(placeholder.value).start;
  for (let i = 0; i < GRID_DAYS; i++, day = day.add({ days: 1 }))
    days.push([day.toString(), getDayBars(day)]);

  // The name goes at the start of each span (consecutive days of the same week with the travel in the
  // same lane) and stretches over the whole span. That way a travel that moves into a free gap
  // mid-week also carries its name.
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

function getBarClasses(travel: TravelSummary, day: DateValue): string[] {
  const color = getTravelStatusColor(travel.status);
  return [
    travel.id === props.selectedTravelId ? TRAVEL_STATUS_BAR_SELECTED_CLASSES[color] : TRAVEL_STATUS_BAR_CLASSES[color],
    TRAVEL_BAR_SHAPE_CLASSES[getTravelBarShape(travel, day)],
    isSameMonth(day, placeholder.value) ? '' : 'opacity-50',
  ];
}

const timeZone = getLocalTimeZone();

// Day number: a circle if it's today; otherwise red on official holidays of the visible month
// (days from another month stay dimmed like the rest of their cell)
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
        <!-- 0 or 1 holiday: the v-for gives a typed variable without repeating the lookup -->
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
          <!-- The name stretches over the span's next days: z-10 to sit above their bars and pointer-events-none so the click reaches the day below, not the label -->
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

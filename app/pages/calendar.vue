<script setup lang="ts">
import type { DateValue } from '@internationalized/date';
import type { TabsItem } from '@nuxt/ui';

import { getLocalTimeZone, isSameMonth, parseDate, today } from '@internationalized/date';

import type { TravelStatus, TravelSummary } from '~/types/travel';
import type { MexicanHoliday } from '~/utils/mexican-holidays';

import { useTravelCalendar } from '~/composables/travels/use-travel-calendar';
import { travelDetailQuery } from '~/queries/travels';
import { getMexicanHolidaysByDay, HOLIDAY_KIND_LABELS, HOLIDAY_KIND_TEXT_CLASSES } from '~/utils/mexican-holidays';
import { pluralize } from '~/utils/pluralize';
import { CALENDAR_DEFAULT_STATUSES, CALENDAR_LOCALE } from '~/utils/travel-calendar';

definePageMeta({
  name: 'calendar',
});

const route = useRoute();
const router = useRouter();

const timeZone = getLocalTimeZone();

// View state: it belongs to this page only, it doesn't go to the store
const placeholder = shallowRef<DateValue>(today(timeZone));
const selectedDay = shallowRef<DateValue>();
// Filters: visible statuses (no cancelled) and cancelled apart, like in the popover
const selectedStatuses = ref<TravelStatus[]>([...CALENDAR_DEFAULT_STATUSES]);
const showCancelled = shallowRef(false);
const showHolidays = shallowRef(true);
// Tab of the right panel's list; picking a day switches to "Del día"
const listTab = shallowRef<'day' | 'month'>('month');

// In the legend's order, not the order they were checked in
const visibleStatuses = computed<TravelStatus[]>(() => [
  ...CALENDAR_DEFAULT_STATUSES.filter(status => selectedStatuses.value.includes(status)),
  ...(showCancelled.value ? ['cancelled' as const] : []),
]);

const { loadState, refetch, travelLanes, getTravelsOnDay, getTravelsInMonth } = useTravelCalendar(visibleStatuses, placeholder);

// The picked travel lives in `?travel=`: reloading or sharing the link keeps the selection.
// `replace`: picking travels doesn't fill the browser history.
const selectedTravelId = computed({
  get: () => (typeof route.query.travel === 'string' ? route.query.travel : undefined),
  set: (id: string | undefined) => {
    router.replace({ query: { ...route.query, travel: id } });
  },
});

// Holidays of the visible year and its neighbors: the month's 6 weeks can touch another year.
// Recomputed only when the year changes.
const visibleYear = computed(() => placeholder.value.year);
const holidaysByDay = computed(() =>
  getMexicanHolidaysByDay([visibleYear.value - 1, visibleYear.value, visibleYear.value + 1]),
);

function getHolidayOnDay(day: DateValue): MexicanHoliday | undefined {
  return showHolidays.value ? holidaysByDay.value.get(day.toString()) : undefined;
}

const selectedDayHoliday = computed(() => (selectedDay.value ? getHolidayOnDay(selectedDay.value) : undefined));
const monthHolidays = computed(() =>
  showHolidays.value
    ? [...holidaysByDay.value.values()].filter(holiday => isSameMonth(holiday.date, placeholder.value))
    : [],
);

const dayTravels = computed(() => (selectedDay.value ? getTravelsOnDay(selectedDay.value) : []));
const monthTravels = computed(() => getTravelsInMonth(placeholder.value));

const monthLabel = computed(() =>
  placeholder.value.toDate(timeZone).toLocaleDateString(CALENDAR_LOCALE, { month: 'long', year: 'numeric' }),
);
const dayLabel = computed(() =>
  selectedDay.value?.toDate(timeZone).toLocaleDateString(CALENDAR_LOCALE, { day: 'numeric', month: 'long' }) ?? '',
);

const listTabs = computed<TabsItem[]>(() => [
  { label: 'Del día', value: 'day', icon: 'i-lucide-calendar-check', badge: selectedDay.value ? dayTravels.value.length : undefined },
  { label: 'Del mes', value: 'month', icon: 'i-lucide-calendar-days', badge: monthTravels.value.length },
]);

// One travel that day → open it directly; several → pick from the list; none → nothing
function selectDay(day: DateValue | undefined) {
  selectedDay.value = day;
  listTab.value = 'day';
  const travels = day ? getTravelsOnDay(day) : [];
  selectedTravelId.value = travels.length === 1 ? travels[0]?.id : undefined;
}

// From the month list: the day picked before no longer applies
function selectTravelFromMonth(travel: TravelSummary) {
  selectedDay.value = undefined;
  selectedTravelId.value = travel.id;
}

function selectTravelFromDay(travel: TravelSummary) {
  selectedTravelId.value = travel.id;
}

function goToToday() {
  const date = today(timeZone);
  placeholder.value = date;
  selectDay(date);
}

// Picked travel, regardless of the visible month. Same key as the panel (TravelCalendarSummary):
// Colada makes a single request for both. Without `?travel=` it requests nothing (`enabled`).
const { data: selectedTravel } = useQuery(() => travelDetailQuery(selectedTravelId.value));

// If a filter hides the picked travel, it's deselected (and leaves the query)
watch(visibleStatuses, (statuses) => {
  const selected = selectedTravel.value;
  if (selected && !statuses.includes(selected.status))
    selectedTravelId.value = undefined;
});

// Direct link with `?travel=`: when that travel arrives, open its month and keep the filters from hiding it.
// Only once, for the id the page was entered with: picking travels later doesn't move the calendar.
// A flag instead of `stop()`: with `immediate` and the travel already cached, the callback runs before
// `watch()` returns its handle.
let linkHandled = !selectedTravelId.value;
watch(selectedTravel, (travel) => {
  if (linkHandled || travel === undefined) { // already resolved, or the travel is still loading
    return;
  }
  linkHandled = true;
  // It doesn't exist or RLS hides it: `?travel=` is cleared and the panel shows its empty state
  if (travel === null) {
    selectedTravelId.value = undefined;
    return;
  }
  // Keep the filters from hiding the linked travel
  if (travel.status === 'cancelled') {
    showCancelled.value = true;
  }
  else if (!selectedStatuses.value.includes(travel.status)) {
    selectedStatuses.value = [...selectedStatuses.value, travel.status];
  }
  placeholder.value = parseDate(travel.startDate);
}, { immediate: true });
</script>

<template>
  <div class="h-full overflow-auto">
    <div class="mx-auto max-w-7xl space-y-6 p-6">
      <!-- Header -->
      <div class="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 class="text-2xl font-bold text-highlighted">
            Calendario de viajes
          </h1>
          <ul class="mt-2 flex flex-wrap gap-1.5" aria-label="Leyenda: estatus de los viajes y días festivos">
            <li v-for="status in visibleStatuses" :key="status">
              <TravelStatusBadge :status="status" size="sm" />
            </li>
            <template v-if="showHolidays">
              <!-- Separate from the statuses: holidays aren't travels -->
              <li class="ml-1 border-l border-default pl-2.5">
                <UBadge
                  :label="HOLIDAY_KIND_LABELS.official"
                  icon="i-lucide-party-popper"
                  color="error"
                  variant="subtle"
                  size="sm"
                />
              </li>
              <li>
                <UBadge
                  :label="HOLIDAY_KIND_LABELS.traditional"
                  icon="i-lucide-party-popper"
                  color="neutral"
                  variant="subtle"
                  size="sm"
                />
              </li>
            </template>
          </ul>
        </div>

        <div class="flex items-center gap-2">
          <TravelCalendarFilters
            v-model:statuses="selectedStatuses"
            v-model:show-cancelled="showCancelled"
            v-model:show-holidays="showHolidays"
          />
          <UButton
            label="Hoy"
            icon="i-lucide-calendar-check"
            variant="outline"
            color="neutral"
            @click="goToToday"
          />
        </div>
      </div>

      <LoadState
        v-bind="loadState"
        label="los viajes"
        @retry="refetch()"
      >
        <div class="grid grid-cols-1 items-start gap-6 lg:grid-cols-3">
          <!-- Calendar -->
          <UCard class="lg:col-span-2">
            <TravelCalendar
              v-model:placeholder="placeholder"
              :model-value="selectedDay"
              :get-travels-on-day="getTravelsOnDay"
              :travel-lanes="travelLanes"
              :selected-travel-id="selectedTravelId"
              :get-holiday-on-day="getHolidayOnDay"
              @update:model-value="selectDay"
            />
          </UCard>

          <!-- Right panel -->
          <div class="space-y-6 lg:sticky lg:top-6">
            <!-- Travels of the day / of the month in a single card: no scrolling to see both lists -->
            <UCard :ui="{ header: 'px-4 pt-2 pb-0 sm:px-4', body: 'p-4 sm:p-4' }">
              <template #header>
                <UTabs
                  v-model="listTab"
                  :items="listTabs"
                  :content="false"
                  variant="link"
                  size="sm"
                  class="w-full"
                />
              </template>

              <template v-if="listTab === 'day'">
                <template v-if="selectedDay">
                  <!-- The holiday goes in the title row: it adds no height and doesn't push the summary -->
                  <div class="mb-2 flex items-center justify-between gap-2">
                    <h2 class="truncate text-sm font-semibold text-highlighted">
                      Viajes del {{ dayLabel }}
                    </h2>
                    <UTooltip
                      v-if="selectedDayHoliday"
                      :text="`${selectedDayHoliday.name} · ${HOLIDAY_KIND_LABELS[selectedDayHoliday.kind]}`"
                    >
                      <UBadge
                        :label="selectedDayHoliday.shortName"
                        icon="i-lucide-party-popper"
                        :color="selectedDayHoliday.kind === 'official' ? 'error' : 'neutral'"
                        variant="subtle"
                        size="sm"
                        class="shrink-0"
                      />
                    </UTooltip>
                  </div>
                  <TravelCalendarList
                    v-if="dayTravels.length > 0"
                    :travels="dayTravels"
                    :selected-travel-id="selectedTravelId"
                    @select="selectTravelFromDay"
                  />
                  <p v-else class="text-sm text-muted">
                    Sin viajes este día
                  </p>
                </template>
                <p v-else class="text-sm text-muted">
                  Elige un día en el calendario
                </p>
              </template>

              <template v-else>
                <!-- The month's holidays in the title row (details in the popover): they don't push the summary -->
                <div class="mb-2 flex items-center justify-between gap-2">
                  <h2 class="truncate text-sm font-semibold text-highlighted">
                    Viajes de {{ monthLabel }}
                  </h2>
                  <!-- Button (not hover): on tablet it opens with a tap -->
                  <UPopover
                    v-if="monthHolidays.length > 0"
                    :content="{ align: 'end' }"
                  >
                    <UButton
                      :label="pluralize(monthHolidays.length, 'festivo')"
                      icon="i-lucide-party-popper"
                      color="neutral"
                      variant="soft"
                      size="xs"
                      class="shrink-0"
                    />
                    <template #content>
                      <ul class="space-y-1 p-3 text-xs font-medium" aria-label="Días festivos del mes">
                        <li
                          v-for="holiday in monthHolidays"
                          :key="holiday.date.toString()"
                          class="flex items-center gap-1.5"
                          :class="HOLIDAY_KIND_TEXT_CLASSES[holiday.kind]"
                        >
                          <UIcon name="i-lucide-party-popper" class="size-3.5 shrink-0" />
                          {{ holiday.date.day }} · {{ holiday.name }}
                        </li>
                      </ul>
                    </template>
                  </UPopover>
                </div>
                <TravelCalendarList
                  v-if="monthTravels.length > 0"
                  :travels="monthTravels"
                  :selected-travel-id="selectedTravelId"
                  @select="selectTravelFromMonth"
                />
                <p v-else class="text-sm text-muted">
                  No hay viajes este mes
                </p>
              </template>
            </UCard>

            <TravelCalendarSummary v-if="selectedTravelId" :travel-id="selectedTravelId" />

            <UCard v-else>
              <div class="flex flex-col items-center gap-3 py-6 text-center">
                <UIcon name="i-lucide-calendar-search" class="size-10 text-dimmed" />
                <p class="text-sm text-muted">
                  Elige un viaje para ver su resumen
                </p>
              </div>
            </UCard>
          </div>
        </div>
      </LoadState>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { DateValue } from '@internationalized/date';
import type { TabsItem } from '@nuxt/ui';

import { getLocalTimeZone, isSameMonth, parseDate, today } from '@internationalized/date';

import type { Travel, TravelStatus } from '~/types/travel';
import type { MexicanHoliday } from '~/utils/mexican-holidays';

import { useTravelCalendar } from '~/composables/travels/use-travel-calendar';
import { getMexicanHolidaysByDay, HOLIDAY_KIND_LABELS, HOLIDAY_KIND_TEXT_CLASSES } from '~/utils/mexican-holidays';
import { CALENDAR_DEFAULT_STATUSES, CALENDAR_LOCALE } from '~/utils/travel-calendar';
import { getTravelStatusColor, getTravelStatusLabel } from '~/utils/travel-status';

definePageMeta({
  name: 'calendar',
});

const route = useRoute();
const router = useRouter();
const travelsStore = useTravelsStore();

const timeZone = getLocalTimeZone();

// Estado de la vista: es solo de esta página, no va al store
const placeholder = shallowRef<DateValue>(today(timeZone));
const selectedDay = shallowRef<DateValue>();
// Filtros: estatus visibles (sin cancelados) y cancelados aparte, como en el popover
const selectedStatuses = ref<TravelStatus[]>([...CALENDAR_DEFAULT_STATUSES]);
const showCancelled = shallowRef(false);
const showHolidays = shallowRef(true);
// Pestaña de la lista del panel derecho; elegir un día cambia a "Del día"
const listTab = shallowRef<'day' | 'month'>('month');

// En el orden de la leyenda, no en el que se marcaron
const visibleStatuses = computed<TravelStatus[]>(() => [
  ...CALENDAR_DEFAULT_STATUSES.filter(status => selectedStatuses.value.includes(status)),
  ...(showCancelled.value ? ['cancelled' as const] : []),
]);

const { loaded, visibleTravels, travelLanes, getTravelsOnDay, getTravelsInMonth } = useTravelCalendar(visibleStatuses);

// El viaje elegido vive en `?viaje=`: recargar o compartir el link conserva la selección.
// `replace`: elegir viajes no llena el historial del navegador.
const selectedTravelId = computed({
  get: () => (typeof route.query.viaje === 'string' ? route.query.viaje : undefined),
  set: (id: string | undefined) => {
    router.replace({ query: { ...route.query, viaje: id } });
  },
});

// Festivos del año visible y de los vecinos: las 6 semanas del mes pueden tocar otro año.
// Se recalcula solo al cambiar de año.
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

const selectedTravel = computed(() => visibleTravels.value.find(travel => travel.id === selectedTravelId.value));
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

// Un viaje ese día → se abre directo; varios → se elige de la lista; ninguno → nada
function selectDay(day: DateValue | undefined) {
  selectedDay.value = day;
  listTab.value = 'day';
  const travels = day ? getTravelsOnDay(day) : [];
  selectedTravelId.value = travels.length === 1 ? travels[0]?.id : undefined;
}

// Desde la lista del mes: el día elegido antes ya no aplica
function selectTravelFromMonth(travel: Travel) {
  selectedDay.value = undefined;
  selectedTravelId.value = travel.id;
}

function selectTravelFromDay(travel: Travel) {
  selectedTravelId.value = travel.id;
}

function goToToday() {
  const date = today(timeZone);
  placeholder.value = date;
  selectDay(date);
}

// Si un filtro oculta el viaje elegido, se deselecciona (y sale del query)
watch(visibleStatuses, (statuses) => {
  const selected = selectedTravelId.value ? travelsStore.getTravelById(selectedTravelId.value) : undefined;
  if (selected && !statuses.includes(selected.status))
    selectedTravelId.value = undefined;
});

// Link directo con `?viaje=`: al terminar de cargar los viajes, abrir el mes de ese viaje.
// `loaded` solo pasa de false a true una vez, así que esto corre una sola vez.
watch(loaded, (isLoaded) => {
  const id = selectedTravelId.value;
  if (!isLoaded || !id)
    return;

  const travel = travelsStore.getTravelById(id);
  if (!travel) {
    selectedTravelId.value = undefined;
    return;
  }
  // Que los filtros no oculten el viaje del link
  if (travel.status === 'cancelled')
    showCancelled.value = true;
  else if (!selectedStatuses.value.includes(travel.status))
    selectedStatuses.value = [...selectedStatuses.value, travel.status];
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
              <UBadge
                :label="getTravelStatusLabel(status)"
                :color="getTravelStatusColor(status)"
                variant="subtle"
                size="sm"
              />
            </li>
            <template v-if="showHolidays">
              <!-- Separados de los estatus: los festivos no son viajes -->
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

      <div v-if="!loaded" class="flex justify-center py-24">
        <UIcon name="i-lucide-loader-circle" class="size-8 animate-spin text-muted" />
      </div>

      <div v-else class="grid grid-cols-1 items-start gap-6 lg:grid-cols-3">
        <!-- Calendario -->
        <UCard class="lg:col-span-2">
          <TravelCalendar
            v-model:placeholder="placeholder"
            :model-value="selectedDay"
            :get-travels-on-day="getTravelsOnDay"
            :travel-lanes="travelLanes"
            :selected-travel-id="selectedTravel?.id"
            :get-holiday-on-day="getHolidayOnDay"
            @update:model-value="selectDay"
          />
        </UCard>

        <!-- Panel derecho -->
        <div class="space-y-6 lg:sticky lg:top-6">
          <!-- Viajes del día / del mes en una sola card: sin scroll para ver ambas listas -->
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
                <!-- El festivo va en la fila del título: no agrega alto ni empuja el resumen -->
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
                  :selected-travel-id="selectedTravel?.id"
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
              <!-- Festivos del mes en la fila del título (detalle en el popover): no empujan el resumen -->
              <div class="mb-2 flex items-center justify-between gap-2">
                <h2 class="truncate text-sm font-semibold text-highlighted">
                  Viajes de {{ monthLabel }}
                </h2>
                <!-- Botón (no hover): en tablet se abre con un toque -->
                <UPopover
                  v-if="monthHolidays.length > 0"
                  :content="{ align: 'end' }"
                >
                  <UButton
                    :label="`${monthHolidays.length} festivo${monthHolidays.length === 1 ? '' : 's'}`"
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
                :selected-travel-id="selectedTravel?.id"
                @select="selectTravelFromMonth"
              />
              <p v-else class="text-sm text-muted">
                No hay viajes este mes
              </p>
            </template>
          </UCard>

          <TravelCalendarSummary v-if="selectedTravel" :travel="selectedTravel" />

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
    </div>
  </div>
</template>

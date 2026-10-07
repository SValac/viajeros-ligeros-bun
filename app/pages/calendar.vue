<script setup lang="ts">
import type { DateValue } from '@internationalized/date';

import { getLocalTimeZone, parseDate, today } from '@internationalized/date';

import type { Travel, TravelStatus } from '~/types/travel';

import { useTravelCalendar } from '~/composables/travels/use-travel-calendar';
import { CALENDAR_LOCALE } from '~/utils/travel-calendar';
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
const showCancelled = shallowRef(false);

const { loaded, visibleTravels, travelLanes, getTravelsOnDay, getTravelsInMonth } = useTravelCalendar(showCancelled);

// El viaje elegido vive en `?viaje=`: recargar o compartir el link conserva la selección.
// `replace`: elegir viajes no llena el historial del navegador.
const selectedTravelId = computed({
  get: () => (typeof route.query.viaje === 'string' ? route.query.viaje : undefined),
  set: (id: string | undefined) => {
    router.replace({ query: { ...route.query, viaje: id } });
  },
});

const selectedTravel = computed(() => visibleTravels.value.find(travel => travel.id === selectedTravelId.value));
const dayTravels = computed(() => (selectedDay.value ? getTravelsOnDay(selectedDay.value) : []));
const monthTravels = computed(() => getTravelsInMonth(placeholder.value));

const monthLabel = computed(() =>
  placeholder.value.toDate(timeZone).toLocaleDateString(CALENDAR_LOCALE, { month: 'long', year: 'numeric' }),
);
const dayLabel = computed(() =>
  selectedDay.value?.toDate(timeZone).toLocaleDateString(CALENDAR_LOCALE, { day: 'numeric', month: 'long' }) ?? '',
);

const legendStatuses = computed<TravelStatus[]>(() => {
  const statuses: TravelStatus[] = ['pending', 'published', 'in_progress', 'completed'];
  return showCancelled.value ? [...statuses, 'cancelled'] : statuses;
});

// Un viaje ese día → se abre directo; varios → se elige de la lista; ninguno → nada
function selectDay(day: DateValue | undefined) {
  selectedDay.value = day;
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

function setShowCancelled(value: boolean) {
  showCancelled.value = value;
  const selected = selectedTravelId.value ? travelsStore.getTravelById(selectedTravelId.value) : undefined;
  if (!value && selected?.status === 'cancelled')
    selectedTravelId.value = undefined;
}

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
  if (travel.status === 'cancelled')
    showCancelled.value = true;
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
          <p class="mt-1 text-sm text-muted">
            Elige un día o un viaje para ver su resumen
          </p>
        </div>

        <div class="flex items-center gap-4">
          <USwitch
            :model-value="showCancelled"
            label="Mostrar cancelados"
            @update:model-value="setShowCancelled"
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
        <div class="space-y-6 lg:col-span-2">
          <UCard>
            <TravelCalendar
              v-model:placeholder="placeholder"
              :model-value="selectedDay"
              :get-travels-on-day="getTravelsOnDay"
              :travel-lanes="travelLanes"
              :selected-travel-id="selectedTravel?.id"
              @update:model-value="selectDay"
            />

            <template #footer>
              <ul class="flex flex-wrap gap-2" aria-label="Estados de los viajes">
                <li v-for="status in legendStatuses" :key="status">
                  <UBadge
                    :label="getTravelStatusLabel(status)"
                    :color="getTravelStatusColor(status)"
                    variant="subtle"
                  />
                </li>
              </ul>
            </template>
          </UCard>

          <UCard>
            <template #header>
              <h2 class="font-semibold">
                Viajes de {{ monthLabel }}
              </h2>
            </template>

            <TravelCalendarList
              v-if="monthTravels.length > 0"
              :travels="monthTravels"
              :selected-travel-id="selectedTravel?.id"
              @select="selectTravelFromMonth"
            />
            <p v-else class="text-sm text-muted">
              No hay viajes este mes
            </p>
          </UCard>
        </div>

        <!-- Panel derecho -->
        <div class="space-y-6 lg:sticky lg:top-6">
          <UCard v-if="dayTravels.length > 1">
            <template #header>
              <h2 class="font-semibold">
                Viajes del {{ dayLabel }}
              </h2>
            </template>

            <TravelCalendarList
              :travels="dayTravels"
              :selected-travel-id="selectedTravel?.id"
              @select="selectTravelFromDay"
            />
          </UCard>

          <TravelCalendarSummary v-if="selectedTravel" :travel="selectedTravel" />

          <UCard v-else-if="dayTravels.length <= 1">
            <div class="flex flex-col items-center gap-3 py-8 text-center">
              <UIcon name="i-lucide-calendar-search" class="size-10 text-dimmed" />
              <p class="text-sm text-muted">
                <template v-if="selectedDay">
                  Sin viajes el {{ dayLabel }}
                </template>
                <template v-else>
                  Selecciona un día o un viaje para ver su resumen
                </template>
              </p>
            </div>
          </UCard>
        </div>
      </div>
    </div>
  </div>
</template>

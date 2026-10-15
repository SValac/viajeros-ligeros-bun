<script setup lang="ts">
import { useQueryLoadState } from '~/queries/load-state';
import { quotationByTravelQuery } from '~/queries/quotations';
import { travelDetailQuery } from '~/queries/travels';
import { formatDate } from '~/utils/format-date';
import { getTravelDurationDays } from '~/utils/travel-calendar';

// Summary of the travel picked in the calendar (app/pages/calendar.vue). It gets only the id and reads
// travelDetailQuery, so it stays open even when the travel isn't in the visible month.

const props = defineProps<{
  travelId: string;
}>();

const coordinatorStore = useCoordinatorStore();
const quotationStore = useQuotationStore();

const travelQuery = useQuery(() => travelDetailQuery(props.travelId));
const { data: travel, refetch } = travelQuery;
const travelLoad = useQueryLoadState(travelQuery);

const MAX_HIGHLIGHTS = 3;

const coordinatorNames = computed(() =>
  travel.value?.coordinatorIds
    .map(id => coordinatorStore.getCoordinatorById(id)?.name)
    .filter(name => name !== undefined)
    .join(', '),
);

const travelerCount = computed (() => travel.value?.travelerCount ?? 0);

// The sellable seats come from the quotation. The getter follows `props.travelId`, so
// picking another travel loads its quotation (already cached = no request).
useQuery(() => quotationByTravelQuery(props.travelId));

// Seats for sale according to the quotation; 0 if there's no quotation or buses yet
const sellableSeats = computed(() => {
  const quotation = quotationStore.getQuotationByTravel(props.travelId);
  return quotation ? quotationStore.getSellableSeats(quotation.id, travel.value?.coordinatorIds.length ?? 0) : 0;
});

type Detail = { icon: string; label: string; value: string };

const details = computed<Detail[]>(() => {
  if (!travel.value) {
    return [];
  }

  const days = getTravelDurationDays(travel.value);
  return [
    { icon: 'i-lucide-calendar', label: 'Salida', value: formatDate(travel.value.startDate) },
    { icon: 'i-lucide-calendar-check', label: 'Regreso', value: formatDate(travel.value.endDate) },
    { icon: 'i-lucide-clock', label: 'Duración', value: `${days} día${days === 1 ? '' : 's'}` },
    { icon: 'i-lucide-map-pin', label: 'Sale desde', value: travel.value?.departureFrom || '—' },
    { icon: 'i-lucide-user-cog', label: 'Coordinadores', value: coordinatorNames.value || 'Sin asignar' },
  ];
});

const highlights = computed(() => travel.value?.highlights.slice(0, MAX_HIGHLIGHTS) ?? []);
</script>

<template>
  <LoadState
    v-bind="travelLoad"
    label="el viaje"
    fill
    @retry="refetch()"
  >
    <UCard
      v-if="travel"
      :ui="{ body: 'space-y-4' }"
    >
      <template #header>
        <div class="space-y-1">
          <div class="flex items-start justify-between gap-2">
            <h2 class="font-semibold text-highlighted wrap-break-word">
              {{ travel.label }}
            </h2>
            <TravelStatusBadge :status="travel.status" class="shrink-0" />
          </div>
          <p v-if="travel.destination" class="text-sm text-muted">
            {{ travel.destination }}
          </p>
        </div>
      </template>

      <img
        v-if="travel.imageUrl"
        :src="travel.imageUrl"
        :alt="travel.label"
        class="aspect-video w-full rounded-md object-cover"
      >

      <dl class="space-y-3 text-sm">
        <div
          v-for="detail in details"
          :key="detail.label"
          class="flex items-start justify-between gap-3"
        >
          <dt class="flex shrink-0 items-center gap-2 text-muted">
            <UIcon :name="detail.icon" class="size-4 shrink-0" />
            {{ detail.label }}
          </dt>
          <dd class="text-right font-medium">
            {{ detail.value }}
          </dd>
        </div>
      </dl>

      <div class="space-y-2">
        <div class="flex items-center justify-between text-sm">
          <span class="flex items-center gap-2 text-muted">
            <UIcon name="i-lucide-users" class="size-4 shrink-0" />
            Viajeros
          </span>
          <span class="font-medium">
            {{ travelerCount }}<template v-if="sellableSeats > 0"> de {{ sellableSeats }} lugares</template>
          </span>
        </div>
        <UProgress
          v-if="sellableSeats > 0"
          :model-value="Math.min(travelerCount, sellableSeats)"
          :max="sellableSeats"
          size="sm"
          :aria-label="`${travelerCount} de ${sellableSeats} lugares vendidos`"
        />
      </div>

      <template v-if="travel.summary || highlights.length > 0">
        <USeparator />
        <p v-if="travel.summary" class="line-clamp-4 text-sm text-toned">
          {{ travel.summary }}
        </p>
        <ul v-if="highlights.length > 0" class="space-y-1.5">
          <li
            v-for="highlight in highlights"
            :key="highlight"
            class="flex items-start gap-2 text-sm"
          >
            <UIcon name="i-lucide-check" class="mt-0.5 size-4 shrink-0 text-primary" />
            {{ highlight }}
          </li>
        </ul>
      </template>

      <template #footer>
        <div class="flex flex-wrap gap-2">
          <UButton
            label="Ver viaje"
            trailing-icon="i-lucide-arrow-right"
            :to="{ name: 'travel-detail', params: { id: travel.id } }"
          />
          <UButton
            label="Cotización"
            icon="i-lucide-calculator"
            variant="outline"
            color="neutral"
            :to="{ name: 'quotation-detail', params: { id: travel.id } }"
          />
        </div>
      </template>
    </UCard>
  </LoadState>
</template>

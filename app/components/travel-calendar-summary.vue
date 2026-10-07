<script setup lang="ts">
import type { Travel } from '~/types/travel';

import { formatDate } from '~/utils/format-date';
import { getTravelDurationDays } from '~/utils/travel-calendar';
import { getTravelStatusColor, getTravelStatusLabel } from '~/utils/travel-status';

// Resumen del viaje elegido en el calendario (app/pages/calendar.vue)

const props = defineProps<{
  travel: Travel;
}>();

const coordinatorStore = useCoordinatorStore();
const travelerStore = useTravelerStore();
const cotizacionStore = useCotizacionStore();

const MAX_HIGHLIGHTS = 3;

const coordinatorNames = computed(() =>
  props.travel.coordinatorIds
    .map(id => coordinatorStore.getCoordinatorById(id)?.name)
    .filter(name => name !== undefined)
    .join(', '),
);

const travelerCount = computed(() => travelerStore.getTravelersByTravel(props.travel.id).length);

// Lugares a la venta según la cotización; 0 si aún no hay cotización o autobuses
const sellableSeats = computed(() => {
  const cotizacion = cotizacionStore.getCotizacionByTravel(props.travel.id);
  return cotizacion ? cotizacionStore.getAsientosVendibles(cotizacion.id) : 0;
});

type Detail = { icon: string; label: string; value: string };

const details = computed<Detail[]>(() => {
  const days = getTravelDurationDays(props.travel);
  return [
    { icon: 'i-lucide-calendar', label: 'Salida', value: formatDate(props.travel.startDate) },
    { icon: 'i-lucide-calendar-check', label: 'Regreso', value: formatDate(props.travel.endDate) },
    { icon: 'i-lucide-clock', label: 'Duración', value: `${days} día${days === 1 ? '' : 's'}` },
    { icon: 'i-lucide-map-pin', label: 'Sale desde', value: props.travel.departureFrom || '—' },
    { icon: 'i-lucide-user-star', label: 'Coordinadores', value: coordinatorNames.value || 'Sin asignar' },
  ];
});

const highlights = computed(() => props.travel.highlights.slice(0, MAX_HIGHLIGHTS));
</script>

<template>
  <UCard :ui="{ body: 'space-y-4' }">
    <template #header>
      <div class="space-y-1">
        <div class="flex items-start justify-between gap-2">
          <h2 class="font-semibold text-highlighted break-words">
            {{ travel.label }}
          </h2>
          <UBadge
            :label="getTravelStatusLabel(travel.status)"
            :color="getTravelStatusColor(travel.status)"
            variant="subtle"
            class="shrink-0"
          />
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
</template>

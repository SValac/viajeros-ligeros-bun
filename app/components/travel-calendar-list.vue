<script setup lang="ts">
import type { Travel } from '~/types/travel';

import { parseDisplayDate } from '~/utils/format-date';
import { getTravelStatusColor, getTravelStatusLabel } from '~/utils/travel-status';

// Lista de viajes para elegir uno en el calendario (los del mes o los de un día).
// Muestra hasta 4 viajes (fila de 2rem + 0.25rem de separación) y el resto con scroll,
// para que el resumen de abajo no se empuje fuera de la pantalla.

const props = defineProps<{
  travels: Travel[];
  selectedTravelId?: string;
}>();

const emit = defineEmits<{
  select: [travel: Travel];
}>();

const DOT_CLASSES = {
  primary: 'bg-primary',
  info: 'bg-info',
  success: 'bg-success',
  warning: 'bg-warning',
  error: 'bg-error',
} as const;

// Con scroll, el viaje elegido (p. ej. desde el calendario o un link) puede quedar oculto
const list = useTemplateRef('list');
watch(() => props.selectedTravelId, () => {
  list.value?.querySelector('[aria-current="true"]')?.scrollIntoView({ block: 'nearest' });
}, { flush: 'post', immediate: true });

function formatShortDate(date: string): string {
  return parseDisplayDate(date).toLocaleDateString('es-MX', { day: 'numeric', month: 'short' });
}
</script>

<template>
  <ul ref="list" class="max-h-[8.75rem] space-y-1 overflow-y-auto">
    <li v-for="travel in travels" :key="travel.id">
      <button
        type="button"
        class="flex w-full items-center gap-3 rounded-md px-2 py-1.5 text-left text-sm transition-colors hover:bg-elevated focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-primary"
        :class="travel.id === selectedTravelId ? 'bg-elevated' : ''"
        :aria-current="travel.id === selectedTravelId ? 'true' : undefined"
        @click="emit('select', travel)"
      >
        <span
          class="size-2.5 shrink-0 rounded-full"
          :class="DOT_CLASSES[getTravelStatusColor(travel.status)]"
          :title="getTravelStatusLabel(travel.status)"
        />
        <span class="min-w-0 flex-1 truncate font-medium text-highlighted">
          {{ travel.label }}
        </span>
        <span class="shrink-0 text-xs text-muted">
          {{ formatShortDate(travel.startDate) }} – {{ formatShortDate(travel.endDate) }}
        </span>
      </button>
    </li>
  </ul>
</template>

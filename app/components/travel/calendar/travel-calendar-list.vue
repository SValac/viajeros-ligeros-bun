<script setup lang="ts">
import type { TravelSummary } from '~/types/travel';

import { parseDisplayDate } from '~/utils/format-date';
import { getTravelStatusColor, getTravelStatusLabel } from '~/utils/travel-status';

// List of travels to pick one in the calendar (the month's or a day's).
// Shows up to 4 travels (2rem row + 0.25rem gap) and scrolls the rest,
// so the summary below isn't pushed off screen.

const props = defineProps<{
  travels: TravelSummary[];
  selectedTravelId?: string;
}>();

const emit = defineEmits<{
  select: [travel: TravelSummary];
}>();

const DOT_CLASSES = {
  primary: 'bg-primary',
  info: 'bg-info',
  neutral: 'bg-inverted/40',
  warning: 'bg-warning',
  error: 'bg-error',
} as const;

// With scrolling, the picked travel (e.g. from the calendar or a link) could stay hidden
const list = useTemplateRef('list');
watch(() => props.selectedTravelId, () => {
  list.value?.querySelector('[aria-current="true"]')?.scrollIntoView({ block: 'nearest' });
}, { flush: 'post', immediate: true });

function formatDayMonth(date: string): string {
  return parseDisplayDate(date).toLocaleDateString('es-MX', { day: 'numeric', month: 'short' });
}
</script>

<template>
  <ul ref="list" class="max-h-35 space-y-1 overflow-y-auto">
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
          {{ formatDayMonth(travel.startDate) }} – {{ formatDayMonth(travel.endDate) }}
        </span>
      </button>
    </li>
  </ul>
</template>

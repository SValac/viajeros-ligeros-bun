<script setup lang="ts">
import type { CheckboxGroupItem } from '@nuxt/ui';

import type { TravelStatus } from '~/types/travel';

import { CALENDAR_DEFAULT_STATUSES } from '~/utils/travel-calendar';
import { getTravelStatusLabel } from '~/utils/travel-status';

// Filtros del calendario (app/pages/calendar.vue): estatus visibles y cancelados aparte

const statuses = defineModel<TravelStatus[]>('statuses', { required: true });
const showCancelled = defineModel<boolean>('showCancelled', { required: true });

const statusItems: CheckboxGroupItem[] = CALENDAR_DEFAULT_STATUSES.map(status => ({
  label: getTravelStatusLabel(status),
  value: status,
}));

// Cuántos filtros se apartan de lo de inicio (todos los estatus, sin cancelados)
const activeCount = computed(() =>
  CALENDAR_DEFAULT_STATUSES.filter(status => !statuses.value.includes(status)).length
  + (showCancelled.value ? 1 : 0),
);

function reset() {
  statuses.value = [...CALENDAR_DEFAULT_STATUSES];
  showCancelled.value = false;
}
</script>

<template>
  <UPopover :content="{ align: 'end' }">
    <UButton
      icon="i-lucide-list-filter"
      label="Filtros"
      variant="outline"
      color="neutral"
    >
      <template #trailing>
        <UBadge
          v-if="activeCount > 0"
          :label="activeCount"
          size="sm"
          variant="solid"
        />
      </template>
    </UButton>

    <template #content>
      <div class="w-64 space-y-4 p-4">
        <UCheckboxGroup
          v-model="statuses"
          :items="statusItems"
          legend="Estatus del viaje"
        />

        <USeparator />

        <USwitch
          v-model="showCancelled"
          label="Mostrar cancelados"
        />

        <UButton
          label="Restablecer filtros"
          variant="link"
          color="neutral"
          size="sm"
          class="px-0"
          :disabled="activeCount === 0"
          @click="reset"
        />
      </div>
    </template>
  </UPopover>
</template>

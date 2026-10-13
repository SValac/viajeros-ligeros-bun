<script setup lang="ts">
import { formatCurrency } from '~/utils/currency';

// Compact list of the travel's per-person services to pick which one to edit. On
// desktop it's a column; on tablet, a horizontally scrolling row so it doesn't push
// the card down.

export type OptionalServiceListItem = {
  id: string;
  label: string;
  providerName: string;
  takers: number;
  payableCost: number;
  overpaid: boolean;
};

type Props = {
  items: OptionalServiceListItem[];
};

const { items } = defineProps<Props>();

const selected = defineModel<string | undefined>({ required: true });
</script>

<template>
  <nav aria-label="Servicios por persona">
    <ul class="flex gap-1 overflow-x-auto lg:flex-col lg:overflow-visible">
      <li
        v-for="item in items"
        :key="item.id"
        class="w-56 shrink-0 lg:w-auto"
      >
        <button
          type="button"
          class="w-full text-left rounded-md px-3 py-2 transition-colors border"
          :class="item.id === selected
            ? 'bg-primary/10 border-primary/40'
            : 'border-transparent hover:bg-elevated'"
          :aria-current="item.id === selected ? 'true' : undefined"
          @click="selected = item.id"
        >
          <span class="flex items-center justify-between gap-2">
            <span
              class="font-medium truncate"
              :class="item.id === selected ? 'text-primary' : 'text-default'"
            >
              {{ item.label }}
            </span>
            <UIcon
              v-if="item.overpaid"
              name="i-lucide-circle-alert"
              class="size-4 text-error shrink-0"
              aria-label="Pagado de más"
            />
          </span>
          <span class="block text-xs text-muted truncate">
            {{ item.providerName }}
          </span>
          <span class="block text-xs text-muted">
            {{ item.takers }} lo toman · {{ formatCurrency(item.payableCost) }}
          </span>
        </button>
      </li>
    </ul>
  </nav>
</template>

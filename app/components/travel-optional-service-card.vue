<script setup lang="ts">
import type { QuotationProvider } from '~/types/quotation';
import type { Traveler } from '~/types/traveler';

import { formatCurrency } from '~/utils/currency';

// Un servicio opcional del viaje: quién lo toma y cuánto se le debe al proveedor.
// Todos lo toman salvo los desmarcados; el padre guarda los cambios.

type Props = {
  service: QuotationProvider;
  providerName: string;
  occupants: Traveler[];
  /** Ids de los viajeros que no lo toman. */
  optedOut: Set<string>;
  paid: number;
  busy?: boolean;
};

const { service, occupants, optedOut, paid, busy = false } = defineProps<Props>();

const emit = defineEmits<{
  change: [travelerIds: string[], toman: boolean];
}>();

// Con cortesía, los coordinadores no cuentan para el pago y no se marcan.
function isCourtesy(traveler: Traveler): boolean {
  return service.coordinatorsCourtesy && traveler.kind === 'coordinator';
}

const selectable = computed(() => occupants.filter(t => !isCourtesy(t)));
const takers = computed(() => selectable.value.filter(t => !optedOut.has(t.id)));

const pending = computed(() => Math.max(0, service.payableCost - paid));
const overpaid = computed(() => Math.max(0, paid - service.payableCost));

const allTake = computed(() => takers.value.length === selectable.value.length);
const noneTake = computed(() => takers.value.length === 0);

function fullName(traveler: Traveler): string {
  return `${traveler.firstName} ${traveler.lastName}`.trim();
}

function toggle(traveler: Traveler, toman: boolean | 'indeterminate') {
  emit('change', [traveler.id], toman === true);
}

function setAll(toman: boolean) {
  emit('change', selectable.value.map(t => t.id), toman);
}
</script>

<template>
  <UCard>
    <template #header>
      <div class="flex flex-wrap items-start justify-between gap-3">
        <div class="min-w-0">
          <h3 class="font-semibold">
            {{ providerName }}
          </h3>
          <p class="text-sm text-muted break-words">
            {{ service.serviceDescription }}
          </p>
        </div>
        <UBadge
          v-if="service.coordinatorsCourtesy"
          label="Cortesía para coordinadores"
          icon="i-lucide-gift"
          color="info"
          variant="subtle"
        />
      </div>
    </template>

    <div class="space-y-4">
      <!-- Cifras -->
      <dl class="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
        <div>
          <dt class="text-muted">
            Lo toman
          </dt>
          <dd class="font-semibold text-lg">
            {{ takers.length }} <span class="text-sm font-normal text-muted">de {{ selectable.length }}</span>
          </dd>
        </div>
        <div>
          <dt class="text-muted">
            A pagar
          </dt>
          <dd class="font-semibold text-lg">
            {{ formatCurrency(service.payableCost) }}
          </dd>
          <dd class="text-xs text-muted">
            {{ formatCurrency(service.unitCost ?? 0) }} × {{ takers.length }}
          </dd>
        </div>
        <div>
          <dt class="text-muted">
            Cotizado
          </dt>
          <dd class="font-semibold text-lg">
            {{ formatCurrency(service.totalCost) }}
          </dd>
          <dd class="text-xs text-muted">
            {{ service.personCount }} personas
          </dd>
        </div>
        <div>
          <dt class="text-muted">
            {{ overpaid > 0 ? 'Pagado de más' : 'Pendiente' }}
          </dt>
          <dd
            class="font-semibold text-lg"
            :class="overpaid > 0 ? 'text-error' : pending > 0 ? 'text-warning' : 'text-success'"
          >
            {{ formatCurrency(overpaid > 0 ? overpaid : pending) }}
          </dd>
          <dd class="text-xs text-muted">
            Pagado {{ formatCurrency(paid) }}
          </dd>
        </div>
      </dl>

      <USeparator />

      <!-- Quién lo toma -->
      <div class="flex flex-wrap items-center justify-between gap-2">
        <p class="text-sm text-muted">
          Desmarca a quien no toma el servicio.
        </p>
        <div class="flex gap-2">
          <UButton
            label="Marcar todos"
            size="sm"
            variant="ghost"
            :disabled="busy || allTake"
            @click="setAll(true)"
          />
          <UButton
            label="Desmarcar todos"
            size="sm"
            variant="ghost"
            color="neutral"
            :disabled="busy || noneTake"
            @click="setAll(false)"
          />
        </div>
      </div>

      <p v-if="occupants.length === 0" class="text-sm text-muted text-center py-4">
        Este viaje aún no tiene viajeros.
      </p>

      <ul v-else class="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        <li
          v-for="traveler in occupants"
          :key="traveler.id"
          class="flex items-center justify-between gap-2 rounded-md border border-default px-3 py-2"
        >
          <UCheckbox
            :model-value="!isCourtesy(traveler) && !optedOut.has(traveler.id)"
            :label="fullName(traveler)"
            :disabled="busy || isCourtesy(traveler)"
            class="min-w-0"
            :ui="{ label: 'truncate' }"
            @update:model-value="toggle(traveler, $event)"
          />
          <UBadge
            v-if="traveler.kind === 'coordinator'"
            :label="isCourtesy(traveler) ? 'Cortesía' : 'Coordinador'"
            :color="isCourtesy(traveler) ? 'info' : 'neutral'"
            variant="subtle"
            class="shrink-0"
          />
        </li>
      </ul>
    </div>
  </UCard>
</template>

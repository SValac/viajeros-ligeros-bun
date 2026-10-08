<script setup lang="ts">
import type { ProviderPriceAdjustment, QuotationProvider } from '~/types/quotation';
import type { Traveler } from '~/types/traveler';

import { calculateAdjustedUnitCost, formatPriceAdjustment } from '~/composables/quotation/use-quotation-domain';
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
  /** Para el costo de referencia con el autobús lleno. */
  sellableSeats: number;
  /** Precios por tipo de persona del servicio (Niño -10%...). */
  adjustments?: ProviderPriceAdjustment[];
  /** travelerId → id del ajuste que paga; sin entrada = precio base. */
  adjustmentByTraveler?: Map<string, string>;
  busy?: boolean;
};

const { service, occupants, optedOut, paid, sellableSeats, adjustments = [], adjustmentByTraveler = new Map(), busy = false } = defineProps<Props>();

const emit = defineEmits<{
  change: [travelerIds: string[], toman: boolean];
  adjust: [travelerIds: string[], adjustmentId: string | null];
}>();

const BASE = 'base';

// Opciones del select de precio de cada viajero.
const priceOptions = computed(() => [
  { label: `Precio base · ${formatCurrency(service.unitCost ?? 0)}`, value: BASE },
  ...adjustments.map(a => ({
    label: `${a.label} ${formatPriceAdjustment(a, formatCurrency)} · ${formatCurrency(calculateAdjustedUnitCost(service.unitCost ?? 0, a))}`,
    value: a.id,
  })),
]);

function priceOf(traveler: Traveler): number {
  const adjustment = adjustments.find(a => a.id === adjustmentByTraveler.get(traveler.id));
  return calculateAdjustedUnitCost(service.unitCost ?? 0, adjustment);
}

// Con cortesía, los coordinadores no cuentan para el pago y no se marcan.
function isCourtesy(traveler: Traveler): boolean {
  return service.coordinatorsCourtesy && traveler.kind === 'coordinator';
}

const selectable = computed(() => occupants.filter(t => !isCourtesy(t)));
const takers = computed(() => selectable.value.filter(t => !optedOut.has(t.id)));

// "2 × $150 + 1 × $135": cuántos pagan cada precio.
const breakdown = computed(() => {
  const counts = new Map<number, number>();
  for (const traveler of takers.value)
    counts.set(priceOf(traveler), (counts.get(priceOf(traveler)) ?? 0) + 1);
  return [...counts.entries()]
    .sort((a, b) => b[0] - a[0])
    .map(([price, count]) => `${count} × ${formatCurrency(price)}`)
    .join(' + ');
});

const pending = computed(() => Math.max(0, service.payableCost - paid));
const overpaid = computed(() => Math.max(0, paid - service.payableCost));

const allTake = computed(() => takers.value.length === selectable.value.length);
const noneTake = computed(() => takers.value.length === 0);

function fullName(traveler: Traveler): string {
  return `${traveler.firstName} ${traveler.lastName}`.trim();
}

function byName(a: Traveler, b: Traveler): number {
  return fullName(a).localeCompare(fullName(b), 'es');
}

type Row = {
  traveler: Traveler;
  /** Solo en acompañantes: a quién acompañan. */
  representativeName?: string;
  takes: boolean;
  courtesy: boolean;
};

// Quienes vienen con el mismo representante van juntos: el representante y después sus
// acompañantes, por nombre del representante. Los coordinadores al final.
const rows = computed<Row[]>(() => {
  const travelers = occupants.filter(t => t.kind === 'traveler');
  const byId = new Map(travelers.map(t => [t.id, t]));
  const toRow = (traveler: Traveler, representative?: Traveler): Row => {
    const courtesy = isCourtesy(traveler);
    return {
      traveler,
      representativeName: representative ? fullName(representative) : undefined,
      takes: !courtesy && !optedOut.has(traveler.id),
      courtesy,
    };
  };

  const leads = travelers.filter(t => !t.representativeId || !byId.has(t.representativeId)).sort(byName);
  const result = leads.flatMap(lead => [
    toRow(lead),
    ...travelers.filter(t => t.representativeId === lead.id).sort(byName).map(t => toRow(t, lead)),
  ]);

  const coordinators = occupants.filter(t => t.kind === 'coordinator').sort(byName);
  return [...result, ...coordinators.map(t => toRow(t))];
});

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
            {{ breakdown || `${formatCurrency(service.unitCost ?? 0)} × 0` }}
          </dd>
        </div>
        <div>
          <dt class="text-muted">
            Con el autobús lleno
          </dt>
          <dd class="font-semibold text-lg">
            {{ formatCurrency((service.unitCost ?? 0) * sellableSeats) }}
          </dd>
          <dd class="text-xs text-muted">
            {{ sellableSeats }} asientos vendibles
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

      <ul
        v-else
        class="grid gap-2 sm:grid-cols-2"
        :class="adjustments.length === 0 && 'xl:grid-cols-3'"
      >
        <li
          v-for="row in rows"
          :key="row.traveler.id"
          class="rounded-md border border-default px-3 py-2 space-y-2"
        >
          <div class="flex items-center justify-between gap-2">
            <UCheckbox
              :model-value="row.takes"
              :disabled="busy || row.courtesy"
              class="min-w-0"
              :ui="{ label: 'truncate' }"
              @update:model-value="value => emit('change', [row.traveler.id], value === true)"
            >
              <template #label>
                <!-- Mismo ícono de coordinador que en Habitaciones -->
                <UIcon
                  v-if="row.traveler.kind === 'coordinator'"
                  name="i-lucide-user-cog"
                  class="size-4 text-info align-[-3px] mr-1"
                  aria-hidden="true"
                />
                {{ fullName(row.traveler) }}
                <span
                  v-if="row.representativeName"
                  class="font-normal text-muted"
                  :title="`Acompaña a ${row.representativeName}`"
                >
                  · <UIcon name="i-lucide-user-star" class="size-3.5 text-primary align-[-2px]" />
                  {{ row.representativeName }}
                </span>
              </template>
            </UCheckbox>
            <UBadge
              v-if="row.traveler.kind === 'coordinator'"
              :label="row.courtesy ? 'Cortesía' : 'Coordinador'"
              :color="row.courtesy ? 'info' : 'neutral'"
              variant="subtle"
              class="shrink-0"
            />
          </div>
          <USelect
            v-if="adjustments.length > 0 && row.takes"
            :model-value="adjustmentByTraveler.get(row.traveler.id) ?? BASE"
            :items="priceOptions"
            :disabled="busy"
            size="sm"
            class="w-full"
            :aria-label="`Precio de ${fullName(row.traveler)}`"
            @update:model-value="v => emit('adjust', [row.traveler.id], v === BASE ? null : String(v))"
          />
        </li>
      </ul>
    </div>
  </UCard>
</template>

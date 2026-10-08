<script setup lang="ts">
import type { OptionalServiceMember } from '~/components/travel-optional-service-group.vue';
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

type MemberGroup = {
  key: string;
  title: string;
  subtitle: string;
  members: OptionalServiceMember[];
};

function fullName(traveler: Traveler): string {
  return `${traveler.firstName} ${traveler.lastName}`.trim();
}

function byName(a: Traveler, b: Traveler): number {
  return fullName(a).localeCompare(fullName(b), 'es');
}

function toMember(traveler: Traveler): OptionalServiceMember {
  const courtesy = isCourtesy(traveler);
  return { traveler, courtesy, takes: !courtesy && !optedOut.has(traveler.id) };
}

// Cada representante con sus acompañantes, por nombre del representante; luego quienes
// viajan sin acompañantes y al final los coordinadores. Un acompañante cuyo representante
// no está cuenta como sin acompañantes.
const groups = computed<MemberGroup[]>(() => {
  const travelers = occupants.filter(t => t.kind === 'traveler');
  const ids = new Set(travelers.map(t => t.id));
  const isCompanion = (t: Traveler) => !!t.representativeId && ids.has(t.representativeId);

  const result: MemberGroup[] = [];
  const alone: Traveler[] = [];

  for (const lead of travelers.filter(t => !isCompanion(t)).sort(byName)) {
    const companions = travelers.filter(t => t.representativeId === lead.id).sort(byName);
    if (companions.length === 0) {
      alone.push(lead);
      continue;
    }
    result.push({
      key: lead.id,
      title: fullName(lead),
      subtitle: `Representante con ${companions.length} acompañante${companions.length === 1 ? '' : 's'}`,
      members: [lead, ...companions].map(toMember),
    });
  }

  if (alone.length > 0) {
    result.push({
      key: 'alone',
      title: 'Sin acompañantes',
      subtitle: `${alone.length} viajero${alone.length === 1 ? '' : 's'}`,
      members: alone.map(toMember),
    });
  }

  const coordinators = occupants.filter(t => t.kind === 'coordinator').sort(byName);
  if (coordinators.length > 0) {
    result.push({
      key: 'coordinators',
      title: 'Coordinadores',
      subtitle: service.coordinatorsCourtesy
        ? 'Cortesía del proveedor: no cuentan para el pago'
        : `${coordinators.length} coordinador${coordinators.length === 1 ? '' : 'es'}`,
      members: coordinators.map(toMember),
    });
  }

  return result;
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

      <div v-else class="space-y-3">
        <TravelOptionalServiceGroup
          v-for="group in groups"
          :key="group.key"
          :title="group.title"
          :subtitle="group.subtitle"
          :members="group.members"
          :busy="busy"
          @change="(ids, toman) => emit('change', ids, toman)"
        />
      </div>
    </div>
  </UCard>
</template>

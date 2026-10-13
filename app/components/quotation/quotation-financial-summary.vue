<script setup lang="ts">
import { useTravelCoordinatorCount } from '~/composables/travels/use-travel-coordinator-count';
import { formatCurrency } from '~/utils/currency';

type Props = {
  quotationId: string;
  travelersCollected: number;
};

const { quotationId, travelersCollected } = defineProps<Props>();

const quotationStore = useQuotationStore();

const quotation = computed(() =>
  quotationStore.quotations.find(c => c.id === quotationId),
);
const coordinatorCount = useTravelCoordinatorCount(() => quotation.value?.travelId);

const providersCost = computed(() => quotationStore.getProvidersFullBusCost(quotationId, coordinatorCount.value));
const minimumSplitCost = computed(() => quotationStore.getProvidersMinimumSplitCost(quotationId));
const totalSplitCost = computed(() => quotationStore.getProvidersTotalSplitCost(quotationId));
const perPersonSeatCost = computed(() => quotationStore.getPerPersonSeatCost(quotationId));
const accommodationsCost = computed(() => quotationStore.getAccommodationsTotalCost(quotationId));
const busesCost = computed(() => quotationStore.getBusesTotalCost(quotationId));
const busesMinimumSplitCost = computed(() => quotationStore.getBusesMinimumSplitCost(quotationId));
const busesTotalSplitCost = computed(() => quotationStore.getBusesTotalSplitCost(quotationId));
const expensesCost = computed(() => quotationStore.getExpensesTotal(quotationId));
const totalCost = computed(() => providersCost.value + busesCost.value + expensesCost.value);
const minimumCostWithBuses = computed(() => minimumSplitCost.value + busesMinimumSplitCost.value + quotationStore.getExpensesMinimumSplit(quotationId));
const fullCapacityCostWithBuses = computed(() => totalSplitCost.value + busesTotalSplitCost.value + quotationStore.getExpensesTotalSplit(quotationId));
const projectedProfit = computed(() => quotationStore.getProjectedProfit(quotationId, coordinatorCount.value));
const breakEvenSeat = computed(() => quotationStore.getBreakEvenSeat(quotationId, coordinatorCount.value));
// Total seats minus the coordinators when they take passenger seats.
const sellableSeats = computed(() => quotationStore.getSellableSeats(quotationId, coordinatorCount.value));
const pendingBalance = computed(() => quotationStore.getTotalPendingBalanceProviders(quotationId));
const accommodationsPendingBalance = computed(() => quotationStore.getTotalPendingBalanceAccommodations(quotationId));
const busesPendingBalance = computed(() => quotationStore.getTotalPendingBalanceBuses(quotationId));

const totalToPay = computed(() =>
  pendingBalance.value + accommodationsPendingBalance.value + busesPendingBalance.value,
);

// Each pending balance row: what's owed to that kind of supplier. With no costs there's
// nothing to settle, so it doesn't read "Liquidado".
const toPay = computed(() => [
  { label: 'Servicios', icon: 'i-lucide-building', cost: providersCost.value, balance: pendingBalance.value },
  { label: 'Hospedaje', icon: 'i-lucide-hotel', cost: accommodationsCost.value, balance: accommodationsPendingBalance.value },
  { label: 'Autobuses', icon: 'i-lucide-bus', cost: busesCost.value, balance: busesPendingBalance.value },
].map(item => ({
  ...item,
  text: item.cost === 0 ? 'Sin costos' : item.balance > 0 ? formatCurrency(item.balance) : 'Liquidado',
  className: item.cost === 0 ? 'text-muted' : balanceColor(item.balance),
})));

// Color only marks status: profit/loss and pending/settled balance.
// Costs, prices and totals use plain text.
const profitColor = computed(() => {
  if (projectedProfit.value > 0)
    return 'text-success';
  if (projectedProfit.value < 0)
    return 'text-error';
  return 'text-highlighted';
});

function balanceColor(balance: number): string {
  return balance > 0 ? 'text-warning' : 'text-success';
}
</script>

<template>
  <div class="space-y-8">
    <!-- 1. Costs -->
    <QuotationSummarySection
      title="Costos del viaje"
      description="Lo que cuesta operar el viaje. El hospedaje se cobra aparte en los precios al público."
    >
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <QuotationKpiCard
          label="Costo total"
          icon="i-lucide-wallet"
          :value="formatCurrency(totalCost)"
        >
          <p>Servicios + autobuses + gastos</p>
        </QuotationKpiCard>
        <QuotationKpiCard
          label="Servicios"
          icon="i-lucide-building"
          :value="formatCurrency(providersCost)"
        />
        <QuotationKpiCard
          label="Autobuses"
          icon="i-lucide-bus"
          :value="formatCurrency(busesCost)"
        />
        <QuotationKpiCard
          label="Gastos adicionales"
          icon="i-lucide-receipt"
          :value="formatCurrency(expensesCost)"
        />
        <QuotationKpiCard
          label="Hospedaje"
          icon="i-lucide-door-open"
          :value="formatCurrency(accommodationsCost)"
        >
          <p>No entra en el precio por asiento</p>
        </QuotationKpiCard>
      </div>
    </QuotationSummarySection>

    <!-- 2. Price and profit -->
    <QuotationSummarySection
      title="Precio y ganancia"
      description="Cuánto se cobra por asiento, desde qué asiento se gana y cuánto deja el viaje lleno."
    >
      <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
        <QuotationKpiCard
          label="Precio por asiento"
          icon="i-lucide-armchair"
          :value="formatCurrency(quotation?.seatPrice ?? 0)"
        >
          <p>
            Reparto mínimo: <span class="font-medium tabular-nums">{{ formatCurrency(minimumCostWithBuses) }}</span>
            ÷ {{ quotation?.minimumSeatTarget ?? 0 }} asientos
          </p>
          <p>
            Reparto total: <span class="font-medium tabular-nums">{{ formatCurrency(fullCapacityCostWithBuses) }}</span>
            ÷ {{ sellableSeats }} asientos vendibles
          </p>
          <p v-if="perPersonSeatCost > 0">
            Servicios por persona: + <span class="font-medium tabular-nums">{{ formatCurrency(perPersonSeatCost) }}</span> por asiento
          </p>
        </QuotationKpiCard>
        <QuotationKpiCard
          label="Meta mínima de asientos"
          icon="i-lucide-target"
          :value="String(quotation?.minimumSeatTarget ?? 0)"
        >
          <p v-if="breakEvenSeat === 0">
            Sin precio por asiento todavía
          </p>
          <p v-else-if="breakEvenSeat > sellableSeats" class="text-error">
            Sin ganancia aun con el autobús lleno
          </p>
          <p v-else>
            Ganancia a partir del asiento {{ breakEvenSeat }}
          </p>
        </QuotationKpiCard>
        <QuotationKpiCard
          label="Ganancia proyectada"
          :icon="projectedProfit < 0 ? 'i-lucide-trending-down' : 'i-lucide-trending-up'"
          :value="formatCurrency(projectedProfit)"
          :value-class="profitColor"
        >
          <p>
            {{ sellableSeats }} asientos vendibles × {{ formatCurrency(quotation?.seatPrice ?? 0) }} − costo total
          </p>
        </QuotationKpiCard>
      </div>
    </QuotationSummarySection>

    <!-- 3. Payments -->
    <QuotationSummarySection
      title="Pagos"
      description="Lo que ya pagaron los viajeros y lo que falta pagar a proveedores."
    >
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <QuotationKpiCard
          label="Cobrado a viajeros"
          icon="i-lucide-users"
          :value="formatCurrency(travelersCollected)"
        />
        <QuotationKpiCard
          label="Por pagar a proveedores"
          icon="i-lucide-clock"
          :value="formatCurrency(totalToPay)"
          :value-class="balanceColor(totalToPay)"
        >
          <ul class="space-y-1">
            <li
              v-for="item in toPay"
              :key="item.label"
              class="flex items-center justify-between gap-3"
            >
              <span class="flex items-center gap-1.5">
                <UIcon :name="item.icon" class="size-3.5" />
                {{ item.label }}
              </span>
              <span class="font-medium tabular-nums" :class="item.className">
                {{ item.text }}
              </span>
            </li>
          </ul>
        </QuotationKpiCard>
      </div>
    </QuotationSummarySection>
  </div>
</template>

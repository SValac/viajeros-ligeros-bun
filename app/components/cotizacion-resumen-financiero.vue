<script setup lang="ts">
type Props = {
  quotationId: string;
  acumuladoViajeros: number;
};

const { quotationId, acumuladoViajeros } = defineProps<Props>();

const cotizacionStore = useCotizacionStore();

const cotizacion = computed(() =>
  cotizacionStore.cotizaciones.find(c => c.id === quotationId),
);

const costoProveedores = computed(() => cotizacionStore.getCostoTotal(quotationId));
const costoTipoMinimo = computed(() => cotizacionStore.getCostoTipoMinimo(quotationId));
const costoTipoTotal = computed(() => cotizacionStore.getCostoTipoTotal(quotationId));
const costoHospedajes = computed(() => cotizacionStore.getTotalCostoHospedajes(quotationId));
const costoBuses = computed(() => cotizacionStore.getTotalCostoBuses(quotationId));
const costoBusesTipoMinimo = computed(() => cotizacionStore.getCostoBusesTipoMinimo(quotationId));
const costoBusesTipoTotal = computed(() => cotizacionStore.getCostoBusesTipoTotal(quotationId));
const costoTotal = computed(() => costoProveedores.value + costoBuses.value);
const costoMinimoConBuses = computed(() => costoTipoMinimo.value + costoBusesTipoMinimo.value);
const costoCapacidadConBuses = computed(() => costoTipoTotal.value + costoBusesTipoTotal.value);
const gananciaProyectada = computed(() => cotizacionStore.getGananciaProyectada(quotationId));
const saldoPendiente = computed(() => cotizacionStore.getSaldoTotalPendiente(quotationId));
const saldoPendienteHospedajes = computed(() => cotizacionStore.getSaldoTotalPendienteHospedajes(quotationId));
const saldoPendienteBuses = computed(() => cotizacionStore.getSaldoTotalPendienteBuses(quotationId));

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
  }).format(amount);
}
</script>

<template>
  <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
    <!-- Costo Total (Proveedores + Buses) -->
    <UCard>
      <div class="space-y-1">
        <p class="text-sm text-muted flex items-center gap-2">
          <span class="i-lucide-wallet w-4 h-4 text-error" />
          Costo Total
        </p>
        <p class="text-2xl font-bold text-error">
          {{ formatCurrency(costoTotal) }}
        </p>
        <div class="flex flex-wrap gap-x-3 gap-y-1 pt-1">
          <span class="text-xs text-muted">
            Servicios: <span class="font-medium">{{ formatCurrency(costoProveedores) }}</span>
          </span>
          <span class="text-xs text-muted">
            Buses: <span class="font-medium">{{ formatCurrency(costoBuses) }}</span>
          </span>
          <span class="text-xs text-muted">
            <span class="font-medium text-blue-500">{{ formatCurrency(costoMinimoConBuses) }}</span>
            ÷ asientos mín.
          </span>
          <span class="text-xs text-muted">
            <span class="font-medium">{{ formatCurrency(costoCapacidadConBuses) }}</span>
            ÷ cap. bus
          </span>
        </div>
      </div>
    </UCard>

    <!-- Total Autobuses -->
    <UCard>
      <div class="space-y-1">
        <p class="text-sm text-muted flex items-center gap-2">
          <span class="i-lucide-bus w-4 h-4 text-purple-500" />
          Total Autobuses
        </p>
        <p class="text-2xl font-bold text-purple-600 dark:text-purple-400">
          {{ formatCurrency(costoBuses) }}
        </p>
        <!-- <p class="text-xs text-muted pt-1">
          Incluido en costo total: {{ formatCurrency(costoTotal) }}
        </p> -->
      </div>
    </UCard>

    <!-- Total Hospedaje -->
    <UCard>
      <div class="space-y-1">
        <p class="text-sm text-muted flex items-center gap-2">
          <span class="i-lucide-door-open w-4 h-4 text-amber-500" />
          Total Hospedaje
        </p>
        <p class="text-2xl font-bold text-amber-600 dark:text-amber-400">
          {{ formatCurrency(costoHospedajes) }}
        </p>
        <!-- <p class="text-xs text-muted pt-1">
          Costo Total: {{ formatCurrency(costoTotalConHospedaje) }}
        </p> -->
      </div>
    </UCard>

    <!-- Precio por Asiento -->
    <UCard>
      <div class="space-y-1">
        <p class="text-sm text-muted flex items-center gap-2">
          <span class="i-lucide-armchair w-4 h-4 text-blue-500" />
          Precio por Asiento
        </p>
        <p class="text-2xl font-bold text-blue-600 dark:text-blue-400">
          {{ formatCurrency(cotizacion?.seatPrice ?? 0) }}
        </p>
        <div class="flex flex-wrap gap-x-3 gap-y-1 pt-1">
          <span class="text-xs text-muted">
            Servicios: <span class="font-medium">{{ formatCurrency(costoMinimoConBuses) }}</span>
            ÷ asientos mín.
          </span>
          <span class="text-xs text-muted">
            Buses: <span class="font-medium">{{ formatCurrency(costoCapacidadConBuses) }}</span>
            ÷ cap. bus
          </span>
          <span class="text-xs text-muted italic">
            Hospedaje no incluido
          </span>
        </div>
      </div>
    </UCard>

    <!-- Asiento Mínimo / Objetivo -->
    <UCard>
      <div class="space-y-1">
        <p class="text-sm text-muted flex items-center gap-2">
          <span class="i-lucide-target w-4 h-4 text-warning" />
          Asiento Mínimo Objetivo
        </p>
        <p class="text-2xl font-bold text-warning">
          {{ cotizacion?.minimumSeatTarget ?? 0 }}
        </p>
        <p class="text-xs text-muted">
          Ganancia a partir del asiento {{ (cotizacion?.minimumSeatTarget ?? 0) + 1 }}
        </p>
      </div>
    </UCard>

    <!-- Ganancia Proyectada -->
    <UCard>
      <div class="space-y-1">
        <p class="text-sm text-muted flex items-center gap-2">
          <span class="i-lucide-trending-up w-4 h-4 text-success" />
          Ganancia Proyectada
        </p>
        <p class="text-2xl font-bold text-success">
          {{ formatCurrency(gananciaProyectada) }}
        </p>
        <p class="text-xs text-muted pt-1">
          ({{ cotizacion?.busCapacity ?? 0 }} asientos × {{ formatCurrency(cotizacion?.seatPrice ?? 0) }}) − costo total
        </p>
      </div>
    </UCard>

    <!-- Acumulado Viajeros -->
    <UCard>
      <div class="space-y-1">
        <p class="text-sm text-muted flex items-center gap-2">
          <span class="i-lucide-users w-4 h-4 text-indigo-500" />
          Acumulado Viajeros
        </p>
        <p class="text-2xl font-bold text-indigo-600 dark:text-indigo-400">
          {{ formatCurrency(acumuladoViajeros) }}
        </p>
      </div>
    </UCard>

    <!-- Saldo Pendiente Proveedores -->
    <UCard>
      <div class="space-y-1">
        <p class="text-sm text-muted flex items-center gap-2">
          <span
            class="i-lucide-clock w-4 h-4"
            :class="saldoPendiente > 0 ? 'text-warning' : 'text-success'"
          />
          Saldo Pendiente Proveedores
        </p>
        <p
          class="text-2xl font-bold"
          :class="saldoPendiente > 0 ? 'text-warning' : 'text-success'"
        >
          {{ formatCurrency(saldoPendiente) }}
        </p>
      </div>
    </UCard>

    <!-- Saldo Pendiente Hospedajes -->
    <UCard>
      <div class="space-y-1">
        <p class="text-sm text-muted flex items-center gap-2">
          <span
            class="i-lucide-hotel w-4 h-4"
            :class="saldoPendienteHospedajes > 0 ? 'text-warning' : 'text-success'"
          />
          Saldo Pendiente Hospedaje
        </p>
        <p
          class="text-2xl font-bold"
          :class="saldoPendienteHospedajes > 0 ? 'text-warning' : 'text-success'"
        >
          {{ formatCurrency(saldoPendienteHospedajes) }}
        </p>
      </div>
    </UCard>

    <!-- Saldo Pendiente Autobuses -->
    <UCard>
      <div class="space-y-1">
        <p class="text-sm text-muted flex items-center gap-2">
          <span
            class="i-lucide-bus w-4 h-4"
            :class="saldoPendienteBuses > 0 ? 'text-warning' : 'text-success'"
          />
          Saldo Pendiente Autobuses
        </p>
        <p
          class="text-2xl font-bold"
          :class="saldoPendienteBuses > 0 ? 'text-warning' : 'text-success'"
        >
          {{ formatCurrency(saldoPendienteBuses) }}
        </p>
      </div>
    </UCard>
  </div>
</template>

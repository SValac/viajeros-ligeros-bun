<script setup lang="ts">
type Props = {
  cotizacionId: string;
  acumuladoViajeros: number;
};

const { cotizacionId, acumuladoViajeros } = defineProps<Props>();

const cotizacionStore = useCotizacionStore();

const cotizacion = computed(() =>
  cotizacionStore.cotizaciones.find(c => c.id === cotizacionId),
);

const costoTotal = computed(() => cotizacionStore.getCostoTotal(cotizacionId));
const costoTipoMinimo = computed(() => cotizacionStore.getCostoTipoMinimo(cotizacionId));
const costoTipoTotal = computed(() => cotizacionStore.getCostoTipoTotal(cotizacionId));
const costoHospedajes = computed(() => cotizacionStore.getTotalCostoHospedajes(cotizacionId));
const costoTotalConHospedaje = computed(() => costoTotal.value + costoHospedajes.value);
const gananciaProyectada = computed(() => cotizacionStore.getGananciaProyectada(cotizacionId));
const saldoPendiente = computed(() => cotizacionStore.getSaldoTotalPendiente(cotizacionId));

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
  }).format(amount);
}
</script>

<template>
  <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
    <!-- Costo Total Proveedores -->
    <UCard>
      <div class="space-y-1">
        <p class="text-sm text-muted flex items-center gap-2">
          <span class="i-lucide-wallet w-4 h-4 text-error" />
          Costo Total Proveedores
        </p>
        <p class="text-2xl font-bold text-error">
          {{ formatCurrency(costoTotal) }}
        </p>
        <div class="flex flex-wrap gap-2 pt-1">
          <span class="text-xs text-muted">
            <span class="font-medium text-blue-500">{{ formatCurrency(costoTipoMinimo) }}</span>
            ÷ asientos mín.
          </span>
          <span class="text-xs text-muted">
            <span class="font-medium">{{ formatCurrency(costoTipoTotal) }}</span>
            ÷ cap. bus
          </span>
        </div>
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
        <p class="text-xs text-muted pt-1">
          Costo Total: {{ formatCurrency(costoTotalConHospedaje) }}
        </p>
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
          {{ formatCurrency(cotizacion?.precioAsiento ?? 0) }}
        </p>
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
          {{ cotizacion?.asientoMinimoObjetivo ?? 0 }}
        </p>
        <p class="text-xs text-muted">
          Ganancia a partir del asiento {{ (cotizacion?.asientoMinimoObjetivo ?? 0) + 1 }}
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
  </div>
</template>

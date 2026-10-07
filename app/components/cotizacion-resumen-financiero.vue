<script setup lang="ts">
import { formatCurrency } from '~/utils/currency';

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
const asientoConGanancia = computed(() => cotizacionStore.getAsientoConGanancia(quotationId));
// Total seats minus the coordinators when they take passenger seats.
const asientosVendibles = computed(() => cotizacionStore.getAsientosVendibles(quotationId));
const saldoPendiente = computed(() => cotizacionStore.getSaldoTotalPendiente(quotationId));
const saldoPendienteHospedajes = computed(() => cotizacionStore.getSaldoTotalPendienteHospedajes(quotationId));
const saldoPendienteBuses = computed(() => cotizacionStore.getSaldoTotalPendienteBuses(quotationId));

// El color solo marca estado: ganancia/pérdida aquí y saldo pendiente/liquidado abajo.
// Costos, precios y totales van en texto normal.
const gananciaColor = computed(() => {
  if (gananciaProyectada.value > 0)
    return 'text-success';
  if (gananciaProyectada.value < 0)
    return 'text-error';
  return 'text-highlighted';
});
</script>

<template>
  <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
    <!-- Costo Total (Servicios + Buses, sin hospedaje) -->
    <UCard>
      <div class="space-y-1">
        <p class="text-sm text-muted flex items-center gap-2">
          <UIcon name="i-lucide-wallet" class="w-4 h-4" />
          Costo Total
        </p>
        <p class="text-2xl font-bold text-highlighted">
          {{ formatCurrency(costoTotal) }}
        </p>
        <div class="flex flex-wrap gap-x-3 gap-y-1 pt-1">
          <span class="text-xs text-muted">
            Servicios: <span class="font-medium">{{ formatCurrency(costoProveedores) }}</span>
          </span>
          <span class="text-xs text-muted">
            Buses: <span class="font-medium">{{ formatCurrency(costoBuses) }}</span>
          </span>
          <span class="text-xs text-muted italic">
            Hospedaje no incluido
          </span>
        </div>
      </div>
    </UCard>

    <!-- Total Autobuses -->
    <UCard>
      <div class="space-y-1">
        <p class="text-sm text-muted flex items-center gap-2">
          <UIcon name="i-lucide-bus" class="w-4 h-4" />
          Total Autobuses
        </p>
        <p class="text-2xl font-bold text-highlighted">
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
          <UIcon name="i-lucide-door-open" class="w-4 h-4" />
          Total Hospedaje
        </p>
        <p class="text-2xl font-bold text-highlighted">
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
          <UIcon name="i-lucide-armchair" class="w-4 h-4" />
          Precio por Asiento
        </p>
        <p class="text-2xl font-bold text-highlighted">
          {{ formatCurrency(cotizacion?.seatPrice ?? 0) }}
        </p>
        <div class="flex flex-wrap gap-x-3 gap-y-1 pt-1">
          <span class="text-xs text-muted">
            Reparto mínimo: <span class="font-medium">{{ formatCurrency(costoMinimoConBuses) }}</span>
            ÷ {{ cotizacion?.minimumSeatTarget ?? 0 }} asientos
          </span>
          <span class="text-xs text-muted">
            Reparto total: <span class="font-medium">{{ formatCurrency(costoCapacidadConBuses) }}</span>
            ÷ {{ asientosVendibles }} asientos vendibles
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
          <UIcon name="i-lucide-target" class="w-4 h-4" />
          Meta mínima de asientos
        </p>
        <p class="text-2xl font-bold text-highlighted">
          {{ cotizacion?.minimumSeatTarget ?? 0 }}
        </p>
        <p v-if="asientoConGanancia === 0" class="text-xs text-muted">
          Sin precio por asiento todavía
        </p>
        <p v-else-if="asientoConGanancia > asientosVendibles" class="text-xs text-error">
          Sin ganancia aun con el autobús lleno
        </p>
        <p v-else class="text-xs text-muted">
          Ganancia a partir del asiento {{ asientoConGanancia }}
        </p>
      </div>
    </UCard>

    <!-- Ganancia Proyectada -->
    <UCard>
      <div class="space-y-1">
        <p class="text-sm text-muted flex items-center gap-2">
          <UIcon
            :name="gananciaProyectada < 0 ? 'i-lucide-trending-down' : 'i-lucide-trending-up'"
            class="w-4 h-4"
            :class="gananciaColor"
          />
          Ganancia Proyectada
        </p>
        <p class="text-2xl font-bold" :class="gananciaColor">
          {{ formatCurrency(gananciaProyectada) }}
        </p>
        <p class="text-xs text-muted pt-1">
          ({{ asientosVendibles }} asientos vendibles × {{ formatCurrency(cotizacion?.seatPrice ?? 0) }}) − costo total
          <span class="block italic">Hospedaje no incluido</span>
        </p>
      </div>
    </UCard>

    <!-- Acumulado Viajeros -->
    <UCard>
      <div class="space-y-1">
        <p class="text-sm text-muted flex items-center gap-2">
          <UIcon name="i-lucide-users" class="w-4 h-4" />
          Acumulado Viajeros
        </p>
        <p class="text-2xl font-bold text-highlighted">
          {{ formatCurrency(acumuladoViajeros) }}
        </p>
      </div>
    </UCard>

    <!-- Saldo Pendiente Proveedores -->
    <UCard>
      <div class="space-y-1">
        <p class="text-sm text-muted flex items-center gap-2">
          <UIcon
            name="i-lucide-clock"
            class="w-4 h-4"
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
          <UIcon
            name="i-lucide-hotel"
            class="w-4 h-4"
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
          <UIcon
            name="i-lucide-bus"
            class="w-4 h-4"
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

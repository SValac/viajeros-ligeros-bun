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
const costoPorPersonaAsiento = computed(() => cotizacionStore.getCostoPorPersonaAsiento(quotationId));
const costoHospedajes = computed(() => cotizacionStore.getTotalCostoHospedajes(quotationId));
const costoBuses = computed(() => cotizacionStore.getTotalCostoBuses(quotationId));
const costoBusesTipoMinimo = computed(() => cotizacionStore.getCostoBusesTipoMinimo(quotationId));
const costoBusesTipoTotal = computed(() => cotizacionStore.getCostoBusesTipoTotal(quotationId));
const costoGastos = computed(() => cotizacionStore.getTotalGastos(quotationId));
const costoTotal = computed(() => costoProveedores.value + costoBuses.value + costoGastos.value);
const costoMinimoConBuses = computed(() => costoTipoMinimo.value + costoBusesTipoMinimo.value + cotizacionStore.getGastosTipoMinimo(quotationId));
const costoCapacidadConBuses = computed(() => costoTipoTotal.value + costoBusesTipoTotal.value + cotizacionStore.getGastosTipoTotal(quotationId));
const gananciaProyectada = computed(() => cotizacionStore.getGananciaProyectada(quotationId));
const asientoConGanancia = computed(() => cotizacionStore.getAsientoConGanancia(quotationId));
// Total seats minus the coordinators when they take passenger seats.
const asientosVendibles = computed(() => cotizacionStore.getAsientosVendibles(quotationId));
const saldoPendiente = computed(() => cotizacionStore.getSaldoTotalPendiente(quotationId));
const saldoPendienteHospedajes = computed(() => cotizacionStore.getSaldoTotalPendienteHospedajes(quotationId));
const saldoPendienteBuses = computed(() => cotizacionStore.getSaldoTotalPendienteBuses(quotationId));

const totalPorPagar = computed(() =>
  saldoPendiente.value + saldoPendienteHospedajes.value + saldoPendienteBuses.value,
);

// Each pending balance row: what's owed to that kind of supplier. With no costs there's
// nothing to settle, so it doesn't read "Liquidado".
const porPagar = computed(() => [
  { label: 'Servicios', icon: 'i-lucide-building', costo: costoProveedores.value, saldo: saldoPendiente.value },
  { label: 'Hospedaje', icon: 'i-lucide-hotel', costo: costoHospedajes.value, saldo: saldoPendienteHospedajes.value },
  { label: 'Autobuses', icon: 'i-lucide-bus', costo: costoBuses.value, saldo: saldoPendienteBuses.value },
].map(item => ({
  ...item,
  texto: item.costo === 0 ? 'Sin costos' : item.saldo > 0 ? formatCurrency(item.saldo) : 'Liquidado',
  clase: item.costo === 0 ? 'text-muted' : saldoColor(item.saldo),
})));

// El color solo marca estado: ganancia/pérdida y saldo pendiente/liquidado.
// Costos, precios y totales van en texto normal.
const gananciaColor = computed(() => {
  if (gananciaProyectada.value > 0)
    return 'text-success';
  if (gananciaProyectada.value < 0)
    return 'text-error';
  return 'text-highlighted';
});

function saldoColor(saldo: number): string {
  return saldo > 0 ? 'text-warning' : 'text-success';
}
</script>

<template>
  <div class="space-y-8">
    <!-- 1. Costos -->
    <CotizacionResumenSeccion
      title="Costos del viaje"
      description="Lo que cuesta operar el viaje. El hospedaje se cobra aparte en los precios al público."
    >
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <CotizacionKpiCard
          label="Costo total"
          icon="i-lucide-wallet"
          :value="formatCurrency(costoTotal)"
        >
          <p>Servicios + autobuses + gastos</p>
        </CotizacionKpiCard>
        <CotizacionKpiCard
          label="Servicios"
          icon="i-lucide-building"
          :value="formatCurrency(costoProveedores)"
        />
        <CotizacionKpiCard
          label="Autobuses"
          icon="i-lucide-bus"
          :value="formatCurrency(costoBuses)"
        />
        <CotizacionKpiCard
          label="Gastos adicionales"
          icon="i-lucide-receipt"
          :value="formatCurrency(costoGastos)"
        />
        <CotizacionKpiCard
          label="Hospedaje"
          icon="i-lucide-door-open"
          :value="formatCurrency(costoHospedajes)"
        >
          <p>No entra en el precio por asiento</p>
        </CotizacionKpiCard>
      </div>
    </CotizacionResumenSeccion>

    <!-- 2. Precio y ganancia -->
    <CotizacionResumenSeccion
      title="Precio y ganancia"
      description="Cuánto se cobra por asiento, desde qué asiento se gana y cuánto deja el viaje lleno."
    >
      <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
        <CotizacionKpiCard
          label="Precio por asiento"
          icon="i-lucide-armchair"
          :value="formatCurrency(cotizacion?.seatPrice ?? 0)"
        >
          <p>
            Reparto mínimo: <span class="font-medium tabular-nums">{{ formatCurrency(costoMinimoConBuses) }}</span>
            ÷ {{ cotizacion?.minimumSeatTarget ?? 0 }} asientos
          </p>
          <p>
            Reparto total: <span class="font-medium tabular-nums">{{ formatCurrency(costoCapacidadConBuses) }}</span>
            ÷ {{ asientosVendibles }} asientos vendibles
          </p>
          <p v-if="costoPorPersonaAsiento > 0">
            Servicios por persona: + <span class="font-medium tabular-nums">{{ formatCurrency(costoPorPersonaAsiento) }}</span> por asiento
          </p>
        </CotizacionKpiCard>
        <CotizacionKpiCard
          label="Meta mínima de asientos"
          icon="i-lucide-target"
          :value="String(cotizacion?.minimumSeatTarget ?? 0)"
        >
          <p v-if="asientoConGanancia === 0">
            Sin precio por asiento todavía
          </p>
          <p v-else-if="asientoConGanancia > asientosVendibles" class="text-error">
            Sin ganancia aun con el autobús lleno
          </p>
          <p v-else>
            Ganancia a partir del asiento {{ asientoConGanancia }}
          </p>
        </CotizacionKpiCard>
        <CotizacionKpiCard
          label="Ganancia proyectada"
          :icon="gananciaProyectada < 0 ? 'i-lucide-trending-down' : 'i-lucide-trending-up'"
          :value="formatCurrency(gananciaProyectada)"
          :value-class="gananciaColor"
        >
          <p>
            {{ asientosVendibles }} asientos vendibles × {{ formatCurrency(cotizacion?.seatPrice ?? 0) }} − costo total
          </p>
        </CotizacionKpiCard>
      </div>
    </CotizacionResumenSeccion>

    <!-- 3. Pagos -->
    <CotizacionResumenSeccion
      title="Pagos"
      description="Lo que ya pagaron los viajeros y lo que falta pagar a proveedores."
    >
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <CotizacionKpiCard
          label="Cobrado a viajeros"
          icon="i-lucide-users"
          :value="formatCurrency(acumuladoViajeros)"
        />
        <CotizacionKpiCard
          label="Por pagar a proveedores"
          icon="i-lucide-clock"
          :value="formatCurrency(totalPorPagar)"
          :value-class="saldoColor(totalPorPagar)"
        >
          <ul class="space-y-1">
            <li
              v-for="item in porPagar"
              :key="item.label"
              class="flex items-center justify-between gap-3"
            >
              <span class="flex items-center gap-1.5">
                <UIcon :name="item.icon" class="size-3.5" />
                {{ item.label }}
              </span>
              <span class="font-medium tabular-nums" :class="item.clase">
                {{ item.texto }}
              </span>
            </li>
          </ul>
        </CotizacionKpiCard>
      </div>
    </CotizacionResumenSeccion>
  </div>
</template>

<script setup lang="ts">
import type { TableColumn } from '@nuxt/ui';

import { h } from 'vue';

import type { CotizacionHospedaje } from '~/types/cotizacion';

import { formatBedConfiguration } from '~/utils/hotel-room-helpers';

type Props = {
  cotizacionId: string;
};

const props = defineProps<Props>();

const cotizacionStore = useCotizacionStore();
const providerStore = useProviderStore();
const hotelRoomStore = useHotelRoomStore();

const hospedajes = computed(() => cotizacionStore.getHospedajesByCotizacion(props.cotizacionId));
const totalCosto = computed(() => cotizacionStore.getTotalCostoHospedajes(props.cotizacionId));

function getNombreHotel(providerId: string): string {
  return providerStore.getProviderById(providerId)?.nombre ?? 'Desconocido';
}

// Items del accordion — uno por hospedaje
function getDesgloseHabitaciones(hospedaje: CotizacionHospedaje): string {
  return hospedaje.detalles
    .map(d => `${d.cantidad} hab (${d.ocupacionMaxima} p)`)
    .join(' · ');
}

const accordionItems = computed(() =>
  hospedajes.value.map(h => ({
    label: `${getNombreHotel(h.providerId)} - ${getDesgloseHabitaciones(h)}`,
    value: h.id,
    slot: `hotel-${h.id}`,
  })),
);

const defaultValue = computed(() => hospedajes.value.map(h => h.id));

const costoPromedioPorPersona = computed(() => {
  let totalPersonas = 0;
  for (const h of hospedajes.value) {
    for (const d of h.detalles) {
      totalPersonas += d.cantidad * d.ocupacionMaxima;
    }
  }
  return totalPersonas > 0 ? totalCosto.value / totalPersonas : 0;
});

// ── UTable ────────────────────────────────────────────────────────────────────

type DetalleRow = {
  id: string;
  camasLabel: string;
  ocupacion: number;
  cantidad: number;
  precioPorNoche: number;
  costoPorPersona: number | undefined;
  costoTotal: number;
};

const columns: TableColumn<DetalleRow>[] = [
  {
    id: 'tipo',
    header: 'Tipo',
    cell: ({ row }) =>
      h('div', [
        h('p', { class: 'font-medium' }, row.original.camasLabel || '—'),
        h('p', { class: 'text-xs text-muted' }, `${row.original.ocupacion} ${row.original.ocupacion === 1 ? 'persona' : 'personas'}`),
      ]),
  },
  {
    accessorKey: 'cantidad',
    header: 'Habitaciones',
    cell: ({ row }) => h('div', { class: 'text-right' }, `${row.original.cantidad} hab`),
  },
  {
    accessorKey: 'precioPorNoche',
    header: 'Precio/noche',
    cell: ({ row }) => h('div', { class: 'text-right' }, `$${row.original.precioPorNoche.toFixed(2)}`),
  },
  {
    accessorKey: 'costoPorPersona',
    header: 'Precio/Persona',
    cell: ({ row }) =>
      h('div', { class: 'text-right' }, row.original.costoPorPersona != null ? `$${row.original.costoPorPersona.toFixed(2)}` : '—'),
  },
  {
    accessorKey: 'costoTotal',
    header: 'Subtotal',
    cell: ({ row }) => h('div', { class: 'text-right font-semibold' }, `$${row.original.costoTotal.toFixed(2)}`),
  },
];

function getDetalleRows(hospedaje: CotizacionHospedaje): DetalleRow[] {
  return hospedaje.detalles.map((d) => {
    const roomData = hotelRoomStore.getRoomDataByProviderId(hospedaje.providerId);
    const tipoInfo = roomData?.roomTypes.find(t => t.id === d.habitacionTipoId) ?? null;
    return {
      id: d.id,
      camasLabel: formatBedConfiguration(tipoInfo?.camas ?? []),
      ocupacion: d.ocupacionMaxima,
      cantidad: d.cantidad,
      precioPorNoche: d.precioPorNoche,
      costoPorPersona: d.costoPorPersona,
      costoTotal: d.precioPorNoche * hospedaje.cantidadNoches * d.cantidad,
    };
  });
}
</script>

<template>
  <div v-if="hospedajes.length > 0" class="space-y-4">
    <!-- Resumen General -->
    <div class="bg-linear-to-br from-primary/10 to-primary/5 rounded-lg p-4 border border-primary/20">
      <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div>
          <p class="text-xs text-muted mb-1">
            Hoteles
          </p>
          <p class="text-2xl font-bold">
            {{ hospedajes.length }}
          </p>
        </div>
        <div>
          <p class="text-xs text-muted mb-1">
            Habitaciones Totales
          </p>
          <p class="text-2xl font-bold">
            {{ hospedajes.reduce((s, h) => s + h.detalles.reduce((ss, d) => ss + d.cantidad, 0), 0) }}
          </p>
        </div>
        <div>
          <p class="text-xs text-muted mb-1">
            Costo Total
          </p>
          <p class="text-2xl font-bold text-primary">
            ${{ totalCosto.toFixed(2) }}
          </p>
        </div>
      </div>
    </div>

    <!-- Desglose por Hotel (Accordion) -->
    <div>
      <h4 class="text-sm font-semibold flex items-center gap-2 mb-2">
        <span class="i-lucide-building w-4 h-4" />
        Desglose por Hotel
      </h4>

      <UAccordion
        :items="accordionItems"
        :default-value="defaultValue"
        type="multiple"
        collapsible
        class=""
      >
        <template
          v-for="hospedaje in hospedajes"
          :key="hospedaje.id"
          #[`hotel-${hospedaje.id}`]
        >
          <UTable :data="getDetalleRows(hospedaje)" :columns="columns" />
          <div class="px-4 py-2 bg-muted/10 flex justify-between items-center text-sm font-semibold border-t">
            <span>Total ({{ hospedaje.cantidadNoches }} noche{{ hospedaje.cantidadNoches !== 1 ? 's' : '' }})</span>
            <span class="text-primary">${{ hospedaje.costoTotal.toFixed(2) }}</span>
          </div>
        </template>
      </UAccordion>
    </div>

    <!-- Costo Promedio -->
    <div class="bg-secondary/10 rounded-lg p-3 text-sm border border-secondary/20">
      <div class="flex justify-between items-center">
        <span class="text-muted">Costo Promedio por Persona (hospedaje)</span>
        <span class="font-semibold">${{ costoPromedioPorPersona.toFixed(2) }}</span>
      </div>
    </div>
  </div>

  <!-- Sin hospedajes -->
  <div v-else class="text-center py-8 text-muted">
    <span class="i-lucide-inbox w-8 h-8 mx-auto mb-2 block opacity-50" />
    <p class="text-sm">
      No hay hospedajes agregados aún
    </p>
  </div>
</template>

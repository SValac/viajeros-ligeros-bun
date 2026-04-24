<script setup lang="ts">
import type { TableColumn } from '@nuxt/ui';

import { h } from 'vue';

import type { QuotationAccommodation } from '~/types/quotation';

import { formatBedConfiguration } from '~/utils/hotel-room-helpers';

type Props = {
  quotationId: string;
};

const props = defineProps<Props>();

const cotizacionStore = useCotizacionStore();
const providerStore = useProviderStore();
const hotelRoomStore = useHotelRoomStore();

const hospedajes = computed(() => cotizacionStore.getHospedajesByQuotation(props.quotationId));
const totalCosto = computed(() => cotizacionStore.getTotalCostoHospedajes(props.quotationId));

function getNombreHotel(providerId: string): string {
  return providerStore.getProviderById(providerId)?.name ?? 'Desconocido';
}

// Items del accordion — uno por hospedaje
function getDesgloseHabitaciones(accommodation: QuotationAccommodation): string {
  return accommodation.details
    .map(d => `${d.quantity} hab (${d.maxOccupancy} p)`)
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
    for (const d of h.details) {
      totalPersonas += d.quantity * d.maxOccupancy;
    }
  }
  return totalPersonas > 0 ? totalCosto.value / totalPersonas : 0;
});

// ── UTable ────────────────────────────────────────────────────────────────────

type DetalleRow = {
  id: string;
  camasLabel: string;
  ocupacion: number;
  count: number;
  pricePerNight: number;
  costPerPerson: number | undefined;
  totalCost: number;
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
    accessorKey: 'count',
    header: 'Habitaciones',
    cell: ({ row }) => h('div', { class: 'text-right' }, `${row.original.count} hab`),
  },
  {
    accessorKey: 'precioPorNoche',
    header: 'Precio/noche',
    cell: ({ row }) => h('div', { class: 'text-right' }, `$${row.original.pricePerNight.toFixed(2)}`),
  },
  {
    accessorKey: 'costPerPerson',
    header: 'Precio/Persona',
    cell: ({ row }) =>
      h('div', { class: 'text-right' }, row.original.costPerPerson != null ? `$${row.original.costPerPerson.toFixed(2)}` : '—'),
  },
  {
    accessorKey: 'costoTotal',
    header: 'Subtotal',
    cell: ({ row }) => h('div', { class: 'text-right font-semibold' }, `$${row.original.totalCost.toFixed(2)}`),
  },
];

function getDetalleRows(accommodation: QuotationAccommodation): DetalleRow[] {
  return accommodation.details.map((d) => {
    const roomData = hotelRoomStore.getRoomDataByProviderId(accommodation.providerId);
    const tipoInfo = roomData?.roomTypes.find(t => t.id === d.roomTypeId) ?? null;
    return {
      id: d.id,
      camasLabel: formatBedConfiguration(tipoInfo?.beds ?? []),
      ocupacion: d.maxOccupancy,
      count: d.quantity,
      pricePerNight: d.pricePerNight,
      costPerPerson: d.costPerPerson,
      totalCost: d.pricePerNight * accommodation.nightCount * d.quantity,
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
            {{ hospedajes.reduce((s, h) => s + h.details.reduce((ss, d) => ss + d.quantity, 0), 0) }}
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
            <span>Total ({{ hospedaje.nightCount }} noche{{ hospedaje.nightCount !== 1 ? 's' : '' }})</span>
            <span class="text-primary">${{ hospedaje.totalCost.toFixed(2) }}</span>
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

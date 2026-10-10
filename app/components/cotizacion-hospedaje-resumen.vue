<script setup lang="ts">
import type { TableColumn } from '@nuxt/ui';

import { h } from 'vue';

import type { QuotationAccommodation } from '~/types/quotation';

import { roomTypeKey } from '~/composables/quotation/use-quotation-domain';
import { formatCurrency } from '~/utils/currency';
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
// Room counts come from the travel's rooms page, not from the quotation.
const roomCounts = computed(() => cotizacionStore.getRoomCountsByQuotation(props.quotationId));

function getRoomCount(accommodation: QuotationAccommodation, roomTypeId: string): number {
  return roomCounts.value.get(roomTypeKey(accommodation.providerId, roomTypeId)) ?? 0;
}

const totalHabitaciones = computed(() =>
  hospedajes.value.reduce((sum, h) => sum + h.details.reduce((s, d) => s + getRoomCount(h, d.roomTypeId), 0), 0),
);

function getNombreHotel(providerId: string): string {
  return providerStore.getProviderById(providerId)?.name ?? 'Desconocido';
}

// Items del accordion — uno por hospedaje
function getDesgloseHabitaciones(accommodation: QuotationAccommodation): string {
  return accommodation.details
    .map(d => `${getRoomCount(accommodation, d.roomTypeId)} hab (${d.maxOccupancy} p)`)
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
      totalPersonas += getRoomCount(h, d.roomTypeId) * d.maxOccupancy;
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
    cell: ({ row }) => h('div', { class: 'text-right' }, `${formatCurrency(row.original.pricePerNight)}`),
  },
  {
    accessorKey: 'costPerPerson',
    header: 'Precio/Persona',
    cell: ({ row }) =>
      h('div', { class: 'text-right' }, row.original.costPerPerson != null ? `${formatCurrency(row.original.costPerPerson)}` : '—'),
  },
  {
    accessorKey: 'costoTotal',
    header: 'Subtotal',
    cell: ({ row }) => h('div', { class: 'text-right font-semibold' }, `${formatCurrency(row.original.totalCost)}`),
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
      count: getRoomCount(accommodation, d.roomTypeId),
      pricePerNight: d.pricePerNight,
      costPerPerson: d.costPerPerson,
      totalCost: d.pricePerNight * accommodation.nightCount * getRoomCount(accommodation, d.roomTypeId),
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
            Habitaciones en el viaje
          </p>
          <p class="text-2xl font-bold">
            {{ totalHabitaciones }}
          </p>
        </div>
        <div>
          <p class="text-xs text-muted mb-1">
            Costo Total
          </p>
          <p class="text-2xl font-bold text-primary">
            {{ formatCurrency(totalCosto) }}
          </p>
        </div>
      </div>
    </div>

    <!-- Desglose por Hotel (Accordion) -->
    <div>
      <h4 class="text-sm font-semibold flex items-center gap-2 mb-2">
        <UIcon name="i-lucide-building" class="w-4 h-4" />
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
            <span class="text-primary">{{ formatCurrency(hospedaje.totalCost) }}</span>
          </div>
        </template>
      </UAccordion>
    </div>

    <!-- Costo Promedio -->
    <div class="bg-secondary/10 rounded-lg p-3 text-sm border border-secondary/20">
      <div class="flex justify-between items-center">
        <span class="text-muted">Costo Promedio por Persona (hospedaje)</span>
        <span class="font-semibold">{{ formatCurrency(costoPromedioPorPersona) }}</span>
      </div>
    </div>
  </div>

  <!-- Sin hospedajes -->
  <div v-else class="text-center py-8 text-muted">
    <UIcon name="i-lucide-inbox" class="w-8 h-8 mx-auto mb-2 block opacity-50" />
    <p class="text-sm">
      No hay hospedajes agregados aún
    </p>
  </div>
</template>

<script setup lang="ts">
import type { TableColumn } from '@nuxt/ui';

import { h } from 'vue';

import type { QuotationAccommodation } from '~/types/quotation';

import { countRoomsByType, roomTypeKey } from '~/composables/quotation/use-quotation-domain';
import { travelDetailQuery } from '~/queries/travels';
import { formatCurrency } from '~/utils/currency';
import { formatBedConfiguration } from '~/utils/hotel-room-helpers';
import { pluralize } from '~/utils/pluralize';

type Props = {
  quotationId: string;
};

const props = defineProps<Props>();

const quotationStore = useQuotationStore();
const providerStore = useProviderStore();
const hotelRoomStore = useHotelRoomStore();

const accommodations = computed(() => quotationStore.getAccommodationsByQuotation(props.quotationId));
const totalCost = computed(() => quotationStore.getAccommodationsTotalCost(props.quotationId));
// Room counts come from the travel's rooms page, not from the quotation.
const travelId = computed(() => quotationStore.quotations.find(c => c.id === props.quotationId)?.travelId);
const { data: travel } = useQuery(() => travelDetailQuery(travelId.value));
const roomCounts = computed(() => countRoomsByType(travel.value?.accommodations ?? []));

function getRoomCount(accommodation: QuotationAccommodation, roomTypeId: string): number {
  return roomCounts.value.get(roomTypeKey(accommodation.providerId, roomTypeId)) ?? 0;
}

const totalRooms = computed(() =>
  accommodations.value.reduce((sum, h) => sum + h.details.reduce((s, d) => s + getRoomCount(h, d.roomTypeId), 0), 0),
);

function getHotelName(providerId: string): string {
  return providerStore.getProviderById(providerId)?.name ?? 'Desconocido';
}

// Accordion items — one per accommodation
function getRoomBreakdown(accommodation: QuotationAccommodation): string {
  return accommodation.details
    .map(d => `${getRoomCount(accommodation, d.roomTypeId)} hab (${d.maxOccupancy} p)`)
    .join(' · ');
}

const accordionItems = computed(() =>
  accommodations.value.map(h => ({
    label: `${getHotelName(h.providerId)} - ${getRoomBreakdown(h)}`,
    value: h.id,
    slot: `hotel-${h.id}`,
  })),
);

const defaultValue = computed(() => accommodations.value.map(h => h.id));

const averageCostPerPerson = computed(() => {
  let totalPeople = 0;
  for (const h of accommodations.value) {
    for (const d of h.details) {
      totalPeople += getRoomCount(h, d.roomTypeId) * d.maxOccupancy;
    }
  }
  return totalPeople > 0 ? totalCost.value / totalPeople : 0;
});

// ── UTable ────────────────────────────────────────────────────────────────────

type DetailRow = {
  id: string;
  bedsLabel: string;
  occupancy: number;
  count: number;
  pricePerNight: number;
  costPerPerson: number | undefined;
  totalCost: number;
};

const columns: TableColumn<DetailRow>[] = [
  {
    id: 'type',
    header: 'Tipo',
    cell: ({ row }) =>
      h('div', [
        h('p', { class: 'font-medium' }, row.original.bedsLabel || '—'),
        h('p', { class: 'text-xs text-muted' }, pluralize(row.original.occupancy, 'persona')),
      ]),
  },
  {
    accessorKey: 'count',
    header: 'Habitaciones',
    cell: ({ row }) => h('div', { class: 'text-right' }, `${row.original.count} hab`),
  },
  {
    accessorKey: 'pricePerNight',
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
    accessorKey: 'totalCost',
    header: 'Subtotal',
    cell: ({ row }) => h('div', { class: 'text-right font-semibold' }, `${formatCurrency(row.original.totalCost)}`),
  },
];

function getDetailRows(accommodation: QuotationAccommodation): DetailRow[] {
  return accommodation.details.map((d) => {
    const roomData = hotelRoomStore.getRoomDataByProviderId(accommodation.providerId);
    const typeInfo = roomData?.roomTypes.find(t => t.id === d.roomTypeId) ?? null;
    return {
      id: d.id,
      bedsLabel: formatBedConfiguration(typeInfo?.beds ?? []),
      occupancy: d.maxOccupancy,
      count: getRoomCount(accommodation, d.roomTypeId),
      pricePerNight: d.pricePerNight,
      costPerPerson: d.costPerPerson,
      totalCost: d.pricePerNight * accommodation.nightCount * getRoomCount(accommodation, d.roomTypeId),
    };
  });
}
</script>

<template>
  <!-- With no accommodations it shows nothing: the table above already has the empty state -->
  <div v-if="accommodations.length > 0" class="space-y-4">
    <!-- Overall Summary -->
    <div class="bg-linear-to-br from-primary/10 to-primary/5 rounded-lg p-4 border border-primary/20">
      <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div>
          <p class="text-xs text-muted mb-1">
            Hoteles
          </p>
          <p class="text-2xl font-bold">
            {{ accommodations.length }}
          </p>
        </div>
        <div>
          <p class="text-xs text-muted mb-1">
            Habitaciones en el viaje
          </p>
          <p class="text-2xl font-bold">
            {{ totalRooms }}
          </p>
        </div>
        <div>
          <p class="text-xs text-muted mb-1">
            Costo Total
          </p>
          <p class="text-2xl font-bold text-primary">
            {{ formatCurrency(totalCost) }}
          </p>
        </div>
      </div>
    </div>

    <!-- Breakdown by Hotel (Accordion) -->
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
          v-for="accommodation in accommodations"
          :key="accommodation.id"
          #[`hotel-${accommodation.id}`]
        >
          <UTable :data="getDetailRows(accommodation)" :columns="columns" />
          <div class="px-4 py-2 bg-muted/10 flex justify-between items-center text-sm font-semibold border-t">
            <span>Total ({{ pluralize(accommodation.nightCount, 'noche') }})</span>
            <span class="text-primary">{{ formatCurrency(accommodation.totalCost) }}</span>
          </div>
        </template>
      </UAccordion>
    </div>

    <!-- Average Cost -->
    <div class="bg-secondary/10 rounded-lg p-3 text-sm border border-secondary/20">
      <div class="flex justify-between items-center">
        <span class="text-muted">Costo Promedio por Persona (hospedaje)</span>
        <span class="font-semibold">{{ formatCurrency(averageCostPerPerson) }}</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { TableColumn } from '@nuxt/ui';

import { h } from 'vue';

import type { QuotationStatus } from '~/types/quotation';

definePageMeta({
  name: 'quotations-index',
});

const router = useRouter();
const travelStore = useTravelsStore();
const cotizacionStore = useCotizacionStore();

const quotationRows = computed(() =>
  travelStore.allTravels.map(travel => ({
    travel,
    quotation: cotizacionStore.getCotizacionByTravel(travel.id),
  })),
);

const stats = computed(() => {
  const rows = quotationRows.value;
  return {
    totalTravels: rows.length,
    withQuotation: rows.filter(r => r.quotation).length,
    draft: rows.filter(r => r.quotation?.status === 'draft').length,
    confirmed: rows.filter(r => r.quotation?.status === 'confirmed').length,
  };
});

function formatCurrency(value: number) {
  return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(value);
}

function getQuotationStatusColor(status: QuotationStatus): 'warning' | 'success' {
  return status === 'confirmed' ? 'success' : 'warning';
}

function getQuotationStatusLabel(status: QuotationStatus): string {
  return status === 'confirmed' ? 'Confirmada' : 'Borrador';
}

function goToQuotation(travelId: string) {
  router.push({ name: 'quotation-detail', params: { id: travelId } });
}

function goToTravelsDashboard() {
  router.push({ name: 'travels-dashboard' });
}

type QuotationRow = (typeof quotationRows.value)[number];

const columns: TableColumn<QuotationRow>[] = [
  {
    id: 'label',
    header: 'Viaje',
    cell: ({ row }) => h(resolveComponent('NuxtLink'), {
      to: { name: 'quotation-detail', params: { id: row.original.travel.id } },
      class: 'flex items-center gap-2 hover:text-primary transition-colors group',
    }, () => [
      h('span', { class: 'i-lucide-tag w-4 h-4 text-muted group-hover:text-primary' }),
      h('span', { class: 'font-medium' }, row.original.travel.label),
    ]),
  },
  {
    id: 'dates',
    header: 'Fechas',
    cell: ({ row }) => {
      const { startDate, endDate } = row.original.travel;
      return h('span', { class: 'text-sm text-muted' }, `${formatDate(startDate)} - ${formatDate(endDate)}`);
    },
  },
  {
    id: 'travelStatus',
    header: 'Estado del viaje',
    cell: ({ row }) => {
      const { status } = row.original.travel;
      return h(resolveComponent('UBadge'), {
        color: getTravelStatusColor(status),
        variant: 'subtle',
      }, () => getTravelStatusLabel(status));
    },
  },
  {
    id: 'status',
    header: 'Cotización',
    cell: ({ row }) => {
      const quotation = row.original.quotation;
      if (!quotation)
        return h('span', { class: 'text-xs text-muted' }, 'Sin cotización');
      return h(resolveComponent('UBadge'), {
        color: getQuotationStatusColor(quotation.status),
        variant: 'subtle',
      }, () => getQuotationStatusLabel(quotation.status));
    },
  },
  {
    id: 'seatPrice',
    header: 'Precio por asiento',
    cell: ({ row }) => {
      const quotation = row.original.quotation;
      return h('span', { class: 'text-sm' }, quotation ? formatCurrency(quotation.seatPrice) : '—');
    },
  },
  {
    id: 'actions',
    header: 'Acciones',
    cell: ({ row }) => {
      const hasQuotation = Boolean(row.original.quotation);
      return h(
        resolveComponent('UButton'),
        {
          size: 'sm',
          variant: 'outline',
          color: hasQuotation ? 'primary' : 'neutral',
          icon: hasQuotation ? 'i-lucide-file-check' : 'i-lucide-file-plus',
          onClick: () => goToQuotation(row.original.travel.id),
        },
        () => hasQuotation ? 'Ver cotización' : 'Crear cotización',
      );
    },
  },
];
</script>

<template>
  <div class="space-y-6">
    <!-- Header -->
    <div>
      <h1 class="text-3xl font-bold">
        Cotizaciones
      </h1>
      <p class="text-muted mt-1">
        Costos de proveedores, hospedaje, autobuses y precios al público por viaje. Uso interno, no se publica en la web.
      </p>
    </div>

    <!-- Stats cards -->
    <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
      <UCard>
        <div class="flex items-center justify-between">
          <div>
            <p class="text-sm text-muted">
              Viajes
            </p>
            <p class="text-2xl font-bold mt-1">
              {{ stats.totalTravels }}
            </p>
          </div>
          <UIcon name="i-lucide-map" class="w-10 h-10 text-muted" />
        </div>
      </UCard>

      <UCard>
        <div class="flex items-center justify-between">
          <div>
            <p class="text-sm text-muted">
              Con cotización
            </p>
            <p class="text-2xl font-bold text-primary mt-1">
              {{ stats.withQuotation }}
            </p>
          </div>
          <UIcon name="i-lucide-file-text" class="w-10 h-10 text-primary opacity-60" />
        </div>
      </UCard>

      <UCard>
        <div class="flex items-center justify-between">
          <div>
            <p class="text-sm text-muted">
              Borradores
            </p>
            <p class="text-2xl font-bold text-warning mt-1">
              {{ stats.draft }}
            </p>
          </div>
          <UIcon name="i-lucide-file-pen" class="w-10 h-10 text-warning opacity-60" />
        </div>
      </UCard>

      <UCard>
        <div class="flex items-center justify-between">
          <div>
            <p class="text-sm text-muted">
              Confirmadas
            </p>
            <p class="text-2xl font-bold text-success mt-1">
              {{ stats.confirmed }}
            </p>
          </div>
          <UIcon name="i-lucide-file-check" class="w-10 h-10 text-success opacity-60" />
        </div>
      </UCard>
    </div>

    <!-- Quotations table -->
    <UCard>
      <div v-if="quotationRows.length === 0" class="text-center py-12">
        <UIcon name="i-lucide-inbox" class="w-16 h-16 text-muted mx-auto mb-4" />
        <h3 class="text-lg font-medium mb-2">
          No hay viajes registrados
        </h3>
        <p class="text-muted mb-4">
          Primero registra un viaje para crear su cotización
        </p>
        <UButton icon="i-lucide-map" @click="goToTravelsDashboard">
          Ir a Viajes
        </UButton>
      </div>

      <UTable
        v-else
        :columns="columns"
        :data="quotationRows"
      />
    </UCard>
  </div>
</template>

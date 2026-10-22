<script setup lang="ts">
import type { TableColumn } from '@nuxt/ui';

import { h } from 'vue';

import type { TravelSummary } from '~/types/travel';

import { useQueryLoadState } from '~/queries/load-state';
import { travelListQuery } from '~/queries/travels';
import { formatDateRange } from '~/utils/format-date';
import { getQuotationStatusColor, getQuotationStatusLabel } from '~/utils/quotation-labels';

definePageMeta({
  name: 'quotations-index',
});

const router = useRouter();

const travelsQuery = useQuery(() => travelListQuery({}));
const { data, refetch } = travelsQuery;
const travelsLoad = useQueryLoadState(travelsQuery);

const travels = computed(() => data.value?.items ?? []);

const stats = computed(() => {
  const rows = travels.value;
  return {
    totalTravels: rows.length,
    withQuotation: rows.filter(r => r.quotation).length,
    draft: rows.filter(r => r.quotation?.status === 'draft').length,
    confirmed: rows.filter(r => r.quotation?.status === 'confirmed').length,
  };
});

function goToQuotation(travelId: string) {
  router.push({ name: 'quotation-detail', params: { id: travelId } });
}

function goToTravelsDashboard() {
  router.push({ name: 'travels-dashboard' });
}

const columns: TableColumn<TravelSummary>[] = [
  {
    id: 'label',
    header: 'Viaje',
    cell: ({ row }) => h(resolveComponent('NuxtLink'), {
      to: { name: 'quotation-detail', params: { id: row.original.id } },
      class: 'flex items-center gap-2 hover:text-primary transition-colors group',
    }, () => [
      h(resolveComponent('UIcon'), { name: 'i-lucide-tag', class: 'w-4 h-4 text-muted group-hover:text-primary' }),
      h('span', { class: 'font-medium' }, row.original.label),
    ]),
  },
  {
    id: 'dates',
    header: 'Fechas',
    cell: ({ row }) => {
      const { startDate, endDate } = row.original;
      return h('span', { class: 'text-sm text-muted' }, formatDateRange(startDate, endDate, 'long'));
    },
  },
  {
    id: 'travelStatus',
    header: 'Estado del viaje',
    cell: ({ row }) => {
      const { status } = row.original;
      return h(resolveComponent('TravelStatusBadge'), { status });
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
          onClick: () => goToQuotation(row.original.id),
        },
        () => hasQuotation ? 'Ver cotización' : 'Crear cotización',
      );
    },
  },
];
</script>

<template>
  <LoadState
    v-bind="travelsLoad"
    label="los viajes"
    fill
    @retry="refetch()"
  >
    <div class="space-y-6">
      <PageHeader
        title="Cotizaciones"
        description="Costos de proveedores, hospedaje, autobuses y precios al público por viaje. Uso interno, no se publica en la web."
      />

      <!-- Stats cards -->
      <div class="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard
          label="Viajes"
          icon="i-lucide-map"
          :value="String(stats.totalTravels)"
        />
        <StatCard
          label="Con cotización"
          icon="i-lucide-file-text"
          :value="String(stats.withQuotation)"
          value-class="text-info"
        />
        <StatCard
          label="Borradores"
          icon="i-lucide-file-pen"
          :value="String(stats.draft)"
          value-class="text-warning"
        />
        <StatCard
          label="Confirmadas"
          icon="i-lucide-file-check"
          :value="String(stats.confirmed)"
          value-class="text-success"
        />
      </div>

      <!-- Quotations table -->
      <UCard>
        <EmptyState
          v-if="travels.length === 0"
          section="travels"
          :actions="[{ label: 'Ir a Viajes', icon: 'i-lucide-map', onClick: goToTravelsDashboard }]"
        />

        <UTable
          v-else
          :columns="columns"
          :data="travels"
        />
      </UCard>
    </div>
  </LoadState>
</template>

<script setup lang="ts">
import type { TableColumn } from '@nuxt/ui';
import type { ExpandedStateList } from '@tanstack/vue-table';

import { h } from 'vue';

import type { PaymentFormData, PaymentStatus, TravelerAccountConfig } from '~/types/payment';
import type { Traveler, TravelerWithChildren } from '~/types/traveler';

definePageMeta({
  name: 'payments-travel',
});

const route = useRoute();
const router = useRouter();
const toast = useToast();
const paymentStore = usePaymentStore();
const travelStore = useTravelsStore();
const travelerStore = useTravelerStore();

const cotizacionStore = useCotizacionStore();

const travelId = computed(() => route.params.id as string);
const travel = computed(() => travelStore.getTravelById(travelId.value));
const cotizacion = computed(() => cotizacionStore.getCotizacionByTravel(travelId.value));
const preciosPublicos = computed(() =>
  cotizacion.value
    ? cotizacionStore.getPreciosPublicosByQuotation(cotizacion.value.id)
    : [],
);

watchEffect(() => {
  if (!travel.value && travelId.value) {
    router.push({ name: 'payments-index' });
  }
});

const enrolledTravelers = computed(() =>
  travelerStore.getTravelersByTravel(travelId.value),
);

const travelPrice = computed(() => travel.value?.price ?? 0);

const expanded = ref<ExpandedStateList>({});

// Status filter
const statusFilter = ref<PaymentStatus | 'all'>('all');
const statusFilterOptions = [
  { label: 'Todos', value: 'all' },
  { label: 'Pendiente', value: 'pending' },
  { label: 'Abono parcial', value: 'partial' },
  { label: 'Pagado', value: 'paid' },
];

const groupedFilteredTravelers = computed<TravelerWithChildren[]>(() => {
  // Group ALL enrolled travelers by representativeId to preserve the tree structure.
  // Filtering by status applies only to which representative rows are shown at root level.
  const all = enrolledTravelers.value;
  const grouped = Object.groupBy(all, t => t.representativeId ?? '');
  const acompañantesIds = new Set(
    all.filter(t => t.representativeId).map(t => t.id),
  );

  const result: TravelerWithChildren[] = [];

  for (const t of all) {
    // Acompañantes are embedded as children — skip them as root rows.
    if (acompañantesIds.has(t.id))
      continue;

    // Apply status filter at the representative level.
    if (statusFilter.value !== 'all') {
      const summary = paymentStore.getTravelerPaymentSummary(t.id, travelId.value, travelPrice.value);
      if (summary.status !== statusFilter.value)
        continue;
    }

    const children = grouped[t.id];
    result.push({
      ...t,
      children: children && children.length > 0 ? children : undefined,
    });
  }

  return result;
});

watchEffect(() => {
  const newExpanded: ExpandedStateList = {};
  for (const row of groupedFilteredTravelers.value) {
    if (row.children && row.children.length > 0) {
      newExpanded[row.id] = true;
    }
  }
  expanded.value = newExpanded;
});

// Caja del viaje
const cashSummary = computed(() => {
  const summaries = enrolledTravelers.value
    .filter((t: Traveler) => !!paymentStore.getAccountConfig(t.id, travelId.value)?.publicPriceId)
    .map((t: Traveler) =>
      paymentStore.getTravelerPaymentSummary(t.id, travelId.value, travelPrice.value),
    );
  const totalExpected = summaries.reduce((sum: number, s) => sum + s.finalCost, 0);
  const totalCollected = summaries.reduce((sum: number, s) => sum + s.totalPaid, 0);
  return { totalExpected, totalCollected, balance: totalExpected - totalCollected };
});

// Modals
const isPaymentModalOpen = shallowRef(false);
const isConfigModalOpen = shallowRef(false);
const selectedTraveler = shallowRef<Traveler | null>(null);

function openPaymentModal(traveler: Traveler) {
  selectedTraveler.value = traveler;
  isPaymentModalOpen.value = true;
}

function openConfigModal(traveler: Traveler) {
  selectedTraveler.value = traveler;
  isConfigModalOpen.value = true;
}

function closeModals() {
  isPaymentModalOpen.value = false;
  isConfigModalOpen.value = false;
  selectedTraveler.value = null;
}

const selectedSummary = computed(() => {
  if (!selectedTraveler.value)
    return null;
  return paymentStore.getTravelerPaymentSummary(
    selectedTraveler.value.id,
    travelId.value,
    travelPrice.value,
  );
});

const selectedConfig = computed(() => {
  if (!selectedTraveler.value)
    return undefined;
  return paymentStore.getAccountConfig(selectedTraveler.value.id, travelId.value);
});

async function handlePaymentSubmit(data: PaymentFormData) {
  const result = await paymentStore.addPayment(data);
  if ('error' in result) {
    toast.add({ title: 'Error', description: result.error, color: 'error' });
    return;
  }
  toast.add({ title: 'Pago registrado', description: `Se registró un abono de ${formatCurrency(data.amount)}`, color: 'success' });
  closeModals();
}

async function handleConfigSubmit(config: TravelerAccountConfig) {
  await paymentStore.setAccountConfig(config);
  toast.add({ title: 'Configuración guardada', color: 'success' });
  closeModals();
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(value);
}

type BadgeColor = 'warning' | 'info' | 'success' | 'neutral';
const statusConfig: Record<string, { color: BadgeColor; label: string }> = {
  pending: { color: 'warning', label: 'Pendiente' },
  partial: { color: 'info', label: 'Parcial' },
  paid: { color: 'success', label: 'Pagado' },
};

const columns: TableColumn<TravelerWithChildren>[] = [
  {
    id: 'nombre',
    header: 'Nombre',
    cell: ({ row }) => {
      const depth = row.depth;
      const traveler = row.original;
      const name = `${traveler.firstName} ${traveler.lastName}`;
      const link = h(resolveComponent('NuxtLink'), {
        to: { name: 'payments-traveler', params: { id: traveler.id } },
        class: 'font-medium hover:text-primary transition-colors',
      }, () => name);

      if (row.getCanExpand()) {
        return h('div', { class: 'flex items-center gap-1' }, [
          h('button', {
            onClick: row.getToggleExpandedHandler(),
            class: 'text-muted hover:text-default',
          }, [
            h(resolveComponent('UIcon'), {
              name: row.getIsExpanded() ? 'i-lucide-chevron-down' : 'i-lucide-chevron-right',
              class: 'w-4 h-4',
            }),
          ]),
          link,
        ]);
      }

      return h('div', {
        style: `padding-left: ${depth * 1.5 + 0.75}rem`,
      }, [link]);
    },
  },
  {
    id: 'travelerType',
    header: 'Tipo',
    cell: ({ row }) => {
      const config = paymentStore.getAccountConfig(row.original.id, travelId.value);
      const label = config?.travelerType === 'child' ? 'Niño' : 'Adulto';
      return h(resolveComponent('UBadge'), { color: 'neutral', variant: 'subtle' }, () => label);
    },
  },
  {
    id: 'tipo',
    header: 'Precio',
    cell: ({ row }) => {
      const config = paymentStore.getAccountConfig(row.original.id, travelId.value);
      if (config?.publicPriceId) {
        const precio = preciosPublicos.value.find(p => p.id === config.publicPriceId);
        if (precio) {
          return h(resolveComponent('UBadge'), { color: 'neutral', variant: 'subtle' }, () => precio.priceType);
        }
      }
      const label = config?.travelerType === 'child' ? 'Niño' : 'Adulto';
      return h(resolveComponent('UBadge'), { color: 'neutral', variant: 'subtle' }, () => label);
    },
  },
  {
    id: 'costoFinal',
    header: 'Costo final',
    cell: ({ row }) => {
      const config = paymentStore.getAccountConfig(row.original.id, travelId.value);
      if (!config?.publicPriceId)
        return h('span', { class: 'text-sm text-muted' }, '—');
      const s = paymentStore.getTravelerPaymentSummary(row.original.id, travelId.value, travelPrice.value);
      return h('span', { class: 'text-sm' }, formatCurrency(s.finalCost));
    },
  },
  {
    id: 'descuento',
    header: 'Descuento',
    cell: ({ row }) => {
      const config = paymentStore.getAccountConfig(row.original.id, travelId.value);
      if (!config?.publicPriceId)
        return h('span', { class: 'text-sm text-muted' }, '—');
      const s = paymentStore.getTravelerPaymentSummary(row.original.id, travelId.value, travelPrice.value);
      if (s.totalDiscountAmount <= 0)
        return h('span', { class: 'text-sm text-muted' }, '—');
      return h('span', { class: 'text-sm text-success' }, formatCurrency(s.totalDiscountAmount));
    },
  },
  {
    id: 'surcharge',
    header: 'Incremento',
    cell: ({ row }) => {
      const config = paymentStore.getAccountConfig(row.original.id, travelId.value);
      if (!config?.publicPriceId)
        return h('span', { class: 'text-sm text-muted' }, '—');
      const s = paymentStore.getTravelerPaymentSummary(row.original.id, travelId.value, travelPrice.value);
      if (s.totalSurchargeAmount <= 0)
        return h('span', { class: 'text-sm text-muted' }, '—');
      return h('span', { class: 'text-sm text-warning' }, formatCurrency(s.totalSurchargeAmount));
    },
  },
  {
    id: 'totalPaid',
    header: 'Abonado',
    cell: ({ row }) => {
      const config = paymentStore.getAccountConfig(row.original.id, travelId.value);
      if (!config?.publicPriceId)
        return h('span', { class: 'text-sm text-muted' }, '—');
      const s = paymentStore.getTravelerPaymentSummary(row.original.id, travelId.value, travelPrice.value);
      return h('span', { class: 'text-sm text-success' }, formatCurrency(s.totalPaid));
    },
  },
  {
    id: 'balance',
    header: 'Saldo pendiente',
    cell: ({ row }) => {
      const config = paymentStore.getAccountConfig(row.original.id, travelId.value);
      if (!config?.publicPriceId)
        return h('span', { class: 'text-sm text-muted' }, '—');
      const s = paymentStore.getTravelerPaymentSummary(row.original.id, travelId.value, travelPrice.value);
      return h('span', { class: s.balance > 0 ? 'text-sm text-error' : 'text-sm text-success' }, formatCurrency(s.balance));
    },
  },
  {
    id: 'status',
    header: 'Estado',
    cell: ({ row }) => {
      const config = paymentStore.getAccountConfig(row.original.id, travelId.value);
      if (!config?.publicPriceId)
        return h(resolveComponent('UBadge'), { color: 'neutral', variant: 'subtle' }, () => 'Sin configurar');
      const s = paymentStore.getTravelerPaymentSummary(row.original.id, travelId.value, travelPrice.value);
      const cfg = statusConfig[s.status] ?? { color: 'neutral', label: s.status };
      return h(resolveComponent('UBadge'), { color: cfg.color, variant: 'subtle' }, () => cfg.label);
    },
  },
  {
    id: 'actions',
    header: 'Acciones',
    cell: ({ row }) => {
      return h(
        resolveComponent('UDropdownMenu'),
        {
          items: [
            [
              {
                label: 'Registrar abono',
                icon: 'i-lucide-plus-circle',
                disabled: !paymentStore.getAccountConfig(row.original.id, travelId.value)?.publicPriceId,
                onSelect: () => openPaymentModal(row.original),
              },
              {
                label: 'Ver historial',
                icon: 'i-lucide-history',
                onSelect: () => router.push({ name: 'payments-traveler', params: { id: row.original.id } }),
              },
            ],
            [
              {
                label: 'Configurar cuenta',
                icon: 'i-lucide-settings',
                onSelect: () => openConfigModal(row.original),
              },
            ],
          ],
        },
        () => h(resolveComponent('UButton'), { color: 'neutral', variant: 'ghost', icon: 'i-lucide-more-vertical' }),
      );
    },
  },
];

onMounted(async () => {
  await paymentStore.fetchByTravel(travelId.value);
});
</script>

<template>
  <div v-if="travel" class="space-y-6">
    <!-- Header -->
    <div class="flex items-center justify-between">
      <div>
        <div class="flex items-center gap-2 mb-1">
          <UButton
            icon="i-lucide-arrow-left"
            variant="ghost"
            color="neutral"
            size="sm"
            @click="router.push({ name: 'payments-index' })"
          />
          <h1 class="text-3xl font-bold">
            Pagos — {{ travel.destination }}
          </h1>
        </div>
        <p class="text-muted ml-9">
          Gestión de pagos de viajeros inscritos
        </p>
      </div>
    </div>

    <!-- Caja del viaje -->
    <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
      <UCard>
        <div class="flex justify-between items-center">
          <div>
            <p class="text-sm text-muted">
              Total esperado
            </p>
            <p class="text-xl font-bold mt-1">
              {{ formatCurrency(cashSummary.totalExpected) }}
            </p>
          </div>
          <UIcon name="i-lucide-wallet" class="w-9 h-9 text-muted" />
        </div>
      </UCard>
      <UCard>
        <div class="flex justify-between items-center">
          <div>
            <p class="text-sm text-muted">
              Total recaudado
            </p>
            <p class="text-xl font-bold text-success mt-1">
              {{ formatCurrency(cashSummary.totalCollected) }}
            </p>
          </div>
          <UIcon name="i-lucide-trending-up" class="w-9 h-9 text-success opacity-60" />
        </div>
      </UCard>
      <UCard>
        <div class="flex justify-between items-center">
          <div>
            <p class="text-sm text-muted">
              Saldo por cobrar
            </p>
            <p class="text-xl font-bold text-error mt-1">
              {{ formatCurrency(cashSummary.balance) }}
            </p>
          </div>
          <UIcon name="i-lucide-clock" class="w-9 h-9 text-error opacity-60" />
        </div>
      </UCard>
    </div>

    <!-- Filters -->
    <div class="flex flex-wrap gap-3">
      <USelect
        v-model="statusFilter"
        :items="statusFilterOptions"
        value-key="value"
        label-key="label"
        class="w-44"
      />
    </div>

    <!-- Travelers table -->
    <UCard>
      <div v-if="groupedFilteredTravelers.length === 0" class="text-center py-12">
        <UIcon name="i-lucide-users" class="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
        <template v-if="enrolledTravelers.length === 0">
          <h3 class="text-lg font-medium mb-2">
            No hay viajeros inscritos
          </h3>
          <p class="text-muted">
            Registra viajeros en este viaje para gestionar sus pagos
          </p>
        </template>
        <template v-else>
          <h3 class="text-lg font-medium mb-2">
            Sin resultados para los filtros aplicados
          </h3>
          <UButton icon="i-lucide-filter-x" @click="statusFilter = 'all'">
            Limpiar filtros
          </UButton>
        </template>
      </div>
      <UTable
        v-else
        v-model:expanded="expanded"
        :columns="columns"
        :data="groupedFilteredTravelers"
        :get-row-id="(row) => row.id"
        :get-sub-rows="(row) => row.children"
        :ui="{
          base: 'border-separate border-spacing-0',
          tbody: '[&>tr]:last:[&>td]:border-b-0',
          tr: 'group',
          td: 'empty:p-0 group-has-[td:not(:empty)]:border-b border-default',
        }"
      />
    </UCard>

    <!-- Payment Modal -->
    <UModal
      v-model:open="isPaymentModalOpen"
      title="Registrar abono"
      :description="selectedTraveler ? `${selectedTraveler.firstName} ${selectedTraveler.lastName}` : ''"
    >
      <template #body>
        <PaymentForm
          v-if="selectedTraveler && selectedConfig?.publicPriceId && selectedSummary"
          :traveler-id="selectedTraveler.id"
          :travel-id="travelId"
          :max-amount="selectedSummary.balance"
          @submit="handlePaymentSubmit"
          @cancel="closeModals"
        />
        <div v-else class="flex flex-col gap-3">
          <UAlert
            color="warning"
            variant="soft"
            icon="i-lucide-triangle-alert"
            title="Cuenta sin configurar"
            description="Configura primero la cuenta del viajero para poder registrar pagos."
          />
          <UButton
            color="warning"
            variant="soft"
            @click="() => { const t = selectedTraveler; closeModals(); if (t) openConfigModal(t); }"
          >
            Configurar cuenta
          </UButton>
        </div>
      </template>
    </UModal>

    <!-- Account Config Modal -->
    <UModal
      v-model:open="isConfigModalOpen"
      title="Configurar cuenta"
      :description="selectedTraveler ? `${selectedTraveler.firstName} ${selectedTraveler.lastName}` : ''"
    >
      <template #body>
        <PaymentAccountConfigForm
          v-if="selectedTraveler"
          :traveler-id="selectedTraveler.id"
          :travel-id="travelId"
          :travel-base-price="travelPrice"
          :precios-publicos="preciosPublicos"
          :config="selectedConfig"
          @submit="handleConfigSubmit"
          @cancel="closeModals"
        />
      </template>
    </UModal>
  </div>
</template>

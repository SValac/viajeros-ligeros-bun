<script setup lang="ts">
import type { TableColumn } from '@nuxt/ui';

import { h } from 'vue';

import type { PaymentFormData, PaymentStatus, TravelerAccountConfig } from '~/types/payment';
import type { Traveler } from '~/types/traveler';

definePageMeta({
  name: 'payments-travel',
});

const route = useRoute();
const router = useRouter();
const toast = useToast();
const paymentStore = usePaymentStore();
const travelStore = useTravelsStore();
const travelerStore = useTravelerStore();

const travelId = computed(() => route.params.id as string);
const travel = computed(() => travelStore.getTravelById(travelId.value));

watchEffect(() => {
  if (!travel.value && travelId.value) {
    router.push({ name: 'payments-index' });
  }
});

const enrolledTravelers = computed(() =>
  travelerStore.getTravelersByTravel(travelId.value),
);

const travelPrice = computed(() => travel.value?.precio ?? 0);

// Status filter
const statusFilter = ref<PaymentStatus | 'all'>('all');
const statusFilterOptions = [
  { label: 'Todos', value: 'all' },
  { label: 'Pendiente', value: 'pending' },
  { label: 'Abono parcial', value: 'partial' },
  { label: 'Pagado', value: 'paid' },
];

const filteredTravelers = computed(() => {
  return enrolledTravelers.value.filter((t) => {
    if (statusFilter.value !== 'all') {
      const summary = paymentStore.getTravelerPaymentSummary(t.id, travelId.value, travelPrice.value);
      if (summary.status !== statusFilter.value)
        return false;
    }
    return true;
  });
});

// Caja del viaje
const cashSummary = computed(() => {
  const summaries = enrolledTravelers.value.map((t: Traveler) =>
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

function handlePaymentSubmit(data: PaymentFormData) {
  const result = paymentStore.addPayment(data);
  if ('error' in result) {
    toast.add({ title: 'Error', description: result.error, color: 'error' });
    return;
  }
  toast.add({ title: 'Pago registrado', description: `Se registró un abono de ${formatCurrency(data.amount)}`, color: 'success' });
  closeModals();
}

function handleConfigSubmit(config: TravelerAccountConfig) {
  paymentStore.setAccountConfig(config);
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

const columns: TableColumn<Traveler>[] = [
  {
    id: 'nombre',
    header: 'Nombre',
    cell: ({ row }) => {
      const t = row.original;
      return h('div', { class: 'font-medium' }, `${t.nombre} ${t.apellido}`);
    },
  },
  {
    id: 'tipo',
    header: 'Tipo',
    cell: ({ row }) => {
      const config = paymentStore.getAccountConfig(row.original.id, travelId.value);
      const label = config?.travelerType === 'child' ? 'Niño' : 'Adulto';
      return h(resolveComponent('UBadge'), { color: 'neutral', variant: 'subtle' }, () => label);
    },
  },
  {
    id: 'costoFinal',
    header: 'Costo final',
    cell: ({ row }) => {
      const s = paymentStore.getTravelerPaymentSummary(row.original.id, travelId.value, travelPrice.value);
      return h('span', { class: 'text-sm' }, formatCurrency(s.finalCost));
    },
  },
  {
    id: 'descuento',
    header: 'Descuento',
    cell: ({ row }) => {
      const s = paymentStore.getTravelerPaymentSummary(row.original.id, travelId.value, travelPrice.value);
      if (s.discount <= 0)
        return h('span', { class: 'text-sm text-muted' }, '—');
      const discountAmount = s.discountType === 'percentage'
        ? s.appliedPrice * s.discount / 100
        : s.discount;
      return h('span', { class: 'text-sm text-success' }, formatCurrency(discountAmount));
    },
  },
  {
    id: 'totalPaid',
    header: 'Abonado',
    cell: ({ row }) => {
      const s = paymentStore.getTravelerPaymentSummary(row.original.id, travelId.value, travelPrice.value);
      return h('span', { class: 'text-sm text-success' }, formatCurrency(s.totalPaid));
    },
  },
  {
    id: 'balance',
    header: 'Saldo pendiente',
    cell: ({ row }) => {
      const s = paymentStore.getTravelerPaymentSummary(row.original.id, travelId.value, travelPrice.value);
      return h('span', { class: s.balance > 0 ? 'text-sm text-error' : 'text-sm text-success' }, formatCurrency(s.balance));
    },
  },
  {
    id: 'status',
    header: 'Estado',
    cell: ({ row }) => {
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

onMounted(() => {
  travelStore.loadMockData();
  travelerStore.loadMockData();
  paymentStore.loadMockData();
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
            Pagos — {{ travel.destino }}
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
      <div v-if="filteredTravelers.length === 0" class="text-center py-12">
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
        :columns="columns"
        :data="filteredTravelers"
      />
    </UCard>

    <!-- Payment Modal -->
    <UModal
      v-model:open="isPaymentModalOpen"
      title="Registrar abono"
      :description="selectedTraveler ? `${selectedTraveler.nombre} ${selectedTraveler.apellido}` : ''"
    >
      <template #body>
        <PaymentForm
          v-if="selectedTraveler && selectedSummary"
          :traveler-id="selectedTraveler.id"
          :travel-id="travelId"
          :max-amount="selectedSummary.balance"
          @submit="handlePaymentSubmit"
          @cancel="closeModals"
        />
        <div v-else class="p-4 text-center text-muted">
          <p>Configura primero la cuenta del viajero para registrar pagos.</p>
          <UButton
            class="mt-3"
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
      :description="selectedTraveler ? `${selectedTraveler.nombre} ${selectedTraveler.apellido}` : ''"
    >
      <template #body>
        <PaymentAccountConfigForm
          v-if="selectedTraveler"
          :traveler-id="selectedTraveler.id"
          :travel-id="travelId"
          :travel-base-price="travelPrice"
          :config="selectedConfig"
          @submit="handleConfigSubmit"
          @cancel="closeModals"
        />
      </template>
    </UModal>
  </div>
</template>

<script setup lang="ts">
import type { TableColumn } from '@nuxt/ui';

import { h } from 'vue';

import type { Payment, PaymentFormData, TravelerAccountConfig } from '~/types/payment';

definePageMeta({
  name: 'payments-traveler',
});

const route = useRoute();
const router = useRouter();
const toast = useToast();
const paymentStore = usePaymentStore();
const travelStore = useTravelsStore();
const travelerStore = useTravelerStore();
const cotizacionStore = useCotizacionStore();

const travelerId = computed(() => route.params.id as string);
const traveler = computed(() => travelerStore.getTravelerById(travelerId.value));

watchEffect(() => {
  if (!traveler.value && travelerId.value) {
    router.push({ name: 'payments-index' });
  }
});

const travelerName = computed(() =>
  traveler.value ? `${traveler.value.firstName} ${traveler.value.lastName}` : '',
);

const loadedCotizacionTravelIds = shallowRef(new Set<string>());

async function ensureCotizacionesLoaded(travelIds: string[]) {
  const pending = travelIds.filter((id) => {
    return !!id && !loadedCotizacionTravelIds.value.has(id);
  });

  if (pending.length === 0)
    return;

  await Promise.all(pending.map(async (id) => {
    await cotizacionStore.fetchByTravel(id);
    loadedCotizacionTravelIds.value.add(id);
  }));
}

// All travel IDs this traveler has account configs or payments for
const travelerTravelIds = computed((): string[] => {
  const paymentTravelIds = paymentStore.getPaymentsByTraveler(travelerId.value).map((p: Payment) => p.travelId);
  const configuredTravelIds = paymentStore.accountConfigs
    .filter((c: { travelerId: string; travelId: string }) => c.travelerId === travelerId.value)
    .map((c: { travelerId: string; travelId: string }) => c.travelId);
  const enrolledTravelId = traveler.value?.travelId;
  return [...new Set([...configuredTravelIds, ...paymentTravelIds, ...(enrolledTravelId ? [enrolledTravelId] : [])])];
});

// Filters
const dateFrom = ref('');
const dateTo = ref('');
const travelFilter = ref<string>('all');

const travelOptions = computed(() => [
  { label: 'Todos los viajes', value: 'all' },
  ...travelerTravelIds.value.map((id) => {
    const t = travelStore.getTravelById(id);
    return { label: t?.destination ?? id, value: id };
  }),
]);

function getTravelName(id: string) {
  return travelStore.getTravelById(id)?.destination ?? id;
}

function getTravelPrice(id: string) {
  return travelStore.getTravelById(id)?.price ?? 0;
}

const filteredPayments = computed(() => {
  return paymentStore.getPaymentsByTraveler(travelerId.value).filter((p: Payment) => {
    if (travelFilter.value !== 'all' && p.travelId !== travelFilter.value)
      return false;
    if (dateFrom.value && p.paymentDate < dateFrom.value)
      return false;
    if (dateTo.value && p.paymentDate > dateTo.value)
      return false;
    return true;
  });
});

// Modals
const isEditModalOpen = shallowRef(false);
const editingPayment = shallowRef<Payment | null>(null);

function openEditModal(payment: Payment) {
  editingPayment.value = payment;
  isEditModalOpen.value = true;
}

function closeEditModal() {
  isEditModalOpen.value = false;
  editingPayment.value = null;
}

async function handleEditSubmit(data: PaymentFormData) {
  if (!editingPayment.value)
    return;
  await paymentStore.updatePayment(editingPayment.value.id, data);
  toast.add({ title: 'Pago actualizado', color: 'success' });
  closeEditModal();
}

async function handleDelete(payment: Payment) {
  // eslint-disable-next-line no-alert
  if (confirm('¿Eliminar este pago? Esta acción no se puede deshacer.')) {
    await paymentStore.deletePayment(payment.id);
    toast.add({ title: 'Pago eliminado', color: 'warning' });
  }
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(value);
}

function formatDate(dateString: string) {
  return new Date(dateString).toLocaleDateString('es-MX', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

const paymentTypeLabel: Record<string, string> = {
  cash: 'Efectivo',
  transfer: 'Transferencia',
};

const columns: TableColumn<Payment>[] = [
  {
    accessorKey: 'paymentDate',
    header: 'Fecha',
    cell: ({ row }) => h('span', { class: 'text-sm' }, formatDate(row.getValue('paymentDate'))),
  },
  {
    accessorKey: 'amount',
    header: 'Monto',
    cell: ({ row }) => h('span', { class: 'text-sm font-medium text-success' }, formatCurrency(row.getValue('amount'))),
  },
  {
    accessorKey: 'paymentType',
    header: 'Tipo',
    cell: ({ row }) => {
      const type = row.getValue<string>('paymentType');
      return h(resolveComponent('UBadge'), { color: type === 'cash' ? 'neutral' : 'info', variant: 'subtle' }, () => paymentTypeLabel[type] ?? type);
    },
  },
  {
    accessorKey: 'notes',
    header: 'Notas',
    cell: ({ row }) => h('span', { class: 'text-sm text-muted' }, row.getValue('notes') || '—'),
  },
  {
    id: 'actions',
    header: 'Acciones',
    cell: ({ row }) => {
      return h(
        resolveComponent('UDropdownMenu'),
        {
          items: [
            [{ label: 'Editar', icon: 'i-lucide-pencil', onSelect: () => openEditModal(row.original) }],
            [{ label: 'Eliminar', icon: 'i-lucide-trash-2', onSelect: () => handleDelete(row.original) }],
          ],
        },
        () => h(resolveComponent('UButton'), { color: 'neutral', variant: 'ghost', icon: 'i-lucide-more-vertical' }),
      );
    },
  },
];

// Config modal
const isConfigModalOpen = shallowRef(false);
const editingConfigTravelId = shallowRef<string | null>(null);

function openConfigModal(travelId: string) {
  editingConfigTravelId.value = travelId;
  isConfigModalOpen.value = true;
}

function closeConfigModal() {
  isConfigModalOpen.value = false;
  editingConfigTravelId.value = null;
}

const editingConfig = computed(() =>
  editingConfigTravelId.value
    ? paymentStore.getAccountConfig(travelerId.value, editingConfigTravelId.value)
    : undefined,
);

const editingConfigPreciosPublicos = computed(() => {
  if (!editingConfigTravelId.value)
    return [];
  const cotizacion = cotizacionStore.getCotizacionByTravel(editingConfigTravelId.value);
  return cotizacion ? cotizacionStore.getPreciosPublicosByQuotation(cotizacion.id) : [];
});

const editingConfigTravelPrice = computed(() =>
  editingConfigTravelId.value ? getTravelPrice(editingConfigTravelId.value) : 0,
);

async function handleConfigSubmit(config: TravelerAccountConfig) {
  await paymentStore.setAccountConfig(config);
  toast.add({ title: 'Configuración guardada', color: 'success' });
  closeConfigModal();
}

const editingSummary = computed(() => {
  if (!editingPayment.value)
    return null;
  const travelPrice = getTravelPrice(editingPayment.value.travelId);
  return paymentStore.getTravelerPaymentSummary(travelerId.value, editingPayment.value.travelId, travelPrice);
});

const editMaxAmount = computed(() => {
  if (!editingSummary.value || !editingPayment.value)
    return 0;
  return editingSummary.value.balance + editingPayment.value.amount;
});

onMounted(async () => {
  await paymentStore.fetchByTraveler(travelerId.value);
  await ensureCotizacionesLoaded(travelerTravelIds.value);
});

watch(travelerTravelIds, (ids) => {
  void ensureCotizacionesLoaded(ids);
});
</script>

<template>
  <div v-if="traveler" class="space-y-6">
    <!-- Header -->
    <div class="flex items-center gap-3">
      <UButton
        icon="i-lucide-arrow-left"
        variant="ghost"
        color="neutral"
        size="sm"
        @click="router.push({ name: 'payments-index' })"
      />
      <div>
        <h1 class="text-3xl font-bold">
          {{ travelerName }}
        </h1>
        <p class="text-muted mt-0.5">
          Historial de pagos
        </p>
      </div>
    </div>

    <!-- Filters -->
    <div class="flex flex-wrap gap-3">
      <USelect
        v-model="travelFilter"
        :items="travelOptions"
        value-key="value"
        label-key="label"
        class="w-52"
      />
      <UInput
        v-model="dateFrom"
        type="date"
        class="w-44"
      />
      <UInput
        v-model="dateTo"
        type="date"
        class="w-44"
      />
      <UButton
        v-if="travelFilter !== 'all' || dateFrom || dateTo"
        icon="i-lucide-filter-x"
        variant="ghost"
        color="neutral"
        @click="() => { travelFilter = 'all'; dateFrom = ''; dateTo = ''; }"
      >
        Limpiar
      </UButton>
    </div>

    <!-- Per-travel sections -->
    <template v-for="id in travelerTravelIds" :key="id">
      <template v-if="travelFilter === 'all' || travelFilter === id">
        <div class="space-y-3">
          <div class="flex items-center justify-between">
            <h2 class="text-xl font-semibold flex items-center gap-2">
              <UIcon name="i-lucide-map-pin" class="w-5 h-5 text-primary" />
              {{ getTravelName(id) }}
            </h2>
            <div class="flex items-center gap-2">
              <UButton
                size="sm"
                variant="ghost"
                color="neutral"
                icon="i-lucide-settings"
                @click="openConfigModal(id)"
              >
                Configurar cuenta
              </UButton>
              <UButton
                size="sm"
                variant="outline"
                icon="i-lucide-credit-card"
                @click="router.push({ name: 'payments-travel', params: { id } })"
              >
                Ver pagos del viaje
              </UButton>
            </div>
          </div>

          <!-- Summary card -->
          <PaymentSummaryCard
            :summary="paymentStore.getTravelerPaymentSummary(travelerId, id, getTravelPrice(id))"
            :traveler-name="travelerName"
          />

          <!-- Payment history -->
          <UCard>
            <template #header>
              <span class="text-sm font-medium text-muted">Historial de pagos</span>
            </template>
            <div
              v-if="filteredPayments.filter((p: Payment) => p.travelId === id).length === 0"
              class="text-center py-8 text-muted"
            >
              Sin pagos registrados para este viaje
            </div>
            <UTable
              v-else
              :columns="columns"
              :data="filteredPayments.filter((p: Payment) => p.travelId === id)"
            />
          </UCard>
        </div>
      </template>
    </template>

    <!-- Empty state -->
    <div v-if="travelerTravelIds.length === 0" class="text-center py-12">
      <UIcon name="i-lucide-credit-card" class="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
      <h3 class="text-lg font-medium mb-2">
        Sin pagos registrados
      </h3>
      <p class="text-muted">
        Este viajero no tiene pagos ni cuentas configuradas
      </p>
    </div>

    <!-- Account Config Modal -->
    <UModal
      v-model:open="isConfigModalOpen"
      title="Configurar cuenta"
      :description="editingConfigTravelId ? getTravelName(editingConfigTravelId) : ''"
    >
      <template #body>
        <PaymentAccountConfigForm
          v-if="editingConfigTravelId"
          :traveler-id="travelerId"
          :travel-id="editingConfigTravelId"
          :travel-base-price="editingConfigTravelPrice"
          :precios-publicos="editingConfigPreciosPublicos"
          :config="editingConfig"
          @submit="handleConfigSubmit"
          @cancel="closeConfigModal"
        />
      </template>
    </UModal>

    <!-- Edit Modal -->
    <UModal v-model:open="isEditModalOpen" title="Editar pago">
      <template #body>
        <PaymentForm
          v-if="editingPayment"
          :payment="editingPayment"
          :traveler-id="travelerId"
          :travel-id="editingPayment.travelId"
          :max-amount="editMaxAmount"
          @submit="handleEditSubmit"
          @cancel="closeEditModal"
        />
      </template>
    </UModal>
  </div>
</template>

<script setup lang="ts">
import type { BusPaymentStatus, QuotationBus } from '~/types/quotation';

import { useTravelCoordinatorCount } from '~/composables/travels/use-travel-coordinator-count';
import { formatCurrency } from '~/utils/currency';

type Props = {
  quotationId: string;
  readonly?: boolean;
};

type Emits = {
  (e: 'add'): void;
};

const { quotationId, readonly = false } = defineProps<Props>();

defineEmits<Emits>();

const quotationStore = useQuotationStore();
const travelId = computed(() => quotationStore.quotations.find(c => c.id === quotationId)?.travelId);
const coordinatorCount = useTravelCoordinatorCount(travelId);
const providerStore = useProviderStore();
const toast = useToast();

const buses = computed(() => quotationStore.getBusesByQuotation(quotationId));

// Modal state
const isDetailsFormOpen = shallowRef(false);
const isHistoryOpen = shallowRef(false);
const isDeleteModalOpen = shallowRef(false);
const selectedBus = shallowRef<QuotationBus | null>(null);

function getAgencyName(providerId: string): string {
  return providerStore.getProviderById(providerId)?.name ?? 'Desconocido';
}

function getPaymentStatusColor(status: BusPaymentStatus): 'warning' | 'info' | 'success' {
  if (status === 'pending')
    return 'warning';
  if (status === 'partial')
    return 'info';
  return 'success';
}

function getPaymentStatusLabel(status: BusPaymentStatus): string {
  if (status === 'pending')
    return 'Pendiente';
  if (status === 'partial')
    return 'Anticipo';
  return 'Liquidado';
}

function openHistory(bus: QuotationBus) {
  selectedBus.value = bus;
  isHistoryOpen.value = true;
}

function openDetails(bus: QuotationBus) {
  selectedBus.value = bus;
  isDetailsFormOpen.value = true;
}

function openDeleteConfirm(bus: QuotationBus) {
  selectedBus.value = bus;
  isDeleteModalOpen.value = true;
}

function closeDeleteModal() {
  isDeleteModalOpen.value = false;
}

async function handleToggleConfirmed(bus: QuotationBus) {
  if (readonly)
    return;
  await quotationStore.updateBusQuotation(bus.id, { confirmed: !bus.confirmed });
}

async function confirmDelete() {
  if (!selectedBus.value)
    return;
  await quotationStore.deleteBusQuotation(selectedBus.value.id);
  toast.add({ title: 'Autobús eliminado', color: 'warning' });
  isDeleteModalOpen.value = false;
  selectedBus.value = null;
}

function getBusActions(bus: QuotationBus) {
  // Payments go on after the quotation is confirmed; only its structure is locked.
  const paymentActions = [
    {
      label: 'Ver historial de pagos',
      icon: 'i-lucide-receipt',
      onSelect: () => openHistory(bus),
    },
    {
      label: 'Registrar pago',
      icon: 'i-lucide-banknote',
      disabled: quotationStore.getPendingBalanceByBus(bus.id) <= 0,
      onSelect: () => openHistory(bus),
    },
  ];

  if (readonly)
    return [paymentActions];

  return [
    paymentActions,
    [
      {
        label: 'Editar detalles',
        icon: 'i-lucide-pencil',
        onSelect: () => openDetails(bus),
      },
      {
        label: bus.confirmed ? 'Marcar sin confirmar' : 'Marcar como confirmado',
        icon: bus.confirmed ? 'i-lucide-x-circle' : 'i-lucide-check-circle',
        onSelect: () => handleToggleConfirmed(bus),
      },
    ],
    [
      {
        label: 'Eliminar',
        icon: 'i-lucide-trash-2',
        color: 'error' as const,
        onSelect: () => openDeleteConfirm(bus),
      },
    ],
  ];
}
</script>

<template>
  <UCard>
    <template #header>
      <div class="flex items-center justify-between w-full">
        <h2 class="font-semibold flex items-center gap-2">
          <UIcon name="i-lucide-bus" class="w-5 h-5 text-muted" />
          Autobuses Apartados
        </h2>
        <UButton
          v-if="!readonly"
          icon="i-lucide-plus"
          size="xs"
          label="Agregar Autobús"
          @click="$emit('add')"
        />
      </div>
    </template>

    <!-- Table -->
    <div v-if="buses.length > 0" class="overflow-x-auto">
      <table class="w-full text-sm">
        <thead>
          <tr class="border-b border-default text-left text-muted">
            <th class="pb-2 pr-4 font-medium">
              Agencia
            </th>
            <th class="pb-2 pr-4 font-medium">
              Unidad
            </th>
            <th class="pb-2 pr-4 font-medium">
              Asientos
            </th>
            <th class="pb-2 pr-4 font-medium">
              División
            </th>
            <th class="pb-2 pr-4 font-medium">
              Costo Total
            </th>
            <th class="pb-2 pr-4 font-medium">
              Costo/persona
            </th>
            <th class="pb-2 pr-4 font-medium">
              Pagado
            </th>
            <th class="pb-2 pr-4 font-medium">
              Pendiente
            </th>
            <th class="pb-2 pr-4 font-medium">
              Método
            </th>
            <th class="pb-2 pr-4 font-medium">
              Estado Pago
            </th>
            <th class="pb-2 pr-4 font-medium">
              Confirmado
            </th>
            <th class="pb-2 font-medium">
              Acciones
            </th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="bus in buses"
            :key="bus.id"
            class="border-b border-default/50 hover:bg-elevated/50"
          >
            <td class="py-3 pr-4 font-medium">
              {{ getAgencyName(bus.providerId) }}
            </td>
            <td class="py-3 pr-4 font-mono">
              {{ bus.unitNumber }}
            </td>
            <td class="py-3 pr-4">
              {{ bus.capacity }}
            </td>

            <!-- Split -->
            <td class="py-3 pr-4">
              <UBadge
                :label="(bus.splitType ?? 'minimum') === 'minimum' ? 'Asientos min.' : 'Asientos vend.'"
                :color="(bus.splitType ?? 'minimum') === 'minimum' ? 'info' : 'neutral'"
                variant="subtle"
              />
            </td>

            <!-- Total Cost -->
            <td class="py-3 pr-4 font-medium">
              {{ formatCurrency(bus.totalCost ?? 0) }}
            </td>

            <!-- Cost/person -->
            <td class="py-3 pr-4">
              {{ formatCurrency(quotationStore.getBusCostPerPerson(bus.id, coordinatorCount)) }}
            </td>

            <!-- Paid -->
            <td class="py-3 pr-4">
              {{ formatCurrency(quotationStore.getPaidByBus(bus.id)) }}
            </td>

            <!-- Pending -->
            <td class="py-3 pr-4">
              <span :class="quotationStore.getPendingBalanceByBus(bus.id) > 0 ? 'text-warning' : 'text-success'">
                {{ formatCurrency(quotationStore.getPendingBalanceByBus(bus.id)) }}
              </span>
            </td>

            <!-- Method -->
            <td class="py-3 pr-4">
              <UBadge
                :label="bus.paymentMethod === 'cash' ? 'Efectivo' : 'Transferencia'"
                color="neutral"
                variant="subtle"
              />
            </td>

            <!-- Payment Status -->
            <td class="py-3 pr-4">
              <UBadge
                :label="getPaymentStatusLabel(quotationStore.getBusPaymentStatus(bus.id))"
                :color="getPaymentStatusColor(quotationStore.getBusPaymentStatus(bus.id))"
                variant="subtle"
              />
            </td>

            <!-- Confirmed -->
            <td class="py-3 pr-4">
              <UBadge
                :label="bus.confirmed ? 'Sí' : 'No'"
                :color="bus.confirmed ? 'success' : 'neutral'"
                variant="subtle"
              />
            </td>

            <!-- Actions -->
            <td class="py-3">
              <UDropdownMenu :items="getBusActions(bus)">
                <UButton
                  icon="i-lucide-more-vertical"
                  variant="ghost"
                  color="neutral"
                  size="xs"
                />
              </UDropdownMenu>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Empty state -->
    <EmptyState
      v-else
      section="buses"
      :actions="readonly ? undefined : [{ label: 'Agregar autobús', icon: 'i-lucide-plus', onClick: () => $emit('add') }]"
    />
  </UCard>

  <!-- Slideover: payment history -->
  <USlideover
    v-model:open="isHistoryOpen"
    :title="selectedBus ? `Pagos — ${selectedBus.unitNumber}` : 'Historial de Pagos'"
    description="Registro de pagos realizados a la agencia"
    side="right"
  >
    <template #body>
      <div class="p-4">
        <QuotationPaymentHistory
          v-if="selectedBus"
          kind="bus"
          :parent-id="selectedBus.id"
          :subtitle="selectedBus.unitNumber"
        />
      </div>
    </template>
  </USlideover>

  <!-- Modal: edit bus (same form as adding) -->
  <QuotationBusForm
    v-model:open="isDetailsFormOpen"
    :quotation-id="quotationId"
    :bus="selectedBus"
  />

  <!-- Modal: confirm deletion -->
  <UModal
    v-model:open="isDeleteModalOpen"
    title="Eliminar Autobús"
    description="¿Estás seguro? Se eliminarán también todos los pagos asociados."
  >
    <template #footer>
      <div class="flex justify-end gap-3">
        <UButton
          variant="ghost"
          color="neutral"
          label="Cancelar"
          @click="closeDeleteModal"
        />
        <UButton
          color="error"
          label="Eliminar"
          @click="confirmDelete"
        />
      </div>
    </template>
  </UModal>
</template>

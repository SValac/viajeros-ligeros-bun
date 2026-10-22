<script setup lang="ts">
import type { TableColumn } from '@nuxt/ui';

import { h } from 'vue';
import { z } from 'zod';

import type { QuotationAccommodation, QuotationAccommodationDetailFormData } from '~/types/quotation';

import { useQuotationRoomCounts } from '~/composables/quotation/use-quotation-room-counts';
import { useSupplierPaymentColumns } from '~/composables/quotation/use-supplier-payment-columns';
import { actionsColumn } from '~/utils/actions-column';
import { formatCurrency } from '~/utils/currency';

type Props = {
  quotationId: string;
  readonly?: boolean;
};

const props = withDefaults(defineProps<Props>(), {
  readonly: false,
});

const quotationStore = useQuotationStore();
const providerStore = useProviderStore();
const hotelRoomStore = useHotelRoomStore();
const toast = useToast();
const confirmDelete = useConfirmDelete();

// Rooms the travel holds per hotel room type: they're added on the travel's rooms page.
const { getRoomCount } = useQuotationRoomCounts(() => props.quotationId);

// The quotation's accommodations
const accommodations = computed(() => {
  return quotationStore.getAccommodationsByQuotation(props.quotationId);
});

// Modal state
const isEditModalOpen = ref(false);
const editingAccommodation = ref<QuotationAccommodation | null>(null);

// Edit schema
const editSchema = z.object({
  nightCount: z.number().int().positive(),
  details: z.array(z.object({
    roomTypeId: z.string(),
    pricePerNight: z.number().positive(),
    maxOccupancy: z.number().int().positive(),
  })).min(1),
});

// Edit form state
const editFormState = reactive({
  nightCount: 0,
  details: [] as QuotationAccommodationDetailFormData[],
});

// Room types available for the accommodation being edited
const roomTypesEdit = computed(() => {
  if (!editingAccommodation.value)
    return [];
  return hotelRoomStore.getRoomDataByProviderId(editingAccommodation.value.providerId)?.roomTypes ?? [];
});

// Rooms the travel already holds per room type of the hotel being edited
const roomCountsEdit = computed(() => {
  const accommodation = editingAccommodation.value;
  if (!accommodation)
    return new Map<string, number>();
  return new Map(roomTypesEdit.value.map(t => [t.id, getRoomCount(accommodation.providerId, t.id)]));
});

// Rooms the travel holds in a quoted hotel (only its quoted types count toward the cost)
function getTravelRooms(accommodation: QuotationAccommodation): number {
  return accommodation.details.reduce(
    (sum, d) => sum + getRoomCount(accommodation.providerId, d.roomTypeId),
    0,
  );
}

// Payment history slideover
const isHistoryOpen = ref(false);
const historyAccommodation = ref<QuotationAccommodation | null>(null);

function openHistory(accommodation: QuotationAccommodation) {
  historyAccommodation.value = accommodation;
  isHistoryOpen.value = true;
}

// Row actions
function getRowActions(accommodation: QuotationAccommodation) {
  const balance = quotationStore.getPendingBalanceByAccommodation(accommodation.id);
  // Payments go on after the quotation is confirmed; only its structure is locked.
  const paymentActions = [
    {
      label: 'Ver historial de pagos',
      icon: 'i-lucide-receipt',
      onSelect: () => openHistory(accommodation),
    },
    {
      label: 'Registrar pago',
      icon: 'i-lucide-banknote',
      disabled: balance <= 0,
      onSelect: () => openHistory(accommodation),
    },
  ];

  if (props.readonly)
    return [paymentActions];

  return [
    paymentActions,
    [
      {
        label: 'Editar',
        icon: 'i-lucide-pencil',
        onSelect: () => openEdit(accommodation),
      },
      {
        label: accommodation.confirmed ? 'Marcar sin confirmar' : 'Marcar como confirmado',
        icon: accommodation.confirmed ? 'i-lucide-x-circle' : 'i-lucide-check-circle',
        onSelect: () => quotationStore.toggleAccommodationConfirmed(accommodation.id),
      },
    ],
    [
      {
        label: 'Eliminar',
        icon: 'i-lucide-trash-2',
        color: 'error' as const,
        onSelect: () => deleteAccommodation(accommodation),
      },
    ],
  ];
}

// Table columns
const supplierColumns = useSupplierPaymentColumns<QuotationAccommodation>('accommodation');
const columns = computed<TableColumn<QuotationAccommodation>[]>(() => {
  const cols: TableColumn<QuotationAccommodation>[] = [
    {
      accessorKey: 'providerId',
      header: 'Hotel',
      cell: ({ row }) => h('span', { class: 'font-medium' }, providerStore.getProviderName(row.original.providerId)),
    },
    {
      accessorKey: 'nightCount',
      header: 'Noches',
      cell: ({ row }) => h('span', { class: 'font-medium' }, String(row.original.nightCount)),
    },
    {
      id: 'rooms',
      header: 'Habitaciones',
      cell: ({ row }) => h('span', { class: 'font-medium' }, String(getTravelRooms(row.original))),
    },
    {
      accessorKey: 'totalCost',
      header: 'Costo Total',
      cell: ({ row }) => h('span', { class: 'font-bold' }, formatCurrency(row.original.totalCost)),
    },
    supplierColumns.paidColumn,
    supplierColumns.pendingColumn,
    supplierColumns.statusColumn,
    {
      id: 'confirmed',
      header: 'Confirmado',
      cell: ({ row }) =>
        h(resolveComponent('UBadge'), {
          label: row.original.confirmed ? 'Sí' : 'No',
          color: row.original.confirmed ? 'success' : 'neutral',
          variant: 'subtle',
        }),
    },
  ];

  cols.push(
    actionsColumn(getRowActions, { size: 'xs' }),
  );

  return cols;
});

// Open the edit modal
function openEdit(accommodation: QuotationAccommodation) {
  editingAccommodation.value = accommodation;
  editFormState.nightCount = accommodation.nightCount;
  editFormState.details = accommodation.details.map(d => ({ ...d }));
  isEditModalOpen.value = true;
}

// Save the edit
async function saveEdit() {
  if (!editingAccommodation.value)
    return;

  const result = editSchema.safeParse(editFormState);
  if (!result.success) {
    toast.add({
      title: 'Error en la edición',
      description: result.error.issues.map((e: any) => e.message).join(', '),
      color: 'error',
    });
    return;
  }

  const updated = await quotationStore.updateQuotationAccommodation(editingAccommodation.value.id, {
    nightCount: editFormState.nightCount,
    details: editFormState.details.map(d => ({ ...d, id: d.id ?? crypto.randomUUID() })),
  });

  if ('error' in updated) {
    toast.add({
      title: 'No se pudo actualizar el hospedaje',
      description: updated.error,
      color: 'error',
    });
    return;
  }

  toast.add({
    title: 'Hospedaje actualizado',
    color: 'success',
  });

  isEditModalOpen.value = false;
  editingAccommodation.value = null;
}

function closeEdit() {
  isEditModalOpen.value = false;
}

// Delete accommodation
async function deleteAccommodation(accommodation: QuotationAccommodation) {
  if (!(await confirmDelete({
    title: 'Eliminar hospedaje',
    description: `¿Estás seguro de que deseas eliminar “${providerStore.getProviderName(accommodation.providerId)}”?`,
  }))) {
    return;
  }

  const error = await quotationStore.deleteQuotationAccommodation(accommodation.id);
  if (error) {
    toast.add({
      title: 'No se pudo eliminar el hospedaje',
      description: error,
      color: 'error',
    });
    return;
  }
  toast.add({
    title: 'Hospedaje eliminado',
    color: 'success',
  });
}
</script>

<template>
  <div class="space-y-4">
    <!-- Accommodations table -->
    <UTable
      v-if="accommodations.length > 0"
      :data="accommodations"
      :columns="columns"
    />

    <!-- No accommodations -->
    <EmptyState v-else section="lodging" />

    <!-- Edit modal -->
    <UModal
      v-model:open="isEditModalOpen"
      title="Editar Hospedaje"
      description="Actualiza los detalles del hospedaje"
      class="sm:max-w-2xl"
    >
      <template #body>
        <div v-if="editingAccommodation" class="space-y-6">
          <!-- Mostrar hotel (read-only) -->
          <div>
            <label class="text-sm font-medium block mb-2">Hotel</label>
            <div class="bg-muted/20 rounded px-4 py-2">
              {{ providerStore.getProviderName(editingAccommodation.providerId) }}
            </div>
          </div>

          <!-- Editable number of nights -->
          <div>
            <label class="text-sm font-medium block mb-2">Cantidad de Noches</label>
            <UInput
              v-model.number="editFormState.nightCount"
              type="number"
              min="1"
              placeholder="Ej. 3"
            />
          </div>

          <!-- Room types with checkboxes -->
          <QuotationAccommodationRoomTypes
            v-model="editFormState.details"
            :room-types="roomTypesEdit"
            :night-count="editFormState.nightCount"
            :room-counts="roomCountsEdit"
          />

          <!-- Actions -->
          <div class="flex justify-end gap-3 pt-2">
            <UButton
              variant="ghost"
              color="neutral"
              label="Cancelar"
              @click="closeEdit"
            />
            <UButton
              label="Guardar"
              @click="saveEdit"
            />
          </div>
        </div>
      </template>
    </UModal>

    <!-- Payment history slideover -->
    <USlideover
      v-model:open="isHistoryOpen"
      :title="historyAccommodation ? `Pagos — ${providerStore.getProviderName(historyAccommodation.providerId)}` : 'Historial de Pagos'"
      description="Registro de pagos realizados al hotel"
      side="right"
      class="sm:max-w-lg"
    >
      <template #body>
        <QuotationPaymentHistory
          v-if="historyAccommodation"
          kind="accommodation"
          :parent-id="historyAccommodation.id"
          :subtitle="providerStore.getProviderName(historyAccommodation.providerId)"
        />
      </template>
    </USlideover>
  </div>
</template>

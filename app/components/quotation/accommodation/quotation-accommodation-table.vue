<script setup lang="ts">
import type { TableColumn } from '@nuxt/ui';

import { h } from 'vue';
import { z } from 'zod';

import type { AccommodationPaymentStatus, QuotationAccommodation, QuotationAccommodationDetailFormData } from '~/types/quotation';

import { countRoomsByType, roomTypeKey } from '~/composables/quotation/use-quotation-domain';
import { travelDetailQuery } from '~/queries/travels';
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

// Rooms the travel holds per hotel room type: they're added on the travel's rooms page.
const travelId = computed(() => quotationStore.quotations.find(c => c.id === props.quotationId)?.travelId);
const { data: travel } = useQuery(() => travelDetailQuery(travelId.value));
const roomCounts = computed(() => countRoomsByType(travel.value?.accommodations ?? []));

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
  return new Map(roomTypesEdit.value.map(t => [t.id, roomCounts.value.get(roomTypeKey(accommodation.providerId, t.id)) ?? 0]));
});

// Rooms the travel holds in a quoted hotel (only its quoted types count toward the cost)
function getTravelRooms(accommodation: QuotationAccommodation): number {
  return accommodation.details.reduce(
    (sum, d) => sum + (roomCounts.value.get(roomTypeKey(accommodation.providerId, d.roomTypeId)) ?? 0),
    0,
  );
}

// Get the hotel name
function getHotelName(providerId: string): string {
  return providerStore.getProviderById(providerId)?.name ?? 'Desconocido';
}

// Payment history slideover
const isHistoryOpen = ref(false);
const historyAccommodation = ref<QuotationAccommodation | null>(null);

function openHistory(accommodation: QuotationAccommodation) {
  historyAccommodation.value = accommodation;
  isHistoryOpen.value = true;
}

// Payment helpers for the columns
const paymentStatusBadge: Record<AccommodationPaymentStatus, { label: string; color: 'warning' | 'success' | 'neutral' }> = {
  pending: { label: 'Pendiente', color: 'warning' },
  partial: { label: 'Anticipo', color: 'neutral' },
  paid: { label: 'Liquidado', color: 'success' },
};

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
        onSelect: () => deleteAccommodation(accommodation.id),
      },
    ],
  ];
}

// Table columns
const columns = computed<TableColumn<QuotationAccommodation>[]>(() => {
  const cols: TableColumn<QuotationAccommodation>[] = [
    {
      accessorKey: 'providerId',
      header: 'Hotel',
      cell: ({ row }) => h('span', { class: 'font-medium' }, getHotelName(row.original.providerId)),
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
    {
      id: 'paid',
      header: 'Pagado',
      cell: ({ row }) => {
        const paid = quotationStore.getPaidByAccommodation(row.original.id);
        return h('span', { class: 'font-medium' }, formatCurrency(paid));
      },
    },
    {
      id: 'pending',
      header: 'Pendiente',
      cell: ({ row }) => {
        const balance = quotationStore.getPendingBalanceByAccommodation(row.original.id);
        return h('span', { class: balance > 0 ? 'text-warning font-medium' : 'text-success font-medium' }, formatCurrency(balance));
      },
    },
    {
      id: 'paymentStatus',
      header: 'Estado Pago',
      cell: ({ row }) => {
        const status = quotationStore.getAccommodationPaymentStatus(row.original.id);
        const badge = paymentStatusBadge[status];
        return h(resolveComponent('UBadge'), { label: badge.label, color: badge.color, variant: 'subtle' });
      },
    },
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

  cols.push({
    id: 'actions',
    header: 'Acciones',
    cell: ({ row }) =>
      h(resolveComponent('UDropdownMenu'), {
        items: getRowActions(row.original),
      }, () => h(resolveComponent('UButton'), {
        color: 'neutral',
        variant: 'ghost',
        icon: 'i-lucide-more-vertical',
        size: 'xs',
      })),
  });

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
async function deleteAccommodation(id: string) {
  const error = await quotationStore.deleteQuotationAccommodation(id);
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
              {{ getHotelName(editingAccommodation.providerId) }}
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
      :title="historyAccommodation ? `Pagos — ${getHotelName(historyAccommodation.providerId)}` : 'Historial de Pagos'"
      description="Registro de pagos realizados al hotel"
      side="right"
      class="sm:max-w-lg"
    >
      <template #body>
        <QuotationAccommodationPaymentHistory
          v-if="historyAccommodation"
          :quotation-accommodation-id="historyAccommodation.id"
          :hotel-name="getHotelName(historyAccommodation.providerId)"
        />
      </template>
    </USlideover>
  </div>
</template>

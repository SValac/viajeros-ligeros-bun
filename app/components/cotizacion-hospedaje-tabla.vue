<script setup lang="ts">
import type { TableColumn } from '@nuxt/ui';

import { h } from 'vue';
import { z } from 'zod';

import type { AccommodationPaymentStatus, QuotationAccommodation, QuotationAccommodationDetailFormData } from '~/types/quotation';

import { roomTypeKey } from '~/composables/quotation/use-quotation-domain';
import { formatCurrency } from '~/utils/currency';

type Props = {
  quotationId: string;
  readonly?: boolean;
};

const props = withDefaults(defineProps<Props>(), {
  readonly: false,
});

const cotizacionStore = useCotizacionStore();
const providerStore = useProviderStore();
const hotelRoomStore = useHotelRoomStore();
const toast = useToast();

// Hospedajes de la cotización
const hospedajes = computed(() => {
  return cotizacionStore.getHospedajesByQuotation(props.quotationId);
});

// Modal estado
const isEditModalOpen = ref(false);
const editingHospedaje = ref<QuotationAccommodation | null>(null);

// Schema para editar
const editSchema = z.object({
  nightCount: z.number().int().positive(),
  details: z.array(z.object({
    roomTypeId: z.string(),
    pricePerNight: z.number().positive(),
    maxOccupancy: z.number().int().positive(),
  })).min(1),
});

// Estado del form de edición
const editFormState = reactive({
  nightCount: 0,
  details: [] as QuotationAccommodationDetailFormData[],
});

// Tipos de habitación disponibles para el hospedaje en edición
const tiposHabitacionEdit = computed(() => {
  if (!editingHospedaje.value)
    return [];
  return hotelRoomStore.getRoomDataByProviderId(editingHospedaje.value.providerId)?.roomTypes ?? [];
});

// Rooms the travel already holds per room type of the hotel being edited
const roomCountsEdit = computed(() => {
  const hospedaje = editingHospedaje.value;
  if (!hospedaje)
    return new Map<string, number>();
  const counts = cotizacionStore.getRoomCountsByQuotation(props.quotationId);
  return new Map(tiposHabitacionEdit.value.map(t => [t.id, counts.get(roomTypeKey(hospedaje.providerId, t.id)) ?? 0]));
});

// Rooms the travel holds in a quoted hotel (only its quoted types count toward the cost)
function getHabitacionesViaje(accommodation: QuotationAccommodation): number {
  const counts = cotizacionStore.getRoomCountsByQuotation(props.quotationId);
  return accommodation.details.reduce(
    (sum, d) => sum + (counts.get(roomTypeKey(accommodation.providerId, d.roomTypeId)) ?? 0),
    0,
  );
}

// Obtener nombre del hotel
function getNombreHotel(providerId: string): string {
  return providerStore.getProviderById(providerId)?.name ?? 'Desconocido';
}

// Slideover historial de pagos
const isHistorialOpen = ref(false);
const historialHospedaje = ref<QuotationAccommodation | null>(null);

function abrirHistorial(accommodation: QuotationAccommodation) {
  historialHospedaje.value = accommodation;
  isHistorialOpen.value = true;
}

// Helpers de pago para columnas
const estadoPagoBadge: Record<AccommodationPaymentStatus, { label: string; color: 'warning' | 'success' | 'neutral' }> = {
  pending: { label: 'Pendiente', color: 'warning' },
  partial: { label: 'Anticipo', color: 'neutral' },
  paid: { label: 'Liquidado', color: 'success' },
};

// Acciones por fila
function getRowActions(accommodation: QuotationAccommodation) {
  const saldo = cotizacionStore.getSaldoPendienteHospedaje(accommodation.id);
  // Payments go on after the quotation is confirmed; only its structure is locked.
  const paymentActions = [
    {
      label: 'Ver historial de pagos',
      icon: 'i-lucide-receipt',
      onSelect: () => abrirHistorial(accommodation),
    },
    {
      label: 'Registrar pago',
      icon: 'i-lucide-banknote',
      disabled: saldo <= 0,
      onSelect: () => abrirHistorial(accommodation),
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
        onSelect: () => abrirEdicion(accommodation),
      },
      {
        label: accommodation.confirmed ? 'Marcar sin confirmar' : 'Marcar como confirmado',
        icon: accommodation.confirmed ? 'i-lucide-x-circle' : 'i-lucide-check-circle',
        onSelect: () => cotizacionStore.toggleConfirmadoHospedaje(accommodation.id),
      },
    ],
    [
      {
        label: 'Eliminar',
        icon: 'i-lucide-trash-2',
        color: 'error' as const,
        onSelect: () => eliminarHospedaje(accommodation.id),
      },
    ],
  ];
}

// Columnas de la tabla
const columns = computed<TableColumn<QuotationAccommodation>[]>(() => {
  const cols: TableColumn<QuotationAccommodation>[] = [
    {
      accessorKey: 'providerId',
      header: 'Hotel',
      cell: ({ row }) => h('span', { class: 'font-medium' }, getNombreHotel(row.original.providerId)),
    },
    {
      accessorKey: 'cantidadNoches',
      header: 'Noches',
      cell: ({ row }) => h('span', { class: 'font-medium' }, String(row.original.nightCount)),
    },
    {
      id: 'habitaciones',
      header: 'Habitaciones',
      cell: ({ row }) => h('span', { class: 'font-medium' }, String(getHabitacionesViaje(row.original))),
    },
    {
      accessorKey: 'costoTotal',
      header: 'Costo Total',
      cell: ({ row }) => h('span', { class: 'font-bold' }, formatCurrency(row.original.totalCost)),
    },
    {
      id: 'paid',
      header: 'Pagado',
      cell: ({ row }) => {
        const pagado = cotizacionStore.getAnticipadoHospedaje(row.original.id);
        return h('span', { class: 'font-medium' }, formatCurrency(pagado));
      },
    },
    {
      id: 'pending',
      header: 'Pendiente',
      cell: ({ row }) => {
        const saldo = cotizacionStore.getSaldoPendienteHospedaje(row.original.id);
        return h('span', { class: saldo > 0 ? 'text-warning font-medium' : 'text-success font-medium' }, formatCurrency(saldo));
      },
    },
    {
      id: 'estadoPago',
      header: 'Estado Pago',
      cell: ({ row }) => {
        const status = cotizacionStore.getAccommodationPaymentStatus(row.original.id);
        const badge = estadoPagoBadge[status];
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

// Abrir modal de edición
function abrirEdicion(accommodation: QuotationAccommodation) {
  editingHospedaje.value = accommodation;
  editFormState.nightCount = accommodation.nightCount;
  editFormState.details = accommodation.details.map(d => ({ ...d }));
  isEditModalOpen.value = true;
}

// Guardar edición
async function guardarEdicion() {
  if (!editingHospedaje.value)
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

  const updated = await cotizacionStore.updateHospedajeQuotation(editingHospedaje.value.id, {
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
  editingHospedaje.value = null;
}

function cerrarEdicion() {
  isEditModalOpen.value = false;
}

// Eliminar hospedaje
async function eliminarHospedaje(id: string) {
  const error = await cotizacionStore.deleteHospedajeQuotation(id);
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
    <!-- Tabla de hospedajes -->
    <UTable
      v-if="hospedajes.length > 0"
      :data="hospedajes"
      :columns="columns"
    />

    <!-- Sin hospedajes -->
    <div v-else class="text-center py-8 text-muted">
      <UIcon name="i-lucide-inbox" class="w-8 h-8 mx-auto mb-2 block opacity-50" />
      <p class="text-sm">
        No hay hospedajes agregados
      </p>
    </div>

    <!-- Modal de edición -->
    <UModal
      v-model:open="isEditModalOpen"
      title="Editar Hospedaje"
      description="Actualiza los detalles del hospedaje"
      class="sm:max-w-2xl"
    >
      <template #body>
        <div v-if="editingHospedaje" class="space-y-6">
          <!-- Mostrar hotel (read-only) -->
          <div>
            <label class="text-sm font-medium block mb-2">Hotel</label>
            <div class="bg-muted/20 rounded px-4 py-2">
              {{ getNombreHotel(editingHospedaje.providerId) }}
            </div>
          </div>

          <!-- Cantidad de noches editable -->
          <div>
            <label class="text-sm font-medium block mb-2">Cantidad de Noches</label>
            <UInput
              v-model.number="editFormState.nightCount"
              type="number"
              min="1"
              placeholder="Ej. 3"
            />
          </div>

          <!-- Tipos de habitación con checkboxes -->
          <CotizacionHospedajeTipos
            v-model="editFormState.details"
            :room-types="tiposHabitacionEdit"
            :night-count="editFormState.nightCount"
            :room-counts="roomCountsEdit"
          />

          <!-- Acciones -->
          <div class="flex justify-end gap-3 pt-2">
            <UButton
              variant="ghost"
              color="neutral"
              label="Cancelar"
              @click="cerrarEdicion"
            />
            <UButton
              label="Guardar"
              @click="guardarEdicion"
            />
          </div>
        </div>
      </template>
    </UModal>

    <!-- Slideover historial de pagos -->
    <USlideover
      v-model:open="isHistorialOpen"
      :title="historialHospedaje ? `Pagos — ${getNombreHotel(historialHospedaje.providerId)}` : 'Historial de Pagos'"
      description="Registro de pagos realizados al hotel"
      side="right"
      class="sm:max-w-lg"
    >
      <template #body>
        <PagoHospedajeHistorial
          v-if="historialHospedaje"
          :quotation-accommodation-id="historialHospedaje.id"
          :hotel-name="getNombreHotel(historialHospedaje.providerId)"
        />
      </template>
    </USlideover>
  </div>
</template>

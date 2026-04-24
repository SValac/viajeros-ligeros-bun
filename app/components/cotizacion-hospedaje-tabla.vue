<script setup lang="ts">
import type { TableColumn } from '@nuxt/ui';

import { h } from 'vue';
import { z } from 'zod';

import type { BedConfiguration, HotelRoomType } from '~/types/hotel-room';
import type { AccommodationPaymentStatus, QuotationAccommodation, QuotationAccommodationDetail, QuotationAccommodationFormData } from '~/types/quotation';

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
    count: z.number().int().positive(),
    pricePerNight: z.number().positive(),
    maxOccupancy: z.number().int().positive(),
  })).min(1),
});

// Estado del form de edición
const editFormState = reactive({
  nightCount: 0,
  details: [] as QuotationAccommodationDetail[],
});

// Obtener camas de un detalle buscando el HotelRoomType en el store
function getCamasDetalle(providerId: string, roomTypeId: string): BedConfiguration[] {
  const roomData = hotelRoomStore.getRoomDataByProviderId(providerId);
  return roomData?.roomTypes.find(rt => rt.id === roomTypeId)?.beds ?? [];
}

// Tipos de habitación disponibles para el hospedaje en edición
const tiposHabitacionEdit = computed(() => {
  if (!editingHospedaje.value)
    return [];
  return hotelRoomStore.getRoomDataByProviderId(editingHospedaje.value.providerId)?.roomTypes ?? [];
});

// Mapa de detalles seleccionados en edición
const editDetallesMap = computed(() => {
  const map = new Map<string, QuotationAccommodationDetail>();
  for (const detalle of editFormState.details) {
    map.set(detalle.roomTypeId, detalle);
  }
  return map;
});

// Toggle tipo de habitación en edición
function toggleTipoHabitacionEdit(tipo: HotelRoomType) {
  const existe = editDetallesMap.value.has(tipo.id);
  if (existe) {
    editFormState.details = editFormState.details.filter(d => d.roomTypeId !== tipo.id);
  }
  else {
    editFormState.details.push({
      id: crypto.randomUUID(),
      roomTypeId: tipo.id,
      quantity: 1,
      pricePerNight: tipo.pricePerNight,
      maxOccupancy: tipo.maxOccupancy,
    });
  }
}

// Actualizar cantidad en edición respetando el máximo del hotel
function actualizarCantidadEdit(tipoId: string, count: number) {
  const detalle = editFormState.details.find(d => d.roomTypeId === tipoId);
  if (!detalle || count <= 0)
    return;
  const tipo = tiposHabitacionEdit.value.find(t => t.id === tipoId);
  detalle.quantity = tipo ? Math.min(count, tipo.roomCount) : count;
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
function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(amount);
}

const estadoPagoBadge: Record<AccommodationPaymentStatus, { label: string; color: 'warning' | 'success' | 'neutral' }> = {
  pending: { label: 'Pendiente', color: 'warning' },
  partial: { label: 'Anticipo', color: 'neutral' },
  paid: { label: 'Liquidado', color: 'success' },
};

// Acciones por fila
function getRowActions(accommodation: QuotationAccommodation) {
  const saldo = cotizacionStore.getSaldoPendienteHospedaje(accommodation.id);
  return [
    [
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
    ],
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
      accessorKey: 'costoTotal',
      header: 'Costo Total',
      cell: ({ row }) => h('span', { class: 'font-bold' }, formatCurrency(row.original.totalCost)),
    },
    {
      id: 'paid',
      header: 'Pagado',
      cell: ({ row }) => {
        const pagado = cotizacionStore.getAnticipadoHospedaje(row.original.id);
        return h('span', { class: 'text-success font-medium' }, formatCurrency(pagado));
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
        return h(resolveComponent('UBadge'), { label: badge.label, color: badge.color, variant: 'subtle', size: 'xs' });
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
          size: 'xs',
        }),
    },
  ];

  if (!props.readonly) {
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
  }

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
    details: editFormState.details,
    totalCost: editFormState.details.reduce((sum, d) => {
      return sum + (d.pricePerNight * editFormState.nightCount * d.quantity);
    }, 0),
  } as Partial<QuotationAccommodationFormData>);

  if (!updated) {
    toast.add({
      title: 'Error',
      description: 'No se pudo actualizar el hospedaje',
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

// Eliminar hospedaje
async function eliminarHospedaje(id: string) {
  await cotizacionStore.deleteHospedajeQuotation(id);
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
      <span class="i-lucide-inbox w-8 h-8 mx-auto mb-2 block opacity-50" />
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
          <div class="space-y-3">
            <h4 class="text-sm font-semibold flex items-center gap-2">
              <span class="i-lucide-door-open w-4 h-4" />
              Tipos de Habitación
            </h4>

            <div v-if="tiposHabitacionEdit.length === 0" class="text-center py-6 text-muted text-sm">
              Este hotel no tiene tipos de habitación configurados
            </div>

            <div v-else class="space-y-3 max-h-80 overflow-y-auto border rounded-lg p-4">
              <div
                v-for="tipo in tiposHabitacionEdit"
                :key="tipo.id"
                class="border rounded-lg p-4 space-y-3"
              >
                <!-- Checkbox para seleccionar/deseleccionar tipo -->
                <div class="flex items-start gap-3">
                  <UCheckbox
                    :model-value="editDetallesMap.has(tipo.id)"
                    @update:model-value="() => toggleTipoHabitacionEdit(tipo)"
                  />
                  <div class="flex-1">
                    <p>
                      {{ tipo.maxOccupancy }} personas
                    </p>
                    <p class="text-sm">
                      {{ formatBedConfiguration(getCamasDetalle(editingHospedaje.providerId, tipo.id)) }}
                    </p>
                    <p class="text-xs text-muted">
                      ${{ tipo.pricePerNight.toFixed(2) }}/noche
                    </p>
                  </div>
                </div>

                <!-- Controles de cantidad si está seleccionado -->
                <div v-if="editDetallesMap.has(tipo.id)" class="ml-8 space-y-2 border-l-2 border-primary pl-4">
                  <div class="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <label class="text-xs text-muted">Cantidad (máx. {{ tipo.roomCount }})</label>
                      <UInput
                        :model-value="editDetallesMap.get(tipo.id)?.quantity ?? 1"
                        type="number"
                        min="1"
                        :max="tipo.roomCount"
                        size="sm"
                        @update:model-value="(v) => actualizarCantidadEdit(tipo.id, Number(v))"
                      />
                    </div>
                    <div>
                      <label class="text-xs text-muted">Costo/Persona</label>
                      <div class="text-sm font-medium py-2">
                        ${{ (tipo.pricePerNight / tipo.maxOccupancy).toFixed(2) }}
                      </div>
                    </div>
                  </div>

                  <div class="text-xs bg-muted/20 rounded px-2 py-1">
                    ${{ tipo.pricePerNight.toFixed(2) }} × {{ editFormState.nightCount }} noches × {{ editDetallesMap.get(tipo.id)?.quantity ?? 1 }} hab =
                    <span class="font-semibold">${{ (tipo.pricePerNight * editFormState.nightCount * (editDetallesMap.get(tipo.id)?.quantity ?? 1)).toFixed(2) }}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Costo total -->
          <div v-if="editFormState.details.length > 0" class="bg-primary/10 rounded-lg p-4 border border-primary/20">
            <div class="flex justify-between items-center">
              <span class="font-semibold">Costo Total</span>
              <span class="text-lg font-bold">
                ${{ editFormState.details.reduce((sum, d) => sum + (d.pricePerNight * editFormState.nightCount * d.quantity), 0).toFixed(2) }}
              </span>
            </div>
          </div>

          <!-- Acciones -->
          <div class="flex justify-end gap-3 pt-2">
            <UButton
              variant="ghost"
              color="neutral"
              label="Cancelar"
              @click="isEditModalOpen = false"
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
          :readonly="props.readonly"
        />
      </template>
    </USlideover>
  </div>
</template>

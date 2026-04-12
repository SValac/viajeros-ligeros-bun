<script setup lang="ts">
import type { TableColumn } from '@nuxt/ui';

import { h } from 'vue';
import { z } from 'zod';

import type { CotizacionHospedaje, CotizacionHospedajeDetalleHabitacion, CotizacionHospedajeFormData } from '~/types/cotizacion';
import type { BedConfiguration, HotelRoomType } from '~/types/hotel-room';

type Props = {
  cotizacionId: string;
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
  return cotizacionStore.getHospedajesByCotizacion(props.cotizacionId);
});

// Modal estado
const isEditModalOpen = ref(false);
const editingHospedaje = ref<CotizacionHospedaje | null>(null);

// Schema para editar
const editSchema = z.object({
  cantidadNoches: z.number().int().positive(),
  detalles: z.array(z.object({
    habitacionTipoId: z.string(),
    cantidad: z.number().int().positive(),
    precioPorNoche: z.number().positive(),
    ocupacionMaxima: z.number().int().positive(),
  })).min(1),
});

// Estado del form de edición
const editFormState = reactive({
  cantidadNoches: 0,
  detalles: [] as CotizacionHospedajeDetalleHabitacion[],
});

// Obtener camas de un detalle buscando el HotelRoomType en el store
function getCamasDetalle(providerId: string, habitacionTipoId: string): BedConfiguration[] {
  const roomData = hotelRoomStore.getRoomDataByProviderId(providerId);
  return roomData?.roomTypes.find(rt => rt.id === habitacionTipoId)?.camas ?? [];
}

// Tipos de habitación disponibles para el hospedaje en edición
const tiposHabitacionEdit = computed(() => {
  if (!editingHospedaje.value)
    return [];
  return hotelRoomStore.getRoomDataByProviderId(editingHospedaje.value.providerId)?.roomTypes ?? [];
});

// Mapa de detalles seleccionados en edición
const editDetallesMap = computed(() => {
  const map = new Map<string, CotizacionHospedajeDetalleHabitacion>();
  for (const detalle of editFormState.detalles) {
    map.set(detalle.habitacionTipoId, detalle);
  }
  return map;
});

// Toggle tipo de habitación en edición
function toggleTipoHabitacionEdit(tipo: HotelRoomType) {
  const existe = editDetallesMap.value.has(tipo.id);
  if (existe) {
    editFormState.detalles = editFormState.detalles.filter(d => d.habitacionTipoId !== tipo.id);
  }
  else {
    editFormState.detalles.push({
      id: crypto.randomUUID(),
      habitacionTipoId: tipo.id,
      cantidad: 1,
      precioPorNoche: tipo.precioPorNoche,
      ocupacionMaxima: tipo.ocupacionMaxima,
    });
  }
}

// Actualizar cantidad en edición respetando el máximo del hotel
function actualizarCantidadEdit(tipoId: string, cantidad: number) {
  const detalle = editFormState.detalles.find(d => d.habitacionTipoId === tipoId);
  if (!detalle || cantidad <= 0)
    return;
  const tipo = tiposHabitacionEdit.value.find(t => t.id === tipoId);
  detalle.cantidad = tipo ? Math.min(cantidad, tipo.cantidadHabitaciones) : cantidad;
}

// Obtener nombre del hotel
function getNombreHotel(providerId: string): string {
  return providerStore.getProviderById(providerId)?.nombre ?? 'Desconocido';
}

// Obtener desglose de habitaciones como string
function getDesgloseHabitaciones(hospedaje: CotizacionHospedaje): string {
  return hospedaje.detalles
    .map(d => `${d.cantidad} hab (${d.ocupacionMaxima} p)`)
    .join(' + ');
}

// Acciones por fila
function getRowActions(hospedaje: CotizacionHospedaje) {
  return [
    [
      {
        label: 'Editar',
        icon: 'i-lucide-pencil',
        onSelect: () => abrirEdicion(hospedaje),
      },
    ],
    [
      {
        label: 'Eliminar',
        icon: 'i-lucide-trash-2',
        color: 'error' as const,
        onSelect: () => eliminarHospedaje(hospedaje.id),
      },
    ],
  ];
}

// Columnas de la tabla
const columns = computed<TableColumn<CotizacionHospedaje>[]>(() => {
  const cols: TableColumn<CotizacionHospedaje>[] = [
    {
      accessorKey: 'providerId',
      header: 'Hotel',
      cell: ({ row }) => h('span', { class: 'font-medium' }, getNombreHotel(row.original.providerId)),
    },
    {
      accessorKey: 'cantidadNoches',
      header: 'Noches',
      cell: ({ row }) => h('span', { class: 'font-medium' }, String(row.original.cantidadNoches)),
    },
    {
      id: 'habitaciones',
      header: 'Habitaciones',
      cell: ({ row }) => h('span', { class: 'text-xs text-muted' }, getDesgloseHabitaciones(row.original)),
    },
    {
      accessorKey: 'costoTotal',
      header: 'Costo Total',
      cell: ({ row }) => h('span', { class: 'font-bold text-primary' }, `$${row.original.costoTotal.toFixed(2)}`),
    },
  ];

  if (!props.readonly) {
    cols.push({
      id: 'actions',
      header: '',
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
function abrirEdicion(hospedaje: CotizacionHospedaje) {
  editingHospedaje.value = hospedaje;
  editFormState.cantidadNoches = hospedaje.cantidadNoches;
  editFormState.detalles = hospedaje.detalles.map(d => ({ ...d }));
  isEditModalOpen.value = true;
}

// Guardar edición
function guardarEdicion() {
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

  const updated = cotizacionStore.updateHospedajeCotizacion(editingHospedaje.value.id, {
    cantidadNoches: editFormState.cantidadNoches,
    detalles: editFormState.detalles,
    costoTotal: editFormState.detalles.reduce((sum, d) => {
      return sum + (d.precioPorNoche * editFormState.cantidadNoches * d.cantidad);
    }, 0),
  } as Partial<CotizacionHospedajeFormData>);

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
function eliminarHospedaje(id: string) {
  cotizacionStore.deleteHospedajeCotizacion(id);
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
              v-model.number="editFormState.cantidadNoches"
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
                      {{ tipo.ocupacionMaxima }} personas
                    </p>
                    <p class="text-sm">
                      {{ formatBedConfiguration(getCamasDetalle(editingHospedaje.providerId, tipo.id)) }}
                    </p>
                    <p class="text-xs text-muted">
                      ${{ tipo.precioPorNoche.toFixed(2) }}/noche
                    </p>
                  </div>
                </div>

                <!-- Controles de cantidad si está seleccionado -->
                <div v-if="editDetallesMap.has(tipo.id)" class="ml-8 space-y-2 border-l-2 border-primary pl-4">
                  <div class="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <label class="text-xs text-muted">Cantidad (máx. {{ tipo.cantidadHabitaciones }})</label>
                      <UInput
                        :model-value="editDetallesMap.get(tipo.id)?.cantidad ?? 1"
                        type="number"
                        min="1"
                        :max="tipo.cantidadHabitaciones"
                        size="sm"
                        @update:model-value="(v) => actualizarCantidadEdit(tipo.id, Number(v))"
                      />
                    </div>
                    <div>
                      <label class="text-xs text-muted">Costo/Persona</label>
                      <div class="text-sm font-medium py-2">
                        ${{ (tipo.precioPorNoche / tipo.ocupacionMaxima).toFixed(2) }}
                      </div>
                    </div>
                  </div>

                  <div class="text-xs bg-muted/20 rounded px-2 py-1">
                    ${{ tipo.precioPorNoche.toFixed(2) }} × {{ editFormState.cantidadNoches }} noches × {{ editDetallesMap.get(tipo.id)?.cantidad ?? 1 }} hab =
                    <span class="font-semibold">${{ (tipo.precioPorNoche * editFormState.cantidadNoches * (editDetallesMap.get(tipo.id)?.cantidad ?? 1)).toFixed(2) }}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Costo total -->
          <div v-if="editFormState.detalles.length > 0" class="bg-primary/10 rounded-lg p-4 border border-primary/20">
            <div class="flex justify-between items-center">
              <span class="font-semibold">Costo Total</span>
              <span class="text-lg font-bold">
                ${{ editFormState.detalles.reduce((sum, d) => sum + (d.precioPorNoche * editFormState.cantidadNoches * d.cantidad), 0).toFixed(2) }}
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
  </div>
</template>

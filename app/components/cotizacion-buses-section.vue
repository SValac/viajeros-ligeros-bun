<script setup lang="ts">
import type { TableColumn } from '@nuxt/ui';

import { h } from 'vue';

import type { CotizacionBus, CotizacionBusEstado } from '~/types/cotizacion';

type Props = {
  cotizacionId: string;
  readonly?: boolean;
};

type Emits = {
  (e: 'agregarBus'): void;
};

const props = withDefaults(defineProps<Props>(), {
  readonly: false,
});

defineEmits<Emits>();

const cotizacionStore = useCotizacionStore();
const providerStore = useProviderStore();
const toast = useToast();

const buses = computed(() => cotizacionStore.getBusesByCotizacion(props.cotizacionId));

// Modal edición
const isEditModalOpen = ref(false);
const editingBus = ref<CotizacionBus | null>(null);
const editFormState = reactive({
  numeroUnidad: '',
  capacidad: 44,
  estado: 'apartado' as CotizacionBusEstado,
  notas: '',
});

function getNombreProveedor(proveedorId: string): string {
  return providerStore.getProviderById(proveedorId)?.nombre ?? 'Desconocido';
}

const estadoBadge: Record<CotizacionBusEstado, { label: string; color: 'success' | 'info' | 'warning' }> = {
  confirmado: { label: 'Confirmado', color: 'success' },
  apartado: { label: 'Apartado', color: 'info' },
  pendiente: { label: 'Pendiente', color: 'warning' },
};

const estadoOptions = [
  { label: 'Apartado', value: 'apartado' },
  { label: 'Confirmado', value: 'confirmado' },
  { label: 'Pendiente', value: 'pendiente' },
];

function getRowActions(bus: CotizacionBus) {
  return [
    [
      {
        label: 'Editar',
        icon: 'i-lucide-pencil',
        onSelect: () => abrirEdicion(bus),
      },
    ],
    [
      {
        label: 'Eliminar',
        icon: 'i-lucide-trash-2',
        color: 'error' as const,
        onSelect: () => eliminarBus(bus.id),
      },
    ],
  ];
}

const columns = computed<TableColumn<CotizacionBus>[]>(() => {
  const cols: TableColumn<CotizacionBus>[] = [
    {
      accessorKey: 'proveedorId',
      header: 'Agencia',
      cell: ({ row }) => h('span', { class: 'font-medium' }, getNombreProveedor(row.original.proveedorId)),
    },
    {
      accessorKey: 'numeroUnidad',
      header: 'Número de Unidad',
      cell: ({ row }) => h('span', { class: 'font-mono font-medium' }, row.original.numeroUnidad),
    },
    {
      accessorKey: 'capacidad',
      header: 'Capacidad',
      cell: ({ row }) => h('span', {}, `${row.original.capacidad} asientos`),
    },
    {
      accessorKey: 'estado',
      header: 'Estado',
      cell: ({ row }) => {
        const badge = estadoBadge[row.original.estado];
        return h(resolveComponent('UBadge'), {
          label: badge.label,
          color: badge.color,
          variant: 'subtle',
          size: 'xs',
        });
      },
    },
    {
      accessorKey: 'notas',
      header: 'Notas',
      cell: ({ row }) => h('span', { class: 'text-muted text-sm' }, row.original.notas ?? '—'),
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

function abrirEdicion(bus: CotizacionBus) {
  editingBus.value = bus;
  editFormState.numeroUnidad = bus.numeroUnidad;
  editFormState.capacidad = bus.capacidad;
  editFormState.estado = bus.estado;
  editFormState.notas = bus.notas ?? '';
  isEditModalOpen.value = true;
}

function guardarEdicion() {
  if (!editingBus.value)
    return;

  if (!editFormState.numeroUnidad.trim()) {
    toast.add({ title: 'Error', description: 'El número de unidad es requerido', color: 'error' });
    return;
  }
  if (editFormState.capacidad <= 0) {
    toast.add({ title: 'Error', description: 'La capacidad debe ser mayor a 0', color: 'error' });
    return;
  }

  const updated = cotizacionStore.updateBusCotizacion(editingBus.value.id, {
    numeroUnidad: editFormState.numeroUnidad.trim(),
    capacidad: editFormState.capacidad,
    estado: editFormState.estado,
    notas: editFormState.notas || undefined,
  });

  if (!updated) {
    toast.add({ title: 'Error', description: 'No se pudo actualizar el autobús', color: 'error' });
    return;
  }

  toast.add({ title: 'Autobús actualizado', color: 'success' });
  isEditModalOpen.value = false;
  editingBus.value = null;
}

function eliminarBus(id: string) {
  cotizacionStore.deleteBusCotizacion(id);
  toast.add({ title: 'Autobús eliminado', color: 'success' });
}
</script>

<template>
  <UCard>
    <template #header>
      <div class="flex items-center justify-between w-full">
        <h2 class="font-semibold flex items-center gap-2">
          <span class="i-lucide-bus w-5 h-5 text-muted" />
          Autobuses Apartados
        </h2>
        <UButton
          v-if="!readonly"
          icon="i-lucide-plus"
          size="xs"
          label="Agregar Autobús"
          @click="$emit('agregarBus')"
        />
      </div>
    </template>

    <!-- Tabla -->
    <UTable
      v-if="buses.length > 0"
      :data="buses"
      :columns="columns"
    />

    <!-- Empty state -->
    <div v-else class="text-center py-8 text-muted">
      <span class="i-lucide-inbox w-8 h-8 mx-auto mb-2 block opacity-50" />
      <p class="text-sm">
        No hay autobuses apartados
      </p>
    </div>

    <!-- Modal edición -->
    <UModal
      v-model:open="isEditModalOpen"
      title="Editar Autobús"
      class="sm:max-w-md"
    >
      <template #body>
        <div v-if="editingBus" class="space-y-4">
          <div>
            <label class="text-sm font-medium block mb-2">Agencia</label>
            <div class="bg-muted/20 rounded px-4 py-2 text-sm">
              {{ getNombreProveedor(editingBus.proveedorId) }}
            </div>
          </div>

          <UFormField label="Número de Unidad" required>
            <UInput
              v-model="editFormState.numeroUnidad"
              placeholder="Ej. BUS-001"
            />
          </UFormField>

          <UFormField label="Capacidad (asientos)" required>
            <UInput
              v-model.number="editFormState.capacidad"
              type="number"
              min="1"
              placeholder="Ej. 44"
            />
          </UFormField>

          <UFormField label="Estado">
            <USelect
              v-model="editFormState.estado"
              :items="estadoOptions"
            />
          </UFormField>

          <UFormField label="Notas">
            <UTextarea
              v-model="editFormState.notas"
              placeholder="Observaciones..."
              :rows="2"
            />
          </UFormField>

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
  </UCard>
</template>

<script setup lang="ts">
import type { DropdownMenuItem, TableColumn } from '@nuxt/ui';

import { h } from 'vue';

import type { Bus, BusFormData } from '~/types/bus';

import { useActionToast } from '~/composables/use-action-toast';
import { useFormModal } from '~/composables/use-form-modal';
import { actionsColumn, deleteAction } from '~/utils/actions-column';
import { pluralize } from '~/utils/pluralize';

type Props = {
  providerId: string;
};

const props = defineProps<Props>();

const busStore = useBusStore();
const { runWithToast } = useActionToast();
const confirmDelete = useConfirmDelete();

const { isOpen: isFormModalOpen, editing: editingBus, openNew: openCreateModal, openEdit: openEditModal, close: closeModal } = useFormModal<Bus>();

const buses = computed(() => busStore.getAllBusesByProvider(props.providerId));

async function handleFormSubmit(data: BusFormData) {
  const editing = editingBus.value;
  if (await runWithToast(() => (editing ? busStore.updateBus(editing.id, data) : busStore.addBus(data)), {
    success: { title: editing ? 'Unidad actualizada' : 'Unidad registrada', color: 'primary' },
    error: 'Error',
    errorFallback: 'No se pudo guardar la unidad',
  })) {
    closeModal();
  }
}

async function handleDelete(bus: Bus) {
  const label = [bus.brand, bus.model].filter(Boolean).join(' ') || 'esta unidad';

  if (await confirmDelete({
    title: 'Eliminar unidad',
    description: `¿Estás seguro de eliminar ${label}?`,
  })) {
    await runWithToast(() => busStore.deleteBus(bus.id), {
      success: { title: 'Unidad eliminada', color: 'warning' },
      error: 'Error',
      errorFallback: 'No se pudo eliminar la unidad',
    });
  }
}

async function handleToggleStatus(bus: Bus) {
  await runWithToast(() => busStore.toggleBusStatus(bus.id), {
    success: {
      title: 'Estado actualizado',
      description: `La unidad ahora está ${!bus.active ? 'activa' : 'inactiva'}`,
      color: 'primary',
    },
    error: 'Error',
    errorFallback: 'No se pudo cambiar el estado de la unidad',
  });
}

function getRowActions(bus: Bus): DropdownMenuItem[][] {
  return [
    [
      {
        label: 'Editar',
        icon: 'i-lucide-pencil',
        onSelect: () => openEditModal(bus),
      },
      {
        label: bus.active ? 'Desactivar' : 'Activar',
        icon: bus.active ? 'i-lucide-eye-off' : 'i-lucide-eye',
        onSelect: () => handleToggleStatus(bus),
      },
    ],
    [
      deleteAction(() => handleDelete(bus)),
    ],
  ];
}

const columns: TableColumn<Bus>[] = [
  {
    accessorKey: 'brand',
    header: 'Marca',
    cell: ({ row }) => {
      const val = row.getValue('brand') as string | undefined;
      return val ? h('span', { class: 'font-medium' }, val) : h('span', { class: 'text-sm text-muted' }, '-');
    },
  },
  {
    accessorKey: 'model',
    header: 'Modelo',
    cell: ({ row }) => {
      const val = row.getValue('model') as string | undefined;
      return val ? h('span', { class: 'text-sm' }, val) : h('span', { class: 'text-sm text-muted' }, '-');
    },
  },
  {
    accessorKey: 'year',
    header: 'Año',
    cell: ({ row }) => {
      const val = row.getValue('year') as number | undefined;
      return val ? h('span', { class: 'text-sm' }, String(val)) : h('span', { class: 'text-sm text-muted' }, '-');
    },
  },
  {
    accessorKey: 'active',
    header: 'Estatus',
    cell: ({ row }) => row.original.active
      ? h('span', { class: 'text-sm' }, 'Activa')
      : h('span', { class: 'text-sm text-muted' }, 'Inactiva'),
  },
  {
    accessorKey: 'seatCount',
    header: 'Asientos',
    cell: ({ row }) => {
      const val = row.getValue('seatCount') as number;
      return h('div', { class: 'flex items-center gap-1' }, [
        h(resolveComponent('UIcon'), { name: 'i-lucide-users', class: 'w-3 h-3 text-muted' }),
        h('span', { class: 'text-sm' }, String(val)),
      ]);
    },
  },
  actionsColumn(getRowActions),
];
</script>

<template>
  <UCard>
    <div class="space-y-4">
      <!-- Header -->
      <div class="flex items-center justify-between">
        <div>
          <h3 class="text-lg font-semibold">
            Unidades registradas
          </h3>
          <p class="text-sm text-muted">
            {{ pluralize(buses.length, 'unidad activa', 'unidades activas') }}
          </p>
        </div>
        <UButton
          icon="i-lucide-plus"
          size="sm"
          @click="openCreateModal"
        >
          Nueva Unidad
        </UButton>
      </div>

      <LoadState
        :is-loaded="busStore.isLoaded"
        :load-error="busStore.loadError"
        label="las unidades"
        @retry="busStore.refetch()"
      >
        <!-- Empty state -->
        <EmptyState
          v-if="buses.length === 0"
          section="busUnits"
          :actions="[{ label: 'Agregar unidad', icon: 'i-lucide-plus', onClick: openCreateModal }]"
        />

        <!-- Table -->
        <UTable
          v-else
          :columns="columns"
          :data="buses"
        />
      </LoadState>
    </div>

    <!-- Modal -->
    <UModal
      v-model:open="isFormModalOpen"
      :title="editingBus ? 'Editar Unidad' : 'Nueva Unidad'"
      class="sm:max-w-lg"
    >
      <template #body>
        <BusForm
          :bus="editingBus"
          :provider-id="providerId"
          @submit="handleFormSubmit"
          @cancel="closeModal"
        />
      </template>
    </UModal>
  </UCard>
</template>

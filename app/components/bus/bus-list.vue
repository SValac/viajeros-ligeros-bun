<script setup lang="ts">
import type { DropdownMenuItem, TableColumn } from '@nuxt/ui';

import { h } from 'vue';

import type { Bus, BusFormData } from '~/types/bus';

import { useFormModal } from '~/composables/use-form-modal';
import { actionsColumn } from '~/utils/actions-column';
import { pluralize } from '~/utils/pluralize';

type Props = {
  providerId: string;
};

const props = defineProps<Props>();

const busStore = useBusStore();
const toast = useToast();
const confirmDelete = useConfirmDelete();

const { isOpen: isFormModalOpen, editing: editingBus, openNew: openCreateModal, openEdit: openEditModal, close: closeModal } = useFormModal<Bus>();

const buses = computed(() => busStore.getBusesByProvider(props.providerId));

async function handleFormSubmit(data: BusFormData) {
  try {
    if (editingBus.value) {
      const success = await busStore.updateBus(editingBus.value.id, data);
      if (success) {
        toast.add({ title: 'Unidad actualizada', color: 'primary' });
        closeModal();
      }
      else {
        toast.add({ title: 'Error', description: busStore.error ?? 'No se pudo guardar la unidad', color: 'error' });
      }
    }
    else {
      await busStore.addBus(data);
      toast.add({ title: 'Unidad registrada', color: 'primary' });
      closeModal();
    }
  }
  catch {
    toast.add({ title: 'Error', description: 'No se pudo guardar la unidad', color: 'error' });
  }
}

async function handleDelete(bus: Bus) {
  const label = [bus.brand, bus.model].filter(Boolean).join(' ') || 'esta unidad';

  if (await confirmDelete({
    title: 'Eliminar unidad',
    description: `¿Estás seguro de eliminar ${label}?`,
  })) {
    const success = await busStore.deleteBus(bus.id);
    if (success) {
      toast.add({ title: 'Unidad eliminada', color: 'warning' });
    }
    else {
      toast.add({ title: 'Error', description: busStore.error ?? 'No se pudo eliminar la unidad', color: 'error' });
    }
  }
}

async function handleToggleStatus(bus: Bus) {
  const success = await busStore.toggleBusStatus(bus.id);
  if (success) {
    toast.add({
      title: 'Estado actualizado',
      description: `La unidad ahora está ${!bus.active ? 'activa' : 'inactiva'}`,
      color: 'primary',
    });
  }
  else {
    toast.add({ title: 'Error', description: busStore.error ?? 'No se pudo cambiar el estado de la unidad', color: 'error' });
  }
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
      {
        label: 'Eliminar',
        icon: 'i-lucide-trash-2',
        color: 'error',
        onSelect: () => handleDelete(bus),
      },
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
          section="buses"
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

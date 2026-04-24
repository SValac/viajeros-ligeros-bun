<script setup lang="ts">
import type { TableColumn } from '@nuxt/ui';

import { h } from 'vue';

import type { Bus, BusFormData } from '~/types/bus';

type Props = {
  providerId: string;
};

const props = defineProps<Props>();

const busStore = useBusStore();
const toast = useToast();

const isFormModalOpen = shallowRef(false);
const editingBus = shallowRef<Bus | null>(null);

const buses = computed(() => busStore.getBusesByProvider(props.providerId));

function openCreateModal() {
  editingBus.value = null;
  isFormModalOpen.value = true;
}

function openEditModal(bus: Bus) {
  editingBus.value = bus;
  isFormModalOpen.value = true;
}

function closeModal() {
  isFormModalOpen.value = false;
  editingBus.value = null;
}

function handleFormSubmit(data: BusFormData) {
  try {
    if (editingBus.value) {
      const success = busStore.updateBus(editingBus.value.id, data);
      if (success) {
        toast.add({ title: 'Unidad actualizada', color: 'primary' });
        closeModal();
      }
    }
    else {
      busStore.addBus(data);
      toast.add({ title: 'Unidad registrada', color: 'primary' });
      closeModal();
    }
  }
  catch {
    toast.add({ title: 'Error', description: 'No se pudo guardar la unidad', color: 'error' });
  }
}

function handleDelete(bus: Bus) {
  const label = [bus.brand, bus.model].filter(Boolean).join(' ') || 'esta unidad';
  // eslint-disable-next-line no-alert
  if (confirm(`¿Eliminar ${label}?`)) {
    const success = busStore.deleteBus(bus.id);
    if (success) {
      toast.add({ title: 'Unidad eliminada', color: 'warning' });
    }
  }
}

function handleToggleStatus(bus: Bus) {
  const success = busStore.toggleBusStatus(bus.id);
  if (success) {
    toast.add({
      title: 'Estado actualizado',
      description: `La unidad ahora está ${!bus.active ? 'activa' : 'inactiva'}`,
      color: 'primary',
    });
  }
}

function getRowActions(bus: Bus) {
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
        h('span', { class: 'i-lucide-users w-3 h-3 text-muted' }),
        h('span', { class: 'text-sm' }, String(val)),
      ]);
    },
  },
  {
    accessorKey: 'rentalPrice',
    header: 'Precio de renta',
    cell: ({ row }) => {
      const val = row.getValue('rentalPrice') as number;
      const formatted = val.toLocaleString('es-MX', { style: 'currency', currency: 'MXN' });
      return h('span', { class: 'text-sm font-medium' }, formatted);
    },
  },
  {
    id: 'actions',
    header: 'Acciones',
    cell: ({ row }) => {
      return h(resolveComponent('UDropdownMenu'), {
        items: getRowActions(row.original),
      }, () => h(resolveComponent('UButton'), {
        color: 'neutral',
        variant: 'ghost',
        icon: 'i-lucide-more-vertical',
      }));
    },
  },
];
</script>

<template>
  <div class="space-y-4">
    <!-- Header -->
    <div class="flex items-center justify-between">
      <div>
        <h3 class="text-lg font-semibold">
          Unidades registradas
        </h3>
        <p class="text-sm text-muted">
          {{ buses.length }} unidad{{ buses.length !== 1 ? 'es' : '' }} activa{{ buses.length !== 1 ? 's' : '' }}
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

    <!-- Estado vacío -->
    <div
      v-if="buses.length === 0"
      class="text-center py-8 bg-elevated rounded-lg"
    >
      <span class="i-lucide-bus w-12 h-12 text-muted mx-auto mb-3 block" />
      <h4 class="font-medium mb-1">
        No hay unidades registradas
      </h4>
      <p class="text-sm text-muted mb-4">
        Agrega la primera unidad de este proveedor
      </p>
      <UButton
        icon="i-lucide-plus"
        variant="outline"
        size="sm"
        @click="openCreateModal"
      >
        Agregar Unidad
      </UButton>
    </div>

    <!-- Tabla -->
    <UTable
      v-else
      :columns="columns"
      :data="buses"
    />

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
  </div>
</template>

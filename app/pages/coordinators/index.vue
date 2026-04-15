<script setup lang="ts">
import type { TableColumn } from '@nuxt/ui';

import { h } from 'vue';

import type { Coordinator, CoordinatorFormData } from '~/types/coordinator';

definePageMeta({
  name: 'coordinators-index',
});

const coordinatorStore = useCoordinatorStore();
const toast = useToast();

const isFormModalOpen = ref(false);
const editingCoordinator = ref<Coordinator | null>(null);
const searchTerm = ref('');

const coordinators = computed(() => {
  const term = searchTerm.value.toLowerCase();
  if (!term)
    return coordinatorStore.allCoordinators;
  return coordinatorStore.allCoordinators.filter(
    c =>
      c.nombre.toLowerCase().includes(term)
      || c.email.toLowerCase().includes(term)
      || c.telefono.includes(term),
  );
});

function openCreateModal() {
  editingCoordinator.value = null;
  isFormModalOpen.value = true;
}

function openEditModal(coordinator: Coordinator) {
  editingCoordinator.value = coordinator;
  isFormModalOpen.value = true;
}

function closeModal() {
  isFormModalOpen.value = false;
  editingCoordinator.value = null;
}

function handleFormSubmit(data: CoordinatorFormData) {
  try {
    if (editingCoordinator.value) {
      coordinatorStore.updateCoordinator(editingCoordinator.value.id, data);
      toast.add({ title: 'Coordinador actualizado', description: `${data.nombre} se actualizó correctamente`, color: 'primary' });
    }
    else {
      coordinatorStore.addCoordinator(data);
      toast.add({ title: 'Coordinador creado', description: `${data.nombre} se creó correctamente`, color: 'primary' });
    }
    closeModal();
  }
  catch {
    toast.add({ title: 'Error', description: 'Ocurrió un error al guardar el coordinador', color: 'error' });
  }
}

function handleDelete(coordinator: Coordinator) {
  // eslint-disable-next-line no-alert
  if (confirm(`¿Estás seguro de eliminar a ${coordinator.nombre}?`)) {
    coordinatorStore.deleteCoordinator(coordinator.id);
    toast.add({ title: 'Coordinador eliminado', description: `${coordinator.nombre} se eliminó correctamente`, color: 'warning' });
  }
}

function getRowActions(coordinator: Coordinator) {
  return [
    [
      {
        label: 'Editar',
        icon: 'i-lucide-pencil',
        onSelect: () => openEditModal(coordinator),
      },
    ],
    [
      {
        label: 'Eliminar',
        icon: 'i-lucide-trash-2',
        onSelect: () => handleDelete(coordinator),
      },
    ],
  ];
}

const columns: TableColumn<Coordinator>[] = [
  {
    accessorKey: 'nombre',
    header: 'Nombre',
    cell: ({ row }) =>
      h('div', { class: 'flex items-center gap-2' }, [
        h('span', { class: 'i-lucide-user-star w-4 h-4 text-gray-400' }),
        h('span', { class: 'font-medium' }, row.getValue('nombre')),
      ]),
  },
  {
    accessorKey: 'edad',
    header: 'Edad',
    cell: ({ row }) =>
      h('span', { class: 'text-sm' }, `${row.getValue('edad')} años`),
  },
  {
    accessorKey: 'telefono',
    header: 'Teléfono',
    cell: ({ row }) =>
      h('span', { class: 'text-sm' }, row.getValue('telefono')),
  },
  {
    accessorKey: 'email',
    header: 'Email',
    cell: ({ row }) =>
      h('span', { class: 'text-sm' }, row.getValue('email')),
  },
  {
    accessorKey: 'notas',
    header: 'Notas',
    cell: ({ row }) => {
      const notas = row.getValue('notas') as string | undefined;
      if (!notas)
        return h('span', { class: 'text-sm text-gray-400' }, '-');
      return h('span', { class: 'text-sm text-gray-600 dark:text-gray-300 line-clamp-1' }, notas);
    },
  },
  {
    id: 'actions',
    header: 'Acciones',
    cell: ({ row }) =>
      h(resolveComponent('UDropdownMenu'), {
        items: getRowActions(row.original),
      }, () => h(resolveComponent('UButton'), {
        color: 'neutral',
        variant: 'ghost',
        icon: 'i-lucide-more-vertical',
      })),
  },
];
</script>

<template>
  <div class="space-y-6">
    <div class="flex justify-between items-center">
      <div class="flex items-center gap-4">
        <UIcon name="i-lucide-user-star" class="w-10 h-10 text-violet-500" />
        <div>
          <h1 class="text-3xl font-bold text-gray-900 dark:text-white">
            Coordinadores
          </h1>
          <p class="text-gray-500 dark:text-gray-400 mt-1">
            {{ coordinatorStore.allCoordinators.length }} coordinador{{ coordinatorStore.allCoordinators.length !== 1 ? 'es' : '' }} registrado{{ coordinatorStore.allCoordinators.length !== 1 ? 's' : '' }}
          </p>
        </div>
      </div>
      <UButton
        icon="i-lucide-plus"
        size="lg"
        @click="openCreateModal"
      >
        Nuevo Coordinador
      </UButton>
    </div>

    <UInput
      v-model="searchTerm"
      icon="i-lucide-search"
      placeholder="Buscar por nombre, email o teléfono..."
      class="max-w-sm"
    />

    <UCard>
      <div v-if="coordinatorStore.allCoordinators.length === 0" class="text-center py-12">
        <UIcon name="i-lucide-user-star" class="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
        <h3 class="text-lg font-medium text-gray-900 dark:text-white mb-2">
          No hay coordinadores registrados aún
        </h3>
        <p class="text-gray-500 dark:text-gray-400 mb-4">
          Comienza agregando tu primer coordinador de viaje
        </p>
        <UButton icon="i-lucide-plus" @click="openCreateModal">
          Agregar Coordinador
        </UButton>
      </div>
      <div v-else-if="coordinators.length === 0" class="text-center py-12">
        <UIcon name="i-lucide-search-x" class="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
        <h3 class="text-lg font-medium text-gray-900 dark:text-white mb-2">
          Sin resultados
        </h3>
        <p class="text-gray-500 dark:text-gray-400 mb-4">
          Intenta con otros términos de búsqueda
        </p>
        <UButton icon="i-lucide-filter-x" @click="searchTerm = ''">
          Limpiar búsqueda
        </UButton>
      </div>
      <UTable
        v-else
        :columns="columns"
        :data="coordinators"
      />
    </UCard>

    <UModal
      v-model:open="isFormModalOpen"
      :title="editingCoordinator ? 'Editar Coordinador' : 'Nuevo Coordinador'"
      :description="`Complete los campos para ${editingCoordinator ? 'editar' : 'crear'} el coordinador.`"
      class="sm:max-w-lg"
    >
      <template #body>
        <CoordinatorForm
          :coordinator="editingCoordinator"
          @submit="handleFormSubmit"
          @cancel="closeModal"
        />
      </template>
    </UModal>
  </div>
</template>

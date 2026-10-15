<script setup lang="ts">
import type { DropdownMenuItem, TableColumn } from '@nuxt/ui';

import { h } from 'vue';

import type { Coordinator, CoordinatorFormData } from '~/types/coordinator';

import { useFormModal } from '~/composables/use-form-modal';
import { pluralize } from '~/utils/pluralize';

definePageMeta({
  name: 'coordinators-index',
});

const coordinatorStore = useCoordinatorStore();
const toast = useToast();

const { isOpen: isFormModalOpen, editing: editingCoordinator, openNew: openCreateModal, openEdit: openEditModal, close: closeModal } = useFormModal<Coordinator>();
const searchTerm = ref('');

const coordinators = computed(() => {
  const term = searchTerm.value.toLowerCase();
  if (!term)
    return coordinatorStore.allCoordinators;
  // The phone is compared by digits: it's stored as E.164 and typed as shown, "(312) 127…"
  const termDigits = term.replace(/\D/g, '');
  return coordinatorStore.allCoordinators.filter(
    c =>
      c.name.toLowerCase().includes(term)
      || c.email.toLowerCase().includes(term)
      || (!!termDigits && c.phone.replace(/\D/g, '').includes(termDigits)),
  );
});

function clearSearch() {
  searchTerm.value = '';
}

async function handleFormSubmit(data: CoordinatorFormData) {
  try {
    if (editingCoordinator.value) {
      await coordinatorStore.updateCoordinator(editingCoordinator.value.id, data);
      toast.add({ title: 'Coordinador actualizado', description: `${data.name} se actualizó correctamente`, color: 'primary' });
    }
    else {
      await coordinatorStore.addCoordinator(data);
      toast.add({ title: 'Coordinador creado', description: `${data.name} se creó correctamente`, color: 'primary' });
    }
    closeModal();
  }
  catch {
    toast.add({ title: 'Error', description: 'Ocurrió un error al guardar el coordinador', color: 'error' });
  }
}

async function handleDelete(coordinator: Coordinator) {
  // eslint-disable-next-line no-alert
  if (confirm(`¿Estás seguro de eliminar a ${coordinator.name}?`)) {
    try {
      await coordinatorStore.deleteCoordinator(coordinator.id);
      toast.add({ title: 'Coordinador eliminado', description: `${coordinator.name} se eliminó correctamente`, color: 'warning' });
    }
    catch {
      toast.add({ title: 'Error', description: 'Ocurrió un error al eliminar el coordinador', color: 'error' });
    }
  }
}

function getRowActions(coordinator: Coordinator): DropdownMenuItem[][] {
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
        color: 'error',
        onSelect: () => handleDelete(coordinator),
      },
    ],
  ];
}

const columns: TableColumn<Coordinator>[] = [
  {
    accessorKey: 'name',
    header: 'Nombre',
    cell: ({ row }) =>
      h('div', { class: 'flex items-center gap-2' }, [
        h(resolveComponent('UIcon'), { name: 'i-lucide-user-cog', class: 'w-4 h-4 text-muted' }),
        h('span', { class: 'font-medium' }, row.getValue('name')),
      ]),
  },
  {
    accessorKey: 'age',
    header: 'Edad',
    cell: ({ row }) =>
      h('span', { class: 'text-sm' }, `${row.getValue('age')} años`),
  },
  {
    accessorKey: 'phone',
    header: 'Teléfono',
    cell: ({ row }) =>
      h('span', { class: 'text-sm' }, formatPhone(row.original.phone)),
  },
  {
    accessorKey: 'email',
    header: 'Email',
    cell: ({ row }) =>
      h('span', { class: 'text-sm' }, row.getValue('email')),
  },
  {
    accessorKey: 'notes',
    header: 'Notas',
    cell: ({ row }) => {
      const notes = row.getValue('notes') as string | undefined;
      if (!notes)
        return h('span', { class: 'text-sm text-gray-400' }, '-');
      return h('span', { class: 'text-sm text-gray-600 dark:text-gray-300 line-clamp-1' }, notes);
    },
  },
  {
    id: 'access',
    header: 'Acceso a la app',
    cell: ({ row }) => h(resolveComponent('CoordinatorInviteButton'), { coordinator: row.original }),
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
    <div class="flex flex-wrap justify-between items-center gap-4">
      <div class="flex items-center gap-4">
        <UIcon name="i-lucide-user-cog" class="w-10 h-10 text-violet-500" />
        <div>
          <h1 class="text-3xl font-bold text-gray-900 dark:text-white">
            Coordinadores
          </h1>
          <p class="text-gray-500 dark:text-gray-400 mt-1">
            {{ pluralize(coordinatorStore.allCoordinators.length, 'coordinador registrado', 'coordinadores registrados') }}
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
      placeholder="Buscar por name, email o teléfono..."
      class="max-w-sm"
    />

    <UCard>
      <LoadState
        :is-loaded="coordinatorStore.isLoaded"
        :load-error="coordinatorStore.loadError"
        label="los coordinadores"
        @retry="coordinatorStore.refetch()"
      >
        <EmptyState
          v-if="coordinatorStore.allCoordinators.length === 0"
          section="coordinators"
          :actions="[{ label: 'Agregar coordinador', icon: 'i-lucide-plus', onClick: openCreateModal }]"
        />
        <EmptyState
          v-else-if="coordinators.length === 0"
          section="noResults"
          :actions="[{ label: 'Limpiar búsqueda', icon: 'i-lucide-filter-x', color: 'neutral', variant: 'outline', onClick: clearSearch }]"
        />
        <UTable
          v-else
          :columns="columns"
          :data="coordinators"
        />
      </LoadState>
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

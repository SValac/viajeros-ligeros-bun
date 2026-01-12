<script setup lang="ts">
import type { TableColumn } from '@nuxt/ui';

import { h } from 'vue';

import type {
  Provider,
  ProviderCategory,
  ProviderContact,
  ProviderFormData,
} from '~/types/provider';

definePageMeta({
  name: 'providers-dashboard',
});

// Store
const providerStore = useProviderStore();
const toast = useToast();

// Estado local
const isFormModalOpen = ref(false);
const editingProvider = ref<Provider | null>(null);

// Computed
const providers = computed(() => providerStore.allProviders);
const stats = computed(() => providerStore.statsByCategory);
const total = computed(() => providerStore.totalProviders);

// Funciones auxiliares
function getCategoryColor(categoria: ProviderCategory): string {
  const colors: Record<ProviderCategory, string> = {
    'guias': 'blue',
    'transporte': 'purple',
    'hospedaje': 'green',
    'operadores-autobus': 'orange',
    'comidas': 'amber',
    'otros': 'gray',
  };
  return colors[categoria] || 'gray';
}

function getCategoryLabel(categoria: ProviderCategory): string {
  const labels: Record<ProviderCategory, string> = {
    'guias': 'Guías',
    'transporte': 'Transporte',
    'hospedaje': 'Hospedaje',
    'operadores-autobus': 'Operadores de Autobús',
    'comidas': 'Comidas',
    'otros': 'Otros',
  };
  return labels[categoria] || categoria;
}

function getCategoryIcon(categoria: ProviderCategory): string {
  const icons: Record<ProviderCategory, string> = {
    'guias': 'i-lucide-user-search',
    'transporte': 'i-lucide-car',
    'hospedaje': 'i-lucide-hotel',
    'operadores-autobus': 'i-lucide-bus',
    'comidas': 'i-lucide-utensils',
    'otros': 'i-lucide-package',
  };
  return icons[categoria] || 'i-lucide-package';
}

// Acciones del formulario
function openCreateModal() {
  editingProvider.value = null;
  isFormModalOpen.value = true;
}

function openEditModal(provider: Provider) {
  editingProvider.value = provider;
  isFormModalOpen.value = true;
}

function closeModal() {
  isFormModalOpen.value = false;
  editingProvider.value = null;
}

function handleFormSubmit(data: ProviderFormData) {
  try {
    if (editingProvider.value) {
      // Actualizar proveedor existente
      const success = providerStore.updateProvider(
        editingProvider.value.id,
        data,
      );
      if (success) {
        toast.add({
          title: 'Proveedor actualizado',
          description: `${data.nombre} se actualizó correctamente`,
          color: 'primary',
        });
        closeModal();
      }
    }
    else {
      // Crear nuevo proveedor
      providerStore.addProvider(data);
      toast.add({
        title: 'Proveedor creado',
        description: `${data.nombre} se creó correctamente`,
        color: 'primary',
      });
      closeModal();
    }
  }
  catch {
    toast.add({
      title: 'Error',
      description: 'Ocurrió un error al guardar el proveedor',
      color: 'error',
    });
  }
}

function handleDelete(provider: Provider) {
  // eslint-disable-next-line no-alert
  if (confirm(`¿Estás seguro de eliminar el proveedor ${provider.nombre}?`)) {
    const success = providerStore.deleteProvider(provider.id);
    if (success) {
      toast.add({
        title: 'Proveedor eliminado',
        description: `${provider.nombre} se eliminó correctamente`,
        color: 'warning',
      });
    }
  }
}

function handleToggleStatus(provider: Provider) {
  const success = providerStore.toggleProviderStatus(provider.id);
  if (success) {
    const newStatus = !provider.activo;
    toast.add({
      title: 'Estado actualizado',
      description: `${provider.nombre} ahora está ${newStatus ? 'activo' : 'inactivo'}`,
      color: 'primary',
    });
  }
}

// Acciones de la fila
function getRowActions(provider: Provider) {
  return [
    [
      {
        label: 'Editar',
        icon: 'i-lucide-pencil',
        click: () => openEditModal(provider),
      },
      {
        label: provider.activo ? 'Desactivar' : 'Activar',
        icon: provider.activo ? 'i-lucide-eye-off' : 'i-lucide-eye',
        click: () => handleToggleStatus(provider),
      },
    ],
    [
      {
        label: 'Eliminar',
        icon: 'i-lucide-trash-2',
        click: () => handleDelete(provider),
      },
    ],
  ];
}

// Columnas de la tabla
const columns: TableColumn<Provider>[] = [
  {
    accessorKey: 'nombre',
    header: 'Nombre',
    cell: ({ row }) => {
      return h('div', { class: 'flex items-center gap-2' }, [
        h('span', {
          class: `${getCategoryIcon(row.original.categoria)} w-4 h-4 text-gray-400`,
        }),
        h('span', { class: 'font-medium' }, row.getValue('nombre')),
      ]);
    },
  },
  {
    accessorKey: 'categoria',
    header: 'Categoría',
    cell: ({ row }) => {
      const categoria = row.getValue('categoria') as ProviderCategory;
      return h(
        resolveComponent('UBadge'),
        {
          color: getCategoryColor(categoria),
          variant: 'subtle',
        },
        () => getCategoryLabel(categoria),
      );
    },
  },
  {
    accessorKey: 'contacto',
    header: 'Contacto',
    cell: ({ row }) => {
      const contacto = row.getValue('contacto') as ProviderContact;
      const elements = [];

      if (contacto.nombre) {
        elements.push(h('div', { class: 'text-sm' }, contacto.nombre));
      }
      if (contacto.telefono) {
        elements.push(
          h('div', { class: 'text-xs text-gray-500' }, contacto.telefono),
        );
      }
      if (contacto.email) {
        elements.push(
          h('div', { class: 'text-xs text-gray-500' }, contacto.email),
        );
      }

      if (elements.length === 0) {
        elements.push(
          h('span', { class: 'text-sm text-gray-400' }, 'Sin contacto'),
        );
      }

      return h('div', { class: 'space-y-0.5' }, elements);
    },
  },
  {
    accessorKey: 'activo',
    header: 'Estado',
    cell: ({ row }) => {
      const activo = row.getValue('activo') as boolean;
      return h(
        resolveComponent('UBadge'),
        {
          color: activo ? 'green' : 'gray',
          variant: 'subtle',
        },
        () => (activo ? 'Activo' : 'Inactivo'),
      );
    },
  },
  {
    id: 'actions',
    header: 'Acciones',
    cell: ({ row }) => {
      return h(
        resolveComponent('UDropdown'),
        {
          items: getRowActions(row.original),
          popper: { placement: 'bottom-end' },
        },
        () =>
          h(resolveComponent('UButton'), {
            color: 'neutral',
            variant: 'ghost',
            icon: 'i-lucide-more-vertical',
          }),
      );
    },
  },
];

// Lifecycle
onMounted(() => {
  providerStore.loadMockData();
});
</script>

<template>
  <div class="space-y-6">
    <!-- Header -->
    <div class="flex justify-between items-center">
      <div>
        <h1 class="text-3xl font-bold text-gray-900 dark:text-white">
          Gestión de Proveedores
        </h1>
        <p class="text-gray-500 dark:text-gray-400 mt-1">
          Administra el catálogo de proveedores de servicios
        </p>
      </div>
      <UButton
        icon="i-lucide-plus"
        size="lg"
        @click="openCreateModal"
      >
        Nuevo Proveedor
      </UButton>
    </div>

    <!-- Estadísticas -->
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      <!-- Total -->
      <UCard>
        <div class="flex items-center justify-between">
          <div>
            <p class="text-sm text-gray-500 dark:text-gray-400">
              Total Proveedores
            </p>
            <p class="text-2xl font-bold text-gray-900 dark:text-white mt-1">
              {{ total }}
            </p>
          </div>
          <UIcon name="i-lucide-handshake" class="w-10 h-10 text-gray-400" />
        </div>
      </UCard>

      <!-- Guías -->
      <UCard>
        <div class="flex items-center justify-between">
          <div>
            <p class="text-sm text-gray-500 dark:text-gray-400">
              Guías
            </p>
            <p class="text-2xl font-bold text-blue-600 dark:text-blue-400 mt-1">
              {{ stats.guias }}
            </p>
          </div>
          <UIcon name="i-lucide-user-search" class="w-10 h-10 text-blue-400" />
        </div>
      </UCard>

      <!-- Transporte -->
      <UCard>
        <div class="flex items-center justify-between">
          <div>
            <p class="text-sm text-gray-500 dark:text-gray-400">
              Transporte
            </p>
            <p
              class="text-2xl font-bold text-purple-600 dark:text-purple-400 mt-1"
            >
              {{ stats.transporte }}
            </p>
          </div>
          <UIcon name="i-lucide-car" class="w-10 h-10 text-purple-400" />
        </div>
      </UCard>

      <!-- Hospedaje -->
      <UCard>
        <div class="flex items-center justify-between">
          <div>
            <p class="text-sm text-gray-500 dark:text-gray-400">
              Hospedaje
            </p>
            <p
              class="text-2xl font-bold text-green-600 dark:text-green-400 mt-1"
            >
              {{ stats.hospedaje }}
            </p>
          </div>
          <UIcon name="i-lucide-hotel" class="w-10 h-10 text-green-400" />
        </div>
      </UCard>

      <!-- Operadores de Autobús -->
      <UCard>
        <div class="flex items-center justify-between">
          <div>
            <p class="text-sm text-gray-500 dark:text-gray-400">
              Operadores
            </p>
            <p
              class="text-2xl font-bold text-orange-600 dark:text-orange-400 mt-1"
            >
              {{ stats["operadores-autobus"] }}
            </p>
          </div>
          <UIcon name="i-lucide-bus" class="w-10 h-10 text-orange-400" />
        </div>
      </UCard>

      <!-- Comidas -->
      <UCard>
        <div class="flex items-center justify-between">
          <div>
            <p class="text-sm text-gray-500 dark:text-gray-400">
              Comidas
            </p>
            <p
              class="text-2xl font-bold text-amber-600 dark:text-amber-400 mt-1"
            >
              {{ stats.comidas }}
            </p>
          </div>
          <UIcon name="i-lucide-utensils" class="w-10 h-10 text-amber-400" />
        </div>
      </UCard>
    </div>

    <!-- Tabla de proveedores -->
    <UCard>
      <div v-if="providers.length === 0" class="text-center py-12">
        <UIcon
          name="i-lucide-inbox"
          class="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4"
        />
        <h3 class="text-lg font-medium text-gray-900 dark:text-white mb-2">
          No hay proveedores aún
        </h3>
        <p class="text-gray-500 dark:text-gray-400 mb-4">
          Comienza agregando tu primer proveedor
        </p>
        <UButton icon="i-lucide-plus" @click="openCreateModal">
          Agregar Primer Proveedor
        </UButton>
      </div>
      <UTable
        v-else
        :columns="columns"
        :data="providers"
      />
    </UCard>

    <!-- Modal de formulario -->
    <UModal
      v-model:open="isFormModalOpen"
      :title="editingProvider ? 'Editar Proveedor' : 'Nuevo Proveedor'"
      class="sm:max-w-2xl"
    >
      <template #body>
        <ProviderForm
          :provider="editingProvider"
          @submit="handleFormSubmit"
          @cancel="closeModal"
        />
      </template>
    </UModal>
  </div>
</template>

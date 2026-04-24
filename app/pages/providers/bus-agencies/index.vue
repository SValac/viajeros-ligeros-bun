<script setup lang="ts">
import type { TableColumn } from '@nuxt/ui';

import { h } from 'vue';

import type { Provider, ProviderFilters, ProviderFormData, ProviderLocation } from '~/types/provider';

import { PROVIDER_CATEGORY } from '~/types/provider';

definePageMeta({
  name: 'providers-bus-agencies',
});

const router = useRouter();
const providerStore = useProviderStore();
const toast = useToast();

const isFormModalOpen = ref(false);
const editingProvider = ref<Provider | null>(null);
const localFilters = ref<ProviderFilters>({});

const categoryProviders = computed(() => providerStore.getProvidersByCategory(PROVIDER_CATEGORY.BUS_AGENCIES));

const providers = computed(() => {
  let result = [...categoryProviders.value];

  if (localFilters.value.city) {
    result = result.filter(
      p => p.location.city.toLowerCase() === localFilters.value.city!.toLowerCase(),
    );
  }
  if (localFilters.value.state) {
    result = result.filter(
      p => p.location.state.toLowerCase() === localFilters.value.state!.toLowerCase(),
    );
  }
  if (localFilters.value.searchTerm) {
    const term = localFilters.value.searchTerm.toLowerCase();
    result = result.filter(
      p =>
        p.name.toLowerCase().includes(term)
        || p.description?.toLowerCase().includes(term)
        || p.contact.name?.toLowerCase().includes(term),
    );
  }

  return result;
});

const availableCiudades = computed(() =>
  [...new Set(categoryProviders.value.map(p => p.location.city))].sort(),
);
const availableEstados = computed(() =>
  [...new Set(categoryProviders.value.map(p => p.location.state))].sort(),
);

const hasLocalFilters = computed(() =>
  Object.values(localFilters.value).some(v => v !== undefined && v !== ''),
);

function removeLocalFilter(key: keyof ProviderFilters) {
  const updated = { ...localFilters.value };
  delete updated[key];
  localFilters.value = updated;
}

function clearLocalFilters() {
  localFilters.value = {};
}

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

async function handleFormSubmit(data: ProviderFormData) {
  try {
    data.category = PROVIDER_CATEGORY.BUS_AGENCIES;

    if (editingProvider.value) {
      const success = await providerStore.updateProvider(editingProvider.value.id, data);
      if (success) {
        toast.add({ title: 'Agencia actualizada', description: `${data.name} se actualizó correctamente`, color: 'primary' });
        closeModal();
      }
    }
    else {
      await providerStore.addProvider(data);
      toast.add({ title: 'Agencia creada', description: `${data.name} se creó correctamente`, color: 'primary' });
      closeModal();
    }
  }
  catch {
    toast.add({ title: 'Error', description: 'Ocurrió un error al guardar la agencia', color: 'error' });
  }
}

async function handleDelete(provider: Provider) {
  // eslint-disable-next-line no-alert
  if (confirm(`¿Estás seguro de eliminar ${provider.name}?`)) {
    const success = await providerStore.deleteProvider(provider.id);
    if (success) {
      toast.add({ title: 'Agencia eliminada', description: `${provider.name} se eliminó correctamente`, color: 'warning' });
    }
  }
}

async function handleToggleStatus(provider: Provider) {
  const success = await providerStore.toggleProviderStatus(provider.id);
  if (success) {
    const newStatus = !provider.active;
    toast.add({
      title: 'Estado actualizado',
      description: `${provider.name} ahora está ${newStatus ? 'activo' : 'inactivo'}`,
      color: 'primary',
    });
  }
}

function getRowActions(provider: Provider) {
  return [
    [
      {
        label: 'Ver detalles',
        icon: 'i-lucide-arrow-right',
        onSelect: () => router.push(`/providers/bus-agencies/${provider.id}`),
      },
      {
        label: 'Editar',
        icon: 'i-lucide-pencil',
        onSelect: () => openEditModal(provider),
      },
      {
        label: provider.active ? 'Desactivar' : 'Activar',
        icon: provider.active ? 'i-lucide-eye-off' : 'i-lucide-eye',
        onSelect: () => handleToggleStatus(provider),
      },
    ],
    [
      {
        label: 'Eliminar',
        icon: 'i-lucide-trash-2',
        onSelect: () => handleDelete(provider),
      },
    ],
  ];
}

function formatLocation(location: ProviderLocation): string {
  return [location.city, location.state, location.country].join(', ');
}

const columns: TableColumn<Provider>[] = [
  {
    accessorKey: 'name',
    header: 'Nombre',
    cell: ({ row }) =>
      h(resolveComponent('NuxtLink'), {
        to: `/providers/bus-agencies/${row.original.id}`,
        class: 'flex items-center gap-2 hover:text-primary-500 transition-colors group',
      }, () => [
        h('span', { class: 'i-lucide-bus w-4 h-4 text-gray-400 group-hover:text-primary-400' }),
        h('span', { class: 'font-medium' }, row.getValue('nombre')),
      ]),
  },
  {
    accessorKey: 'location',
    header: 'Ubicación',
    cell: ({ row }) => {
      const location = row.getValue('location') as ProviderLocation;
      return h('div', { class: 'flex items-center gap-2' }, [
        h('span', { class: 'i-lucide-map-pin w-3 h-3 text-gray-400' }),
        h('span', { class: 'text-sm text-gray-600 dark:text-gray-300' }, formatLocation(location)),
      ]);
    },
  },
  {
    accessorKey: 'contacto.phone',
    header: 'Teléfono',
    cell: ({ row }) => {
      const telefono = row.original.contact.phone;
      if (!telefono)
        return h('span', { class: 'text-sm text-gray-400' }, '-');
      return h('span', { class: 'text-sm' }, telefono);
    },
  },
  {
    accessorKey: 'contacto.email',
    header: 'Email',
    cell: ({ row }) => {
      const email = row.original.contact.email;
      if (!email)
        return h('span', { class: 'text-sm text-gray-400' }, '-');
      return h('span', { class: 'text-sm' }, email);
    },
  },
  {
    accessorKey: 'activo',
    header: 'Estado',
    cell: ({ row }) => {
      const active = row.getValue('activo') as boolean;
      return h(resolveComponent('UBadge'), {
        variant: 'subtle',
        color: active ? 'primary' : 'warning',
      }, () => active ? 'Activo' : 'Inactivo');
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
        <UIcon name="i-lucide-bus" class="w-10 h-10 text-orange-500" />
        <div>
          <h1 class="text-3xl font-bold text-gray-900 dark:text-white">
            Agencias de Autobús
          </h1>
          <p class="text-gray-500 dark:text-gray-400 mt-1">
            {{ providers.length }} agencia{{ providers.length !== 1 ? 's' : '' }} {{ providers.length !== 1 ? 'registradas' : 'registrada' }}
          </p>
        </div>
      </div>
      <UButton
        icon="i-lucide-plus"
        size="lg"
        @click="openCreateModal"
      >
        Nueva Agencia
      </UButton>
    </div>

    <div class="space-y-2">
      <ProviderFilterBar
        v-model="localFilters"
        :available-ciudades="availableCiudades"
        :available-estados="availableEstados"
        :show-category-filter="false"
      />
      <ProviderActiveFilters
        :filters="localFilters"
        :total-count="categoryProviders.length"
        :result-count="providers.length"
        @remove-filter="removeLocalFilter"
        @clear-all="clearLocalFilters"
      />
    </div>

    <UCard>
      <div v-if="providers.length === 0" class="text-center py-12">
        <UIcon name="i-lucide-bus" class="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
        <template v-if="hasLocalFilters">
          <h3 class="text-lg font-medium text-gray-900 dark:text-white mb-2">
            Sin resultados para los filtros aplicados
          </h3>
          <p class="text-gray-500 dark:text-gray-400 mb-4">
            Intenta con otros criterios de búsqueda
          </p>
          <UButton icon="i-lucide-filter-x" @click="clearLocalFilters">
            Limpiar filtros
          </UButton>
        </template>
        <template v-else>
          <h3 class="text-lg font-medium text-gray-900 dark:text-white mb-2">
            No hay agencias de autobús registradas aún
          </h3>
          <p class="text-gray-500 dark:text-gray-400 mb-4">
            Comienza agregando tu primera agencia
          </p>
          <UButton icon="i-lucide-plus" @click="openCreateModal">
            Agregar Agencia
          </UButton>
        </template>
      </div>
      <UTable
        v-else
        :columns="columns"
        :data="providers"
      />
    </UCard>

    <UModal
      v-model:open="isFormModalOpen"
      :title="editingProvider ? 'Editar Agencia' : 'Nueva Agencia de Autobús'"
      :description="`Complete los campos para ${editingProvider ? 'editar' : 'crear'} la agencia.`"
      class="sm:max-w-2xl"
    >
      <template #body>
        <ProviderForm
          :provider="editingProvider"
          :fixed-categoria="PROVIDER_CATEGORY.BUS_AGENCIES"
          @submit="handleFormSubmit"
          @cancel="closeModal"
        />
      </template>
    </UModal>
  </div>
</template>

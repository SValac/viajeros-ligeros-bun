<script setup lang="ts">
import type { TableColumn } from '@nuxt/ui';

import { h } from 'vue';

import type { Provider, ProviderCategory, ProviderFilters, ProviderFormData, ProviderLocation } from '~/types/provider';

import { PROVIDER_CATEGORY } from '~/types/provider';

const route = useRoute();
const toast = useToast();

// Get category from route
const categoria = computed(() => route.params.category as ProviderCategory);

// Store
const providerStore = useProviderStore();

// Estado local
const isFormModalOpen = ref(false);
const editingProvider = ref<Provider | null>(null);
const selectedProviderId = shallowRef<string | undefined>(undefined);
const isRoomsManagerOpen = ref(false);
const selectedHospedajeProvider = ref<Provider | null>(null);

// Filtros locales (ubicación y búsqueda — la categoría viene de la URL)
const localFilters = ref<ProviderFilters>({});

// Proveedores de esta categoría con filtros locales aplicados
const categoryProviders = computed(() => providerStore.getProvidersByCategory(categoria.value));

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

// Opciones de filtro derivadas solo de la categoría actual
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

function openRoomsManager(provider: Provider) {
  selectedHospedajeProvider.value = provider;
  isRoomsManagerOpen.value = true;
}

function closeRoomsManager() {
  isRoomsManagerOpen.value = false;
  selectedHospedajeProvider.value = null;
}

// Reset local filters and selected provider when navigating between categories
watch(categoria, () => {
  localFilters.value = {};
  selectedProviderId.value = undefined;
  isRoomsManagerOpen.value = false;
  selectedHospedajeProvider.value = null;
});

const categoryInfo = computed(() => {
  const info: Record<ProviderCategory, { label: string; icon: string; color: string }> = {
    guides: { label: 'Guías', icon: 'i-lucide-user-search', color: 'blue' },
    transportation: { label: 'Transportes', icon: 'i-lucide-car', color: 'purple' },
    accommodation: { label: 'Hospedajes', icon: 'i-lucide-hotel', color: 'green' },
    bus_agencies: { label: 'Agencias de Autobús', icon: 'i-lucide-bus', color: 'orange' },
    food_services: { label: 'Comidas', icon: 'i-lucide-utensils', color: 'amber' },
    other: { label: 'Otros', icon: 'i-lucide-package', color: 'gray' },
  };
  return info[categoria.value] || info.other;
});

const isAgenciasAutobus = computed(() => categoria.value === PROVIDER_CATEGORY.BUS_AGENCIES);
const isHospedaje = computed(() => categoria.value === PROVIDER_CATEGORY.ACCOMMODATION);

const providerSelectOptions = computed(() =>
  providers.value.map(p => ({ value: p.id, label: p.name })),
);

// Funciones auxiliares
function formatLocation(location: ProviderLocation): string {
  const parts = [location.city, location.state, location.country];
  return parts.join(', ');
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

async function handleFormSubmit(data: ProviderFormData) {
  try {
    // Force the category to match the current page
    data.category = categoria.value;

    if (editingProvider.value) {
      const success = await providerStore.updateProvider(editingProvider.value.id, data);
      if (success) {
        toast.add({
          title: 'Proveedor actualizado',
          description: `${data.name} se actualizó correctamente`,
          color: 'primary',
        });
        closeModal();
      }
    }
    else {
      await providerStore.addProvider(data);
      toast.add({
        title: 'Proveedor creado',
        description: `${data.name} se creó correctamente`,
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

async function handleDelete(provider: Provider) {
  // eslint-disable-next-line no-alert
  if (confirm(`¿Estás seguro de eliminar el proveedor ${provider.name}?`)) {
    const success = await providerStore.deleteProvider(provider.id);
    if (success) {
      toast.add({
        title: 'Proveedor eliminado',
        description: `${provider.name} se eliminó correctamente`,
        color: 'warning',
      });
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

// Acciones de la fila
function getRowActions(provider: Provider) {
  const actions: { label: string; icon: string; onSelect: () => void }[][] = [
    [
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

  if (isHospedaje.value && actions[0]) {
    actions[0].unshift({
      label: 'Gestionar Habitaciones',
      icon: 'i-lucide-bed',
      onSelect: () => openRoomsManager(provider),
    });
  }

  return actions;
}

// Columnas de la tabla
const columns: TableColumn<Provider>[] = [
  {
    accessorKey: 'name',
    header: 'Nombre',
    cell: ({ row }) => {
      return h('div', { class: 'flex items-center gap-2' }, [
        h('span', {
          class: `${categoryInfo.value.icon} w-4 h-4 text-gray-400`,
        }),
        h('span', { class: 'font-medium' }, row.getValue('name')),
      ]);
    },
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
  ...(isHospedaje.value
    ? [{
        id: 'habitaciones',
        header: 'Habitaciones',
        cell: ({ row }: { row: { original: Provider } }) =>
          h(resolveComponent('HotelRoomsSummary'), { providerId: row.original.id }),
      }]
    : []),
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

// Set page meta
definePageMeta({
  name: 'providers-category',
});
</script>

<template>
  <div class="space-y-6">
    <!-- Header -->
    <div class="flex justify-between items-center">
      <div class="flex items-center gap-4">
        <UIcon
          :name="categoryInfo.icon"
          class="w-10 h-10"
          :class="`text-${categoryInfo.color}-500`"
        />
        <div>
          <h1 class="text-3xl font-bold text-gray-900 dark:text-white">
            {{ categoryInfo.label }}
          </h1>
          <p class="text-gray-500 dark:text-gray-400 mt-1">
            {{ providers.length }} proveedor{{ providers.length !== 1 ? 'es' : '' }} {{ providers.length !== 1 ? 'registrados' : 'registrado' }}
          </p>
        </div>
      </div>
      <UButton
        icon="i-lucide-plus"
        size="lg"
        @click="openCreateModal"
      >
        Nuevo {{ categoryInfo.label.slice(0, -1) }}
      </UButton>
    </div>

    <!-- Filtros de ubicación y búsqueda -->
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

    <!-- Tabla de proveedores -->
    <UCard>
      <div v-if="providers.length === 0" class="text-center py-12">
        <UIcon
          :name="categoryInfo.icon"
          class="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4"
        />
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
            No hay proveedores de {{ categoryInfo.label.toLowerCase() }} aún
          </h3>
          <p class="text-gray-500 dark:text-gray-400 mb-4">
            Comienza agregando tu primer proveedor de esta categoría
          </p>
          <UButton
            icon="i-lucide-plus"
            @click="openCreateModal"
          >
            Agregar Proveedor
          </UButton>
        </template>
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
      :title="editingProvider ? 'Editar' : `Nuevo` + ` ${categoryInfo.label.slice(0, -1)}`"
      :description="`Complete los campos para ${editingProvider ? 'editar' : 'crear'} el proveedor.` "
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

    <!-- Modal de gestión de habitaciones -->
    <UModal
      v-model:open="isRoomsManagerOpen"
      title="Gestión de Habitaciones"
      class="sm:max-w-4xl"
    >
      <template #body>
        <HotelRoomsManager
          v-if="selectedHospedajeProvider"
          :provider="selectedHospedajeProvider"
          @close="closeRoomsManager"
        />
      </template>
    </UModal>

    <!-- Sección Unidades: solo para agencias de autobús -->
    <UCard v-if="isAgenciasAutobus" class="mt-6">
      <template #header>
        <div class="flex items-center gap-2">
          <UIcon name="i-lucide-bus" class="w-5 h-5 text-orange-500" />
          <h2 class="font-semibold">
            Unidades por Proveedor
          </h2>
        </div>
      </template>

      <div class="space-y-4">
        <!-- Selector de proveedor -->
        <UFormField label="Seleccionar Proveedor">
          <USelect
            v-model="selectedProviderId"
            :items="providerSelectOptions"
            placeholder="Selecciona un proveedor para ver sus unidades"
          />
        </UFormField>

        <!-- Estado: sin proveedores -->
        <div v-if="providers.length === 0" class="text-center py-6">
          <p class="text-sm text-muted">
            No hay proveedores de agencias de autobús activos
          </p>
        </div>

        <!-- Estado: sin selección -->
        <div v-else-if="!selectedProviderId" class="text-center py-6 text-muted">
          <span class="i-lucide-mouse-pointer-click w-8 h-8 mx-auto mb-2 block" />
          <p class="text-sm">
            Selecciona un proveedor para ver y gestionar sus unidades
          </p>
        </div>

        <!-- Lista de buses del proveedor -->
        <BusList v-else :provider-id="selectedProviderId" />
      </div>
    </UCard>
  </div>
</template>

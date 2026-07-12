<script setup lang="ts">
import type { TableColumn } from '@nuxt/ui';

import { h } from 'vue';

import type { Provider, ProviderCategory, ProviderLocation } from '~/types/provider';

import { useProviderCategoryList } from '~/composables/providers/use-provider-category-list';
import { formatProviderLocation } from '~/composables/providers/use-provider-domain';
import { PROVIDER_CATEGORY_META } from '~/utils/provider-categories';

type Props = {
  category: ProviderCategory;
  detailRoute?: (provider: Provider) => string;
  extraColumns?: TableColumn<Provider>[];
};

const props = defineProps<Props>();

const meta = PROVIDER_CATEGORY_META[props.category];

const {
  isFormModalOpen,
  editingProvider,
  localFilters,
  categoryProviders,
  providers,
  availableCiudades,
  availableEstados,
  hasLocalFilters,
  removeLocalFilter,
  clearLocalFilters,
  openCreateModal,
  closeModal,
  handleFormSubmit,
  getRowActions,
  headerCreateButtonLabel,
  emptyStateButtonLabel,
  modalCreateTitle,
  modalEditTitle,
  modalDescription,
  countText,
  emptyStateTitle,
  emptyStateDescription,
} = useProviderCategoryList(props.category, props.detailRoute);

const nameColumn = computed<TableColumn<Provider>>(() => ({
  accessorKey: 'name',
  header: 'Nombre',
  cell: ({ row }) => {
    const icon = h('span', {
      class: [meta.icon, 'w-4 h-4', props.detailRoute ? 'text-gray-400 group-hover:text-primary-400' : 'text-gray-400'],
    });
    const label = h('span', { class: 'font-medium' }, row.getValue('name'));

    if (props.detailRoute) {
      return h(resolveComponent('NuxtLink'), {
        to: props.detailRoute(row.original),
        class: 'flex items-center gap-2 hover:text-primary-500 transition-colors group',
      }, () => [icon, label]);
    }

    return h('div', { class: 'flex items-center gap-2' }, [icon, label]);
  },
}));

const locationColumn: TableColumn<Provider> = {
  accessorKey: 'location',
  header: 'Ubicación',
  cell: ({ row }) => {
    const location = row.getValue('location') as ProviderLocation;
    return h('div', { class: 'flex items-center gap-2' }, [
      h('span', { class: 'i-lucide-map-pin w-3 h-3 text-gray-400' }),
      h('span', { class: 'text-sm text-gray-600 dark:text-gray-300' }, formatProviderLocation(location)),
    ]);
  },
};

const phoneColumn: TableColumn<Provider> = {
  id: 'phone',
  header: 'Teléfono',
  cell: ({ row }) => {
    const telefono = row.original.contact.phone;
    if (!telefono)
      return h('span', { class: 'text-sm text-gray-400' }, '-');
    return h('span', { class: 'text-sm' }, telefono);
  },
};

const emailColumn: TableColumn<Provider> = {
  id: 'email',
  header: 'Email',
  cell: ({ row }) => {
    const email = row.original.contact.email;
    if (!email)
      return h('span', { class: 'text-sm text-gray-400' }, '-');
    return h('span', { class: 'text-sm' }, email);
  },
};

const actionsColumn: TableColumn<Provider> = {
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
};

const columns = computed<TableColumn<Provider>[]>(() => [
  nameColumn.value,
  locationColumn,
  phoneColumn,
  emailColumn,
  ...(props.extraColumns ?? []),
  actionsColumn,
]);
</script>

<template>
  <div class="space-y-6">
    <div class="flex justify-between items-center">
      <div class="flex items-center gap-4">
        <UIcon
          :name="meta.icon"
          class="w-10 h-10"
          :class="meta.iconColorClass"
        />
        <div>
          <h1 class="text-3xl font-bold text-gray-900 dark:text-white">
            {{ meta.label }}
          </h1>
          <p class="text-gray-500 dark:text-gray-400 mt-1">
            {{ countText }}
          </p>
        </div>
      </div>
      <UButton
        icon="i-lucide-plus"
        size="lg"
        @click="openCreateModal"
      >
        {{ headerCreateButtonLabel }}
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
        <UIcon :name="meta.icon" class="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
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
            {{ emptyStateTitle }}
          </h3>
          <p class="text-gray-500 dark:text-gray-400 mb-4">
            {{ emptyStateDescription }}
          </p>
          <UButton icon="i-lucide-plus" @click="openCreateModal">
            {{ emptyStateButtonLabel }}
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
      :title="editingProvider ? modalEditTitle : modalCreateTitle"
      :description="modalDescription"
      :dismissible="false"
      class="sm:max-w-2xl"
    >
      <template #body>
        <ProviderForm
          :provider="editingProvider"
          :fixed-categoria="category"
          @submit="handleFormSubmit"
          @cancel="closeModal"
        />
      </template>
    </UModal>
  </div>
</template>

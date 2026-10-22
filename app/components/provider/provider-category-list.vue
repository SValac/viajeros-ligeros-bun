<script setup lang="ts">
import type { TableColumn } from '@nuxt/ui';

import { h } from 'vue';

import type { Provider, ProviderCategory, ProviderLocation } from '~/types/provider';

import { useProviderCategoryList } from '~/composables/providers/use-provider-category-list';
import { formatProviderLocation } from '~/composables/providers/use-provider-domain';
import { actionsColumn } from '~/utils/actions-column';
import { PROVIDER_CATEGORY_META } from '~/utils/provider-categories';

type Props = {
  category: ProviderCategory;
  detailRoute?: (provider: Provider) => string;
  extraColumns?: TableColumn<Provider>[];
  createRoute?: string;
};

const props = defineProps<Props>();

const meta = PROVIDER_CATEGORY_META[props.category];
const providerStore = useProviderStore();

const {
  isFormModalOpen,
  editingProvider,
  localFilters,
  categoryProviders,
  providers,
  availableCities,
  availableStates,
  hasLocalFilters,
  removeLocalFilter,
  clearLocalFilters,
  openCreateModal,
  closeModal,
  handleFormSubmit,
  getRowActions,
  headerCreateButtonLabel,
  modalCreateTitle,
  modalEditTitle,
  modalDescription,
  countText,
} = useProviderCategoryList(props.category, props.detailRoute);

function handleCreateClick() {
  if (!props.createRoute)
    openCreateModal();
}

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
      h(resolveComponent('UIcon'), { name: 'i-lucide-map-pin', class: 'w-3 h-3 text-muted' }),
      h('span', { class: 'text-sm text-gray-600 dark:text-gray-300' }, formatProviderLocation(location)),
    ]);
  },
};

const phoneColumn: TableColumn<Provider> = {
  id: 'phone',
  header: 'Teléfono',
  cell: ({ row }) => {
    const phone = row.original.contact.phone;
    if (!phone)
      return h('span', { class: 'text-sm text-gray-400' }, '-');
    return h('span', { class: 'text-sm' }, formatPhone(phone));
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

const columns = computed<TableColumn<Provider>[]>(() => [
  nameColumn.value,
  locationColumn,
  phoneColumn,
  emailColumn,
  ...(props.extraColumns ?? []),
  actionsColumn(getRowActions),
]);
</script>

<template>
  <div class="space-y-6">
    <PageHeader
      :title="meta.label"
      :description="countText"
      :icon="meta.icon"
      :icon-class="meta.iconColorClass"
    >
      <template #actions>
        <UButton
          icon="i-lucide-plus"
          size="lg"
          :to="createRoute"
          @click="handleCreateClick"
        >
          {{ headerCreateButtonLabel }}
        </UButton>
      </template>
    </PageHeader>

    <div class="space-y-2">
      <ProviderFilterBar
        v-model="localFilters"
        :available-cities="availableCities"
        :available-states="availableStates"
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
      <LoadState
        :is-loaded="providerStore.isLoaded"
        :load-error="providerStore.loadError"
        label="los proveedores"
        @retry="providerStore.refetch()"
      >
        <template v-if="providers.length === 0">
          <EmptyState
            v-if="hasLocalFilters"
            section="noResults"
            :actions="[{ label: 'Limpiar filtros', icon: 'i-lucide-filter-x', color: 'neutral', variant: 'outline', onClick: clearLocalFilters }]"
          />
          <EmptyState
            v-else
            section="providers"
            :actions="[{ label: 'Agregar proveedor', icon: 'i-lucide-plus', to: createRoute, onClick: handleCreateClick }]"
          />
        </template>
        <UTable
          v-else
          :columns="columns"
          :data="providers"
        />
      </LoadState>
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
          :fixed-category="category"
          @submit="handleFormSubmit"
          @cancel="closeModal"
        />
      </template>
    </UModal>
  </div>
</template>

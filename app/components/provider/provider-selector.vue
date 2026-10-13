<script setup lang="ts">
import type { ProviderCategory, ProviderFormData } from '~/types/provider';

import { matchesProviderSearch } from '~/composables/providers/use-provider-domain';
import { PROVIDER_CATEGORY_LIST, PROVIDER_CATEGORY_META } from '~/utils/provider-categories';

type Props = {
  modelValue?: string;
  excludeCategories?: ProviderCategory[];
};

const { modelValue, excludeCategories = [] } = defineProps<Props>();

const emit = defineEmits<{
  'update:modelValue': [value: string | undefined];
}>();

// Store
const providerStore = useProviderStore();
const toast = useToast();

// Local state
const isAddModalOpen = ref(false);
const selectedCategory = ref<ProviderCategory | undefined>(undefined);
const selectedProviderId = ref(modelValue);
const searchTerm = shallowRef('');

// Category options
const allCategoryOptions = PROVIDER_CATEGORY_LIST.map(meta => ({ value: meta.category, label: meta.label, icon: meta.icon }));

const categoryOptions = computed(() =>
  excludeCategories.length
    ? allCategoryOptions.filter(opt => !excludeCategories.includes(opt.value as ProviderCategory))
    : allCategoryOptions,
);

// Computed - Available providers filtered by category
const availableProviders = computed(() => {
  if (!selectedCategory.value) {
    return [];
  }

  return providerStore.activeProviders.filter(
    p => p.category === selectedCategory.value,
  );
});

// Options for the provider select. The label includes the contact to tell similar
// providers apart. The search is the same as in the provider pages
// (name, description, location or contact, ignoring accents).
const providerOptions = computed(() => {
  return availableProviders.value
    .filter(provider => matchesProviderSearch(provider, searchTerm.value))
    .map((provider) => {
      const { city, state } = provider.location;
      const contactName = provider.contact.name;
      return {
        value: provider.id,
        label: contactName ? `${provider.name} - ${contactName}` : provider.name,
        description: [city, state].filter(Boolean).join(', ') || undefined,
        icon: PROVIDER_CATEGORY_META[provider.category].icon,
      };
    });
});

// Handlers
function handleCategoryChange(value: string | null | undefined) {
  selectedCategory.value = (value as ProviderCategory) || undefined;

  // Clear the selected provider when the category changes
  if (selectedProviderId.value) {
    selectedProviderId.value = undefined;
    emit('update:modelValue', undefined);
  }
}

function handleProviderChange(value: string | null | undefined) {
  const newValue = value || undefined;
  selectedProviderId.value = newValue;
  emit('update:modelValue', newValue);
}

function openAddModal() {
  isAddModalOpen.value = true;
}

async function handleProviderSubmit(data: ProviderFormData) {
  // If a category is selected, force it
  if (selectedCategory.value) {
    data.category = selectedCategory.value;
  }

  const newProvider = await providerStore.addProvider(data);

  toast.add({
    title: 'Proveedor creado',
    description: `${data.name} se creó correctamente`,
    color: 'primary',
  });

  // Automatically select the new provider
  selectedProviderId.value = newProvider.id;
  emit('update:modelValue', newProvider.id);

  isAddModalOpen.value = false;
}

// Watch to sync with the external prop
watch(() => modelValue, (newValue) => {
  selectedProviderId.value = newValue;
});

// Category of the selected provider. It watches the catalog, not just the mount:
// providers load on demand and can arrive later.
watch(
  () => (modelValue ? providerStore.getProviderById(modelValue)?.category : undefined),
  (category) => {
    if (category)
      selectedCategory.value = category;
  },
  { immediate: true },
);
</script>

<template>
  <div class="space-y-3">
    <!-- Category select -->
    <div class="flex gap-2 items-center">
      <div class="flex-1">
        <USelect
          :model-value="selectedCategory"
          :items="categoryOptions"
          placeholder="1. Seleccionar categoría del servicio"
          clearable
          class="w-full"
          @update:model-value="handleCategoryChange"
        />
      </div>
    </div>

    <!-- Provider select (only shown when a category is selected) -->
    <div v-if="selectedCategory" class="flex gap-2 items-center">
      <div class="flex-1 min-w-0">
        <USelectMenu
          v-model:search-term="searchTerm"
          :model-value="selectedProviderId"
          :items="providerOptions"
          value-key="value"
          ignore-filter
          :search-input="{ placeholder: 'Buscar por nombre, ubicación o contacto...' }"
          :placeholder="availableProviders.length > 0 ? '2. Seleccionar proveedor' : 'No hay proveedores en esta categoría'"
          :disabled="availableProviders.length === 0"
          clearable
          class="w-full"
          @update:model-value="handleProviderChange"
        >
          <template #empty>
            Ningún proveedor coincide
          </template>
        </USelectMenu>
      </div>

      <!-- Button to add a new provider -->
      <UButton
        icon="i-lucide-plus"
        variant="outline"
        color="neutral"
        @click="openAddModal"
      />
    </div>

    <!-- Info message when no category is selected -->
    <div v-else class="text-xs text-muted">
      Primero selecciona la categoría del servicio
    </div>

    <!-- Modal to add a provider -->
    <UModal
      v-model:open="isAddModalOpen"
      title="Nuevo Proveedor"
      description="Agregar un nuevo proveedor al catálogo"
      class="sm:max-w-2xl"
    >
      <template #body>
        <ProviderForm
          @submit="handleProviderSubmit"
          @cancel="isAddModalOpen = false"
        />
      </template>
    </UModal>
  </div>
</template>

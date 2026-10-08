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

// Estado local
const isAddModalOpen = ref(false);
const selectedCategory = ref<ProviderCategory | undefined>(undefined);
const selectedProviderId = ref(modelValue);
const searchTerm = shallowRef('');

// Opciones de categoría
const allCategoryOptions = PROVIDER_CATEGORY_LIST.map(meta => ({ value: meta.category, label: meta.label, icon: meta.icon }));

const categoryOptions = computed(() =>
  excludeCategories.length
    ? allCategoryOptions.filter(opt => !excludeCategories.includes(opt.value as ProviderCategory))
    : allCategoryOptions,
);

// Computed - Proveedores disponibles filtrados por categoría
const availableProviders = computed(() => {
  if (!selectedCategory.value) {
    return [];
  }

  return providerStore.activeProviders.filter(
    p => p.category === selectedCategory.value,
  );
});

// Opciones para el select de proveedores. La etiqueta lleva el contacto para distinguir
// proveedores parecidos. La búsqueda es la misma que en las páginas de proveedores
// (nombre, descripción, ubicación o contacto, sin importar acentos).
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

  // Limpiar proveedor seleccionado al cambiar categoría
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
  // Si hay categoría seleccionada, forzarla
  if (selectedCategory.value) {
    data.category = selectedCategory.value;
  }

  const newProvider = await providerStore.addProvider(data);

  toast.add({
    title: 'Proveedor creado',
    description: `${data.name} se creó correctamente`,
    color: 'primary',
  });

  // Seleccionar automáticamente el nuevo proveedor
  selectedProviderId.value = newProvider.id;
  emit('update:modelValue', newProvider.id);

  isAddModalOpen.value = false;
}

// Watch para sincronizar con prop externa
watch(() => modelValue, (newValue) => {
  selectedProviderId.value = newValue;

  // Si hay un proveedor seleccionado, cargar su categoría
  if (newValue) {
    const provider = providerStore.getProviderById(newValue);
    if (provider) {
      selectedCategory.value = provider.category;
    }
  }
});

// Cargar datos mock y detectar categoría inicial
onMounted(() => {
  // Si hay un proveedor inicial, cargar su categoría
  if (modelValue) {
    const provider = providerStore.getProviderById(modelValue);
    if (provider) {
      selectedCategory.value = provider.category;
    }
  }
});
</script>

<template>
  <div class="space-y-3">
    <!-- Select de categoría -->
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

    <!-- Select de proveedor (solo se muestra si hay categoría seleccionada) -->
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

      <!-- Botón para agregar nuevo proveedor -->
      <UButton
        icon="i-lucide-plus"
        variant="outline"
        color="neutral"
        @click="openAddModal"
      />
    </div>

    <!-- Mensaje informativo cuando no hay categoría seleccionada -->
    <div v-else class="text-xs text-muted">
      Primero selecciona la categoría del servicio
    </div>

    <!-- Modal para agregar proveedor -->
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

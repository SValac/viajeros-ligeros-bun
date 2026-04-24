<script setup lang="ts">
import type { ProviderCategory, ProviderFormData } from '~/types/provider';

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

// Opciones de categoría
const allCategoryOptions = [
  { value: 'guides', label: 'Guías', icon: 'i-lucide-user-search' },
  { value: 'transportation', label: 'Transporte', icon: 'i-lucide-car' },
  { value: 'accommodation', label: 'Hospedaje', icon: 'i-lucide-hotel' },
  { value: 'bus_agencies', label: 'Agencias de Autobús', icon: 'i-lucide-bus' },
  { value: 'food_services', label: 'Comidas', icon: 'i-lucide-utensils' },
  { value: 'other', label: 'Otros', icon: 'i-lucide-package' },
];

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

// Opciones para el select de proveedores
const providerOptions = computed(() => {
  return availableProviders.value.map(provider => ({
    value: provider.id,
    label: provider.name,
    icon: getCategoryIcon(provider.category),
  }));
});

// Función auxiliar para obtener icono de categoría
function getCategoryIcon(category: ProviderCategory): string {
  const icons: Record<ProviderCategory, string> = {
    guides: 'i-lucide-user-search',
    transportation: 'i-lucide-car',
    accommodation: 'i-lucide-hotel',
    bus_agencies: 'i-lucide-bus',
    food_services: 'i-lucide-utensils',
    other: 'i-lucide-package',
  };
  return icons[category] || 'i-lucide-package';
}

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
          @update:model-value="handleCategoryChange"
        />
      </div>
    </div>

    <!-- Select de proveedor (solo se muestra si hay categoría seleccionada) -->
    <div v-if="selectedCategory" class="flex gap-2 items-center">
      <div class="flex-1">
        <USelect
          :model-value="selectedProviderId"
          :items="providerOptions"
          :placeholder="availableProviders.length > 0 ? '2. Seleccionar proveedor' : 'No hay proveedores en esta categoría'"
          :disabled="availableProviders.length === 0"
          clearable
          @update:model-value="handleProviderChange"
        />
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

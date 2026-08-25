<script setup lang="ts">
import type { ProviderFormData } from '~/types/provider';

import { PROVIDER_CATEGORY } from '~/types/provider';

definePageMeta({
  name: 'providers-accommodation-detail',
});

const route = useRoute();
const router = useRouter();
const providerStore = useProviderStore();
const toast = useToast();

const provider = computed(() => providerStore.getProviderById(route.params.id as string));

const isEditingProvider = ref(false);

function startEditing() {
  isEditingProvider.value = true;
}

function cancelEditing() {
  isEditingProvider.value = false;
}

// Redirect if provider not found or not hospedaje
watchEffect(() => {
  if (provider.value === undefined) {
    router.replace('/providers/accommodation');
  }
  else if (provider.value.category !== PROVIDER_CATEGORY.ACCOMMODATION) {
    router.replace('/providers/accommodation');
  }
});

async function handleFormSubmit(data: ProviderFormData) {
  if (!provider.value)
    return;

  try {
    data.category = PROVIDER_CATEGORY.ACCOMMODATION;
    const success = await providerStore.updateProvider(provider.value.id, data);
    if (success) {
      toast.add({ title: 'Hospedaje actualizado', description: `${data.name} se actualizó correctamente`, color: 'primary' });
      isEditingProvider.value = false;
    }
  }
  catch {
    toast.add({ title: 'Error', description: 'Ocurrió un error al guardar el proveedor', color: 'error' });
  }
}

async function handleToggleStatus() {
  if (!provider.value)
    return;
  await providerStore.toggleProviderStatus(provider.value.id);
  toast.add({
    title: 'Estado actualizado',
    description: `${provider.value.name} ahora está ${!provider.value.active ? 'activo' : 'inactivo'}`,
    color: 'primary',
  });
}

async function handleDelete() {
  if (!provider.value)
    return;
  // eslint-disable-next-line no-alert
  if (confirm(`¿Estás seguro de eliminar ${provider.value.name}?`)) {
    await providerStore.deleteProvider(provider.value.id);
    toast.add({ title: 'Hospedaje eliminado', color: 'warning' });
    router.push('/providers/accommodation');
  }
}
</script>

<template>
  <div v-if="provider" class="space-y-6">
    <!-- Header con breadcrumb -->
    <div class="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
      <NuxtLink to="/providers/accommodation" class="hover:text-gray-700 dark:hover:text-gray-200 transition-colors">
        Hospedajes
      </NuxtLink>
      <span class="i-lucide-chevron-right w-4 h-4" />
      <span class="text-gray-900 dark:text-white font-medium">{{ provider.name }}</span>
    </div>

    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
      <!-- Detalles del hospedaje -->
      <UCard>
        <div class="flex flex-wrap justify-between items-start gap-4">
          <div class="flex items-start gap-4">
            <div class="p-3 bg-green-50 dark:bg-green-900/20 rounded-xl">
              <UIcon name="i-lucide-hotel" class="w-8 h-8 text-green-500" />
            </div>
            <div class="space-y-1">
              <div class="flex items-center gap-2">
                <h1 class="text-2xl font-bold text-gray-900 dark:text-white">
                  {{ provider.name }}
                </h1>
                <UBadge
                  :color="provider.active ? 'success' : 'neutral'"
                  variant="subtle"
                  size="sm"
                >
                  {{ provider.active ? 'Activo' : 'Inactivo' }}
                </UBadge>
              </div>
            </div>
          </div>

          <!-- Acciones -->
          <div class="flex items-center gap-2">
            <UButton
              v-if="!isEditingProvider"
              icon="i-lucide-pencil"
              variant="outline"
              color="neutral"
              @click="startEditing"
            >
              Editar
            </UButton>
            <UDropdownMenu
              :items="[
                [
                  {
                    label: provider.active ? 'Desactivar' : 'Activar',
                    icon: provider.active ? 'i-lucide-eye-off' : 'i-lucide-eye',
                    onSelect: handleToggleStatus,
                  },
                ],
                [
                  {
                    label: 'Eliminar',
                    icon: 'i-lucide-trash-2',
                    color: 'error',
                    onSelect: handleDelete,
                  },
                ],
              ]"
            >
              <UButton
                icon="i-lucide-more-vertical"
                variant="ghost"
                color="neutral"
              />
            </UDropdownMenu>
          </div>
        </div>

        <USeparator class="my-4" />

        <ProviderForm
          :key="`${provider.id}-${isEditingProvider}`"
          :provider="provider"
          :fixed-categoria="PROVIDER_CATEGORY.ACCOMMODATION"
          :disabled="!isEditingProvider"
          @submit="handleFormSubmit"
          @cancel="cancelEditing"
        />
      </UCard>

      <!-- Gestión de habitaciones -->
      <HotelRoomsManager
        :provider="provider"
        @close="router.push('/providers/accommodation')"
      />
    </div>
  </div>
</template>

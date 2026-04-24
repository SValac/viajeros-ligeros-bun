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

const isEditModalOpen = ref(false);

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
      isEditModalOpen.value = false;
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

    <!-- Info del hotel -->
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
            <div class="flex items-center gap-1 text-sm text-gray-500 dark:text-gray-400">
              <span class="i-lucide-map-pin w-3.5 h-3.5" />
              <span>{{ [provider.location.city, provider.location.state, provider.location.country].join(', ') }}</span>
            </div>
            <p v-if="provider.description" class="text-sm text-gray-600 dark:text-gray-300 mt-1">
              {{ provider.description }}
            </p>
          </div>
        </div>

        <!-- Acciones -->
        <div class="flex items-center gap-2">
          <UButton
            icon="i-lucide-pencil"
            variant="outline"
            color="neutral"
            @click="isEditModalOpen = true"
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

      <!-- Contacto -->
      <USeparator class="my-4" />
      <div class="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
        <div v-if="provider.contact.name">
          <p class="text-gray-400 dark:text-gray-500 text-xs mb-0.5">
            Contacto
          </p>
          <p class="text-gray-700 dark:text-gray-200 font-medium">
            {{ provider.contact.name }}
          </p>
        </div>
        <div v-if="provider.contact.phone">
          <p class="text-gray-400 dark:text-gray-500 text-xs mb-0.5">
            Teléfono
          </p>
          <p class="text-gray-700 dark:text-gray-200">
            {{ provider.contact.phone }}
          </p>
        </div>
        <div v-if="provider.contact.email">
          <p class="text-gray-400 dark:text-gray-500 text-xs mb-0.5">
            Email
          </p>
          <p class="text-gray-700 dark:text-gray-200">
            {{ provider.contact.email }}
          </p>
        </div>
      </div>
    </UCard>

    <!-- Gestión de habitaciones inline -->
    <HotelRoomsManager
      :provider="provider"
      @close="router.push('/providers/accommodation')"
    />

    <!-- Modal de edición -->
    <UModal
      v-model:open="isEditModalOpen"
      title="Editar Hospedaje"
      description="Complete los campos para editar el proveedor."
      class="sm:max-w-2xl"
    >
      <template #body>
        <ProviderForm
          :provider="provider"
          @submit="handleFormSubmit"
          @cancel="isEditModalOpen = false"
        />
      </template>
    </UModal>
  </div>
</template>

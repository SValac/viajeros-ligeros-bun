<script setup lang="ts">
import type { Provider, ProviderFormData } from '~/types/provider';

import { PROVIDER_CATEGORY_META } from '~/utils/provider-categories';

type Props = {
  provider: Provider;
};

const props = defineProps<Props>();

const router = useRouter();
const providerStore = useProviderStore();
const toast = useToast();

const meta = computed(() => PROVIDER_CATEGORY_META[props.provider.category]);

const isEditingProvider = ref(false);

function startEditing() {
  isEditingProvider.value = true;
}

function cancelEditing() {
  isEditingProvider.value = false;
}

async function handleFormSubmit(data: ProviderFormData) {
  try {
    data.category = props.provider.category;
    const success = await providerStore.updateProvider(props.provider.id, data);
    if (success) {
      toast.add({ title: 'Proveedor actualizado', description: `${data.name} se actualizó correctamente`, color: 'primary' });
      isEditingProvider.value = false;
    }
  }
  catch {
    toast.add({ title: 'Error', description: 'Ocurrió un error al guardar el proveedor', color: 'error' });
  }
}

async function handleToggleStatus() {
  await providerStore.toggleProviderStatus(props.provider.id);
  toast.add({
    title: 'Estado actualizado',
    description: `${props.provider.name} ahora está ${!props.provider.active ? 'activo' : 'inactivo'}`,
    color: 'primary',
  });
}

async function handleDelete() {
  // eslint-disable-next-line no-alert
  if (confirm(`¿Estás seguro de eliminar ${props.provider.name}?`)) {
    await providerStore.deleteProvider(props.provider.id);
    toast.add({ title: 'Proveedor eliminado', color: 'warning' });
    router.push(meta.value.route);
  }
}
</script>

<template>
  <UCard>
    <div class="flex flex-wrap justify-between items-start gap-4">
      <div class="flex items-start gap-4">
        <div class="p-3 rounded-xl" :class="meta.iconBgClass">
          <UIcon
            :name="meta.icon"
            class="w-8 h-8"
            :class="meta.iconColorClass"
          />
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
      :fixed-categoria="provider.category"
      :disabled="!isEditingProvider"
      @submit="handleFormSubmit"
      @cancel="cancelEditing"
    />
  </UCard>
</template>

<script setup lang="ts">
import type { Provider, ProviderFormData } from '~/types/provider';

import { useActionToast } from '~/composables/use-action-toast';
import { deleteAction } from '~/utils/actions-column';
import { PROVIDER_CATEGORY_META } from '~/utils/provider-categories';

type Props = {
  provider: Provider;
};

const props = defineProps<Props>();

const router = useRouter();
const providerStore = useProviderStore();
const { runWithToast } = useActionToast();
const confirmDelete = useConfirmDelete();

const meta = computed(() => PROVIDER_CATEGORY_META[props.provider.category]);

const isEditingProvider = ref(false);

function startEditing() {
  isEditingProvider.value = true;
}

function cancelEditing() {
  isEditingProvider.value = false;
}

async function handleFormSubmit(data: ProviderFormData) {
  data.category = props.provider.category;
  if (await runWithToast(() => providerStore.updateProvider(props.provider.id, data), {
    success: { title: 'Proveedor actualizado', description: `${data.name} se actualizó correctamente`, color: 'primary' },
    error: 'Error',
    errorFallback: 'Ocurrió un error al guardar el proveedor',
  })) {
    isEditingProvider.value = false;
  }
}

async function handleToggleStatus() {
  // Read before the toggle: the catalog refetch flips `active` on the prop.
  const nowActive = !props.provider.active;
  await runWithToast(() => providerStore.toggleProviderStatus(props.provider.id), {
    success: {
      title: 'Estado actualizado',
      description: `${props.provider.name} ahora está ${nowActive ? 'activo' : 'inactivo'}`,
      color: 'primary',
    },
    error: 'Error',
    errorFallback: 'No se pudo cambiar el estado del proveedor',
  });
}

async function handleDelete() {
  if (await confirmDelete({
    title: 'Eliminar proveedor',
    description: `¿Estás seguro de eliminar ${props.provider.name}?`,
  })) {
    if (await runWithToast(() => providerStore.deleteProvider(props.provider.id), {
      success: { title: 'Proveedor eliminado', color: 'warning' },
      error: 'Error',
      errorFallback: 'No se pudo eliminar el proveedor',
    })) {
      router.push(meta.value.route);
    }
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

      <!-- Actions -->
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
              deleteAction(handleDelete),
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
      :fixed-category="provider.category"
      :disabled="!isEditingProvider"
      @submit="handleFormSubmit"
      @cancel="cancelEditing"
    />
  </UCard>
</template>

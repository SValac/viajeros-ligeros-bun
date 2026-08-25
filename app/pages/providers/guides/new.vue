<script setup lang="ts">
import type { ProviderFormData } from '~/types/provider';

import { PROVIDER_CATEGORY } from '~/types/provider';

definePageMeta({
  name: 'providers-guides-new',
});

const router = useRouter();
const providerStore = useProviderStore();
const toast = useToast();

async function handleSubmit(data: ProviderFormData) {
  try {
    const provider = await providerStore.addProvider(data);
    toast.add({ title: 'Guía creado', description: `${provider.name} se creó correctamente`, color: 'primary' });
    router.push(`/providers/guides/${provider.id}`);
  }
  catch {
    toast.add({ title: 'Error', description: 'Ocurrió un error al crear el guía', color: 'error' });
  }
}

function handleCancel() {
  router.push('/providers/guides');
}
</script>

<template>
  <div class="max-w-3xl mx-auto space-y-6">
    <!-- Header -->
    <div class="flex items-center gap-3">
      <UButton
        icon="i-lucide-arrow-left"
        variant="ghost"
        color="neutral"
        size="sm"
        to="/providers/guides"
      />
      <div>
        <h1 class="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">
          Nuevo Guía
        </h1>
        <p class="text-sm text-gray-500 dark:text-gray-400">
          Completa la información del proveedor
        </p>
      </div>
    </div>

    <!-- Formulario -->
    <UCard>
      <ProviderForm
        :fixed-categoria="PROVIDER_CATEGORY.GUIDES"
        @submit="handleSubmit"
        @cancel="handleCancel"
      />
    </UCard>
  </div>
</template>

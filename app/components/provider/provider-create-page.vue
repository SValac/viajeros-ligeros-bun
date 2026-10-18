<script setup lang="ts">
import type { ProviderCategory, ProviderFormData } from '~/types/provider';

import { PROVIDER_CATEGORY_META } from '~/utils/provider-categories';

// Body of every /providers/<category>/new page: header with back button, ProviderForm with
// the category fixed, and by default create → toast → go to the new provider's detail.
type Props = {
  category: ProviderCategory;
  /** Text under the title */
  description?: string;
  /** Replaces the default create flow (accommodation also saves its rooms) */
  submit?: (data: ProviderFormData) => Promise<void>;
};

const { category, description = 'Completa la información del proveedor', submit } = defineProps<Props>();
const router = useRouter();
const providerStore = useProviderStore();
const toast = useToast();

const title = computed(() => PROVIDER_CATEGORY_META[category].newTitle);
const createdTitle = computed(() => PROVIDER_CATEGORY_META[category].createdTitle);
const route = computed(() => PROVIDER_CATEGORY_META[category].route);

async function handleSubmit(data: ProviderFormData) {
  try {
    if (submit) {
      await submit(data);
      return;
    }

    const provider = await providerStore.addProvider(data);
    toast.add({ title: createdTitle.value, description: `${provider.name} se creó correctamente`, color: 'primary' });
    router.push(`${route.value}/${provider.id}`);
  }
  catch {
    toast.add({ title: 'Error', description: 'Ocurrió un error al crear el proveedor', color: 'error' });
  }
}

function handleCancel() {
  router.push(route.value);
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
        :to="route"
      />
      <div>
        <h1 class="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">
          {{ title }}
        </h1>
        <p class="text-sm text-gray-500 dark:text-gray-400">
          {{ description }}
        </p>
      </div>
    </div>

    <!-- Form -->
    <UCard>
      <ProviderForm
        :fixed-category="category"
        @submit="handleSubmit"
        @cancel="handleCancel"
      >
        <template
          v-if="$slots['extra-fields']"
          #extra-fields
        >
          <slot name="extra-fields" />
        </template>
      </ProviderForm>
    </UCard>
  </div>
</template>

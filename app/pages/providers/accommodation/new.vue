<script setup lang="ts">
import type { ProviderFormData } from '~/types/provider';

import { PROVIDER_CATEGORY } from '~/types/provider';

definePageMeta({
  name: 'providers-accommodation-new',
});

const router = useRouter();
const providerStore = useProviderStore();
const hotelRoomStore = useHotelRoomStore();
const toast = useToast();

const totalRooms = ref(1);

async function handleSubmit(data: ProviderFormData) {
  if (!totalRooms.value || totalRooms.value < 1) {
    toast.add({ title: 'Error', description: 'La cantidad de habitaciones debe ser al menos 1', color: 'error' });
    return;
  }

  try {
    const provider = await providerStore.addProvider(data);
    await hotelRoomStore.initRoomData(provider.id, totalRooms.value);

    toast.add({ title: 'Hospedaje creado', description: `${provider.name} se creó correctamente`, color: 'primary' });
    router.push(`/providers/accommodation/${provider.id}`);
  }
  catch {
    toast.add({ title: 'Error', description: 'Ocurrió un error al crear el proveedor', color: 'error' });
  }
}

function handleCancel() {
  router.push('/providers/accommodation');
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
        to="/providers/accommodation"
      />
      <div>
        <h1 class="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">
          Nuevo Hospedaje
        </h1>
        <p class="text-sm text-gray-500 dark:text-gray-400">
          Completa la información del hospedaje y su cantidad de habitaciones
        </p>
      </div>
    </div>

    <!-- Formulario -->
    <UCard>
      <ProviderForm
        :fixed-categoria="PROVIDER_CATEGORY.ACCOMMODATION"
        @submit="handleSubmit"
        @cancel="handleCancel"
      >
        <template #extra-fields>
          <USeparator label="Habitaciones" />
          <UFormField
            label="Cantidad de habitaciones"
            description="Número total de habitaciones del hospedaje"
            required
          >
            <UInput
              v-model.number="totalRooms"
              type="number"
              :min="1"
              placeholder="Ej. 20"
            />
          </UFormField>
        </template>
      </ProviderForm>
    </UCard>
  </div>
</template>

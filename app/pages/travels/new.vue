<script setup lang="ts">
import type { TravelFormData } from '~/types/travel';

import { useTravelMediaRepository } from '~/composables/travels/use-travel-media-repository';

const router = useRouter();
const travelsStore = useTravelsStore();
const toast = useToast();
const { uploadBanner } = useTravelMediaRepository();

// Handlers
async function handleSubmit(data: TravelFormData, bannerFile: File | null) {
  let newTravel;
  try {
    newTravel = await travelsStore.addTravel(data);
  }
  catch {
    toast.add({
      title: 'Error al crear el viaje',
      description: travelsStore.error ?? 'No se pudo crear el viaje',
      color: 'error',
      icon: 'i-lucide-alert-circle',
    });
    return;
  }

  if (bannerFile) {
    const imageUrl = await uploadBanner(newTravel.id, bannerFile);
    await travelsStore.updateTravel(newTravel.id, { imageUrl });
  }

  toast.add({
    title: 'Viaje creado',
    description: 'Ahora arma su itinerario; los servicios y la galería están en sus pestañas.',
    color: 'success',
    icon: 'i-lucide-check-circle',
  });

  // The itinerary is no longer part of the form: continue in the new travel's tab
  router.push({ name: 'travel-itinerary', params: { id: newTravel.id } });
}

function handleCancel() {
  router.push({ name: 'travels-dashboard' });
}
</script>

<template>
  <div class="h-full overflow-auto">
    <div class="max-w-6xl mx-auto p-6 space-y-6">
      <div class="flex items-center gap-3">
        <UButton
          icon="i-lucide-arrow-left"
          variant="ghost"
          color="neutral"
          aria-label="Volver a viajes"
          :to="{ name: 'travels-dashboard' }"
        />
        <div>
          <h1 class="text-2xl font-bold">
            Nuevo viaje
          </h1>
          <p class="text-sm text-muted">
            Datos generales del viaje. El itinerario, los servicios y la galería se agregan después, en sus pestañas.
          </p>
        </div>
      </div>

      <TravelForm
        @submit="handleSubmit"
        @cancel="handleCancel"
      />
    </div>
  </div>
</template>

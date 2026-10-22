<script setup lang="ts">
import type { TravelFormData } from '~/types/travel';

import { useTravelMediaRepository } from '~/composables/travels/use-travel-media-repository';
import { toErrorMessage } from '~/utils/error-message';

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
  catch (e) {
    toast.add({
      title: 'Error al crear el viaje',
      description: toErrorMessage(e, 'No se pudo crear el viaje'),
      color: 'error',
      icon: 'i-lucide-alert-circle',
    });
    return;
  }

  // The travel exists: a banner that fails to save doesn't stop it, it can be set from Editar.
  if (bannerFile) {
    try {
      const imageUrl = await uploadBanner(newTravel.id, bannerFile);
      await travelsStore.updateTravel(newTravel.id, { imageUrl });
    }
    catch {
      toast.add({
        title: 'Viaje creado sin portada',
        description: 'No se pudo guardar la imagen de portada. Súbela de nuevo desde Editar.',
        color: 'warning',
        icon: 'i-lucide-triangle-alert',
      });
    }
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
      <PageHeader
        title="Nuevo viaje"
        description="Datos generales del viaje. El itinerario, los servicios y la galería se agregan después, en sus pestañas."
        :to="{ name: 'travels-dashboard' }"
        back-label="Volver a viajes"
      />

      <TravelForm
        @submit="handleSubmit"
        @cancel="handleCancel"
      />
    </div>
  </div>
</template>

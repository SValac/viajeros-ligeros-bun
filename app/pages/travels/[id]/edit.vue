<script setup lang="ts">
import type { TravelFormData } from '~/types/travel';

import { getGalleryStoragePath } from '~/composables/travels/use-travel-domain';
import { useTravelMediaRepository } from '~/composables/travels/use-travel-media-repository';
import { useTravelRoute } from '~/composables/travels/use-travel-route';

// General data only (name, dates, coordinators, status, public site, banner, notes). The
// itinerary, services and gallery are edited in their own tabs. The "not found" redirect
// lives in the parent page (app/pages/travels/[id].vue).
definePageMeta({
  name: 'travel-edit',
});

const router = useRouter();
const travelsStore = useTravelsStore();
const travelerStore = useTravelerStore();
const cotizacionStore = useCotizacionStore();
const toast = useToast();
const { uploadBanner, removeFile } = useTravelMediaRepository();

const { travelId, travel } = useTravelRoute();

function goToSummary() {
  router.push({ name: 'travel-detail', params: { id: travelId.value } });
}

function sameIds(a: string[], b: string[]): boolean {
  return a.length === b.length && a.every(id => b.includes(id));
}

async function handleSubmit(data: TravelFormData, bannerFile: File | null) {
  const previousBannerUrl = travel.value?.imageUrl;
  const previousCoordinatorIds = [...(travel.value?.coordinatorIds ?? [])];

  if (bannerFile) {
    data.imageUrl = await uploadBanner(travelId.value, bannerFile);
  }

  // The form carries buses, itinerary and services forward only to satisfy the TravelFormData
  // type; each has its own editor. Forwarding them would make updateTravel() replace those
  // lists with the copy the form had when it opened. For buses that also unassigns every
  // traveler's bus/seat (ON DELETE SET NULL on travelers.travel_bus_id).
  const { buses: _buses, itinerary: _itinerary, services: _services, ...updateData } = data;
  const success = await travelsStore.updateTravel(travelId.value, updateData);

  // Remove the banner file the travel no longer points to: the previous one if it was
  // replaced or removed, or the new upload if the update failed. A failure here is not an
  // error for the user; it only leaves an orphan, cleaned up when the travel is deleted.
  let unusedBannerUrl: string | undefined;
  if (success && previousBannerUrl !== data.imageUrl)
    unusedBannerUrl = previousBannerUrl;
  else if (!success && bannerFile)
    unusedBannerUrl = data.imageUrl;

  const unusedBannerPath = getGalleryStoragePath(unusedBannerUrl);
  if (unusedBannerPath)
    await removeFile(unusedBannerPath).catch(() => {});

  // Linking or unlinking a coordinator adds or drops their travelers row in the DB, and when
  // the quotation counts coordinators as passengers it changes the sellable seats too.
  if (success && !sameIds(previousCoordinatorIds, data.coordinatorIds)) {
    await Promise.all([
      travelerStore.fetchByTravel(travelId.value),
      cotizacionStore.syncSeatPriceForTravel(travelId.value),
    ]);
  }

  if (success) {
    toast.add({
      title: 'Viaje actualizado',
      description: `El viaje ${data.label} ha sido actualizado exitosamente`,
      color: 'success',
      icon: 'i-lucide-check-circle',
    });
    goToSummary();
  }
  else {
    toast.add({
      title: 'Error al actualizar',
      description: travelsStore.error ?? 'No se pudo actualizar el viaje',
      color: 'error',
      icon: 'i-lucide-alert-circle',
    });
  }
}
</script>

<template>
  <TravelForm
    v-if="travel"
    :travel="travel"
    @submit="handleSubmit"
    @cancel="goToSummary"
  />
</template>

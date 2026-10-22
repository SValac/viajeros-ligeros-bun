<script setup lang="ts">
import type { TravelFormData } from '~/types/travel';

import { getGalleryStoragePath } from '~/composables/travels/use-travel-domain';
import { useTravelMediaRepository } from '~/composables/travels/use-travel-media-repository';
import { useTravelRoute } from '~/composables/travels/use-travel-route';
import { toErrorMessage } from '~/utils/error-message';

// General data only (name, dates, coordinators, status, public site, banner, notes). The
// itinerary, services and gallery are edited in their own tabs. The "not found" redirect
// lives in the parent page (app/pages/travels/[id].vue).
definePageMeta({
  name: 'travel-edit',
});

const router = useRouter();
const travelsStore = useTravelsStore();
const quotationStore = useQuotationStore();
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
  let saveErrorMessage: string | null = null;
  try {
    await travelsStore.updateTravel(travelId.value, updateData);
  }
  catch (e) {
    saveErrorMessage = toErrorMessage(e, 'No se pudo actualizar el viaje');
  }
  const success = saveErrorMessage === null;

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

  // Linking or unlinking a coordinator adds or drops their travelers row in the DB (the store
  // already invalidated the travelers query), and when the quotation counts coordinators as
  // passengers it changes the sellable seats, so the seat price is recomputed.
  if (success && !sameIds(previousCoordinatorIds, data.coordinatorIds)) {
    try {
      await quotationStore.syncSeatPriceForTravel(travelId.value);
    }
    catch {
      toast.add({
        title: 'Precio por asiento sin recalcular',
        description: 'El viaje se guardó, pero no se pudo recalcular el precio por asiento. Guarda de nuevo los parámetros de la cotización para actualizarlo.',
        color: 'warning',
        icon: 'i-lucide-triangle-alert',
      });
    }
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
      description: saveErrorMessage ?? undefined,
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

<script setup lang="ts">
import type { DropdownMenuItem, NavigationMenuItem } from '@nuxt/ui';

import { useTravelRoute } from '~/composables/travels/use-travel-route';
import { useRedirectIfMissing } from '~/composables/use-redirect-if-missing';
import { deleteAction } from '~/utils/actions-column';
import { toErrorMessage } from '~/utils/error-message';
import { formatDateRange } from '~/utils/format-date';
import { pluralize } from '~/utils/pluralize';
import { getTravelDurationDays } from '~/utils/travel-calendar';

// Parent of the travel tabs (app/pages/travels/[id]/*). Shows the header, the
// actions and the navigation; each tab is a child route rendered in <NuxtPage />.

const route = useRoute();
const router = useRouter();
const toast = useToast();
const travelsStore = useTravelsStore();

const { travelId, travel, status, refetch, loadState } = useTravelRoute();

// The edit page renders inside this layout; no "Editar" button while on it
const isEditing = computed(() => route.name === 'travel-edit');

const isDeleteModalOpen = shallowRef(false);
const isDeleting = shallowRef(false);

// After a delete the travel is gone too: that redirect is handleDelete's.
useRedirectIfMissing({ status, data: travel }, {
  to: { name: 'travels-dashboard' },
  toast: { title: 'Viaje no encontrado', description: 'El viaje que buscas no existe' },
  active: () => !!travelId.value && !isDeleting.value,
});

const dateRange = computed(() => {
  if (!travel.value)
    return '';
  const { startDate, endDate } = travel.value;
  return `${formatDateRange(startDate, endDate)} · ${pluralize(getTravelDurationDays(travel.value), 'día')}`;
});

// To add a tab: create app/pages/travels/[id]/<name>.vue and add it here.
const tabs = computed<NavigationMenuItem[]>(() => {
  const params = { id: travelId.value };
  const count = (n: number) => (n > 0 ? String(n) : undefined);

  return [
    { label: 'Resumen', icon: 'i-lucide-layout-dashboard', to: { name: 'travel-detail', params }, exact: true },
    { label: 'Itinerario', icon: 'i-lucide-list-check', to: { name: 'travel-itinerary', params }, badge: count(travel.value?.itinerary.length ?? 0) },
    { label: 'Servicios', icon: 'i-lucide-package', to: { name: 'travel-services', params }, badge: count(travel.value?.services.length ?? 0) },
    { label: 'Galería', icon: 'i-lucide-images', to: { name: 'travel-gallery', params } },
    { label: 'Viajeros', icon: 'i-lucide-users', to: { name: 'travel-travelers', params }, badge: count(travel.value?.travelerCount ?? 0) },
    { label: 'Habitaciones', icon: 'i-lucide-bed-double', to: { name: 'travel-rooms', params } },
    { label: 'Servicios por persona', icon: 'i-lucide-ticket-check', to: { name: 'travel-optional-services', params } },
    { label: 'Autobuses', icon: 'i-lucide-bus', to: { name: 'travel-buses', params } },
    { label: 'Pagos', icon: 'i-lucide-credit-card', to: { name: 'travel-payments', params } },
  ];
});

const moreActions = computed<DropdownMenuItem[][]>(() => [[
  deleteAction(openDeleteModal, 'Eliminar viaje'),
]]);

function openDeleteModal() {
  isDeleteModalOpen.value = true;
}

function closeDeleteModal() {
  isDeleteModalOpen.value = false;
}

async function deleteTravel() {
  if (!travel.value)
    return;

  isDeleting.value = true;
  try {
    await travelsStore.deleteTravel(travel.value.id);
  }
  catch (e) {
    isDeleting.value = false;
    toast.add({
      title: 'No se pudo eliminar el viaje',
      description: toErrorMessage(e, 'Intenta de nuevo'),
      color: 'error',
    });
    return;
  }

  isDeleteModalOpen.value = false;
  toast.add({
    title: 'Viaje eliminado',
    description: 'El viaje se ha eliminado correctamente',
    color: 'success',
  });
  router.push({ name: 'travels-dashboard' });
}
</script>

<template>
  <!-- `null` = it doesn't exist: keep the spinner while useRedirectIfMissing leaves, not a blank page -->
  <LoadState
    v-bind="loadState"
    :is-loaded="!!travel"
    label="el viaje"
    fill
    @retry="refetch()"
  >
    <div v-if="travel" class="h-full overflow-auto">
      <div class="max-w-6xl mx-auto p-6 space-y-6">
        <PageHeader
          :title="travel.label"
          :description="travel.destination ? `${travel.destination} · ${dateRange}` : dateRange"
          :to="{ name: 'travels-dashboard' }"
          back-label="Volver a viajes"
        >
          <template #badge>
            <TravelStatusBadge :status="travel.status" />
          </template>
          <template #actions>
            <UButton
              icon="i-lucide-calculator"
              label="Cotización"
              variant="outline"
              color="neutral"
              :to="{ name: 'quotation-detail', params: { id: travelId } }"
            />
            <UButton
              v-if="!isEditing"
              icon="i-lucide-pencil"
              label="Editar"
              :to="{ name: 'travel-edit', params: { id: travelId } }"
            />
            <UDropdownMenu :items="moreActions">
              <UButton
                icon="i-lucide-ellipsis-vertical"
                variant="ghost"
                color="neutral"
                aria-label="Más acciones"
              />
            </UDropdownMenu>
          </template>
        </PageHeader>

        <UNavigationMenu
          :items="tabs"
          highlight
          class="border-b border-default -mx-1 overflow-x-auto"
          :ui="{ root: '[&>div]:min-w-max' }"
        />

        <NuxtPage />
      </div>

      <!-- Modal: delete travel -->
      <UModal
        v-model:open="isDeleteModalOpen"
        title="Eliminar viaje"
        :description="`¿Eliminar ${travel.label}? Se borran también su cotización, viajeros, pagos, habitaciones y fotos. Esta acción no se puede deshacer.`"
      >
        <template #footer>
          <div class="flex w-full justify-end gap-3">
            <UButton
              variant="ghost"
              color="neutral"
              label="Cancelar"
              @click="closeDeleteModal"
            />
            <UButton
              color="error"
              icon="i-lucide-trash-2"
              label="Eliminar"
              :loading="isDeleting"
              @click="deleteTravel"
            />
          </div>
        </template>
      </UModal>
    </div>
  </LoadState>
</template>

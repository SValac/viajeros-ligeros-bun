<script setup lang="ts">
import type { DropdownMenuItem, NavigationMenuItem } from '@nuxt/ui';

import { useTravelRoute } from '~/composables/travels/use-travel-route';

// Padre de las pestañas del viaje (app/pages/travels/[id]/*). Muestra el encabezado, las
// acciones y la navegación; cada pestaña es una ruta hija que se renderiza en <NuxtPage />.

const route = useRoute();
const router = useRouter();
const toast = useToast();
const travelsStore = useTravelsStore();
const travelerStore = useTravelerStore();

const { travelId, travel } = useTravelRoute();

// The edit page renders inside this layout; no "Editar" button while on it
const isEditing = computed(() => route.name === 'travel-edit');

const isDeleteModalOpen = shallowRef(false);
const isDeleting = shallowRef(false);

// Redirect to dashboard if travel not found.
// `watch` con fuente explícita, no `watchEffect`: toast.add() lee estado reactivo interno
// y el efecto se volvería a disparar en bucle (toast + router.push infinitos).
// Espera a `loaded`: al abrir el link directo los viajes todavía se están cargando.
watch([travel, () => travelsStore.loaded], ([value, loaded]) => {
  if (loaded && !value && travelId.value && !isDeleting.value) {
    toast.add({
      title: 'Viaje no encontrado',
      description: 'El viaje que buscas no existe',
      color: 'error',
    });
    router.push({ name: 'travels-dashboard' });
  }
}, { immediate: true });

const dateRange = computed(() => {
  if (!travel.value)
    return '';
  const format = (date: string) => parseDisplayDate(date).toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' });
  const start = parseDisplayDate(travel.value.startDate);
  const end = parseDisplayDate(travel.value.endDate);
  const days = Math.round((end.getTime() - start.getTime()) / 86_400_000) + 1;
  return `${format(travel.value.startDate)} – ${format(travel.value.endDate)} · ${days} día${days === 1 ? '' : 's'}`;
});

// Para agregar una pestaña: crear app/pages/travels/[id]/<name>.vue y agregarla aquí.
const tabs = computed<NavigationMenuItem[]>(() => {
  const params = { id: travelId.value };
  const count = (n: number) => (n > 0 ? String(n) : undefined);

  return [
    { label: 'Resumen', icon: 'i-lucide-layout-dashboard', to: { name: 'travel-detail', params }, exact: true },
    { label: 'Itinerario', icon: 'i-lucide-list-check', to: { name: 'travel-itinerary', params }, badge: count(travel.value?.itinerary.length ?? 0) },
    { label: 'Servicios', icon: 'i-lucide-package', to: { name: 'travel-services', params }, badge: count(travel.value?.services.length ?? 0) },
    { label: 'Galería', icon: 'i-lucide-images', to: { name: 'travel-gallery', params } },
    { label: 'Viajeros', icon: 'i-lucide-users', to: { name: 'travel-travelers', params }, badge: count(travelerStore.getTravelersByTravel(travelId.value).length) },
    { label: 'Habitaciones', icon: 'i-lucide-bed-double', to: { name: 'travel-habitaciones', params } },
    { label: 'Pagos', icon: 'i-lucide-credit-card', to: { name: 'travel-payments', params } },
  ];
});

const moreActions = computed<DropdownMenuItem[][]>(() => [[
  {
    label: 'Eliminar viaje',
    icon: 'i-lucide-trash-2',
    color: 'error',
    onSelect: openDeleteModal,
  },
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
  const deleted = await travelsStore.deleteTravel(travel.value.id);

  if (deleted) {
    isDeleteModalOpen.value = false;
    toast.add({
      title: 'Viaje eliminado',
      description: 'El viaje se ha eliminado correctamente',
      color: 'success',
    });
    router.push({ name: 'travels-dashboard' });
    return;
  }

  isDeleting.value = false;
  toast.add({
    title: 'No se pudo eliminar el viaje',
    description: travelsStore.error ?? 'Intenta de nuevo',
    color: 'error',
  });
}
</script>

<template>
  <div v-if="travel" class="h-full overflow-auto">
    <div class="max-w-6xl mx-auto p-6 space-y-6">
      <!-- Header -->
      <div class="flex flex-wrap items-start justify-between gap-4">
        <div class="flex items-start gap-3 min-w-0">
          <UButton
            icon="i-lucide-arrow-left"
            variant="ghost"
            color="neutral"
            aria-label="Volver a viajes"
            :to="{ name: 'travels-dashboard' }"
          />
          <div class="min-w-0">
            <div class="flex flex-wrap items-center gap-2">
              <h1 class="text-2xl font-bold truncate">
                {{ travel.label }}
              </h1>
              <UBadge
                :label="getTravelStatusLabel(travel.status)"
                :color="getTravelStatusColor(travel.status)"
                variant="subtle"
              />
            </div>
            <p class="text-muted text-sm">
              <template v-if="travel.destination">
                {{ travel.destination }} ·
              </template>
              {{ dateRange }}
            </p>
          </div>
        </div>

        <div class="flex items-center gap-2">
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
        </div>
      </div>

      <UNavigationMenu
        :items="tabs"
        highlight
        class="border-b border-default -mx-1 overflow-x-auto"
      />

      <NuxtPage />
    </div>

    <!-- Modal: eliminar viaje -->
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

  <div v-else class="flex h-full items-center justify-center">
    <UIcon name="i-lucide-loader-circle" class="size-8 animate-spin text-muted" />
  </div>
</template>

<script setup lang="ts">
const route = useRoute();
const router = useRouter();
const toast = useToast();
const travelsStore = useTravelsStore();
const cotizacionStore = useCotizacionStore();
const coordinatorStore = useCoordinatorStore();

// Get travel ID from route params
const travelId = computed(() => route.params.id as string);

// Get travel data from store
const travel = computed(() => travelsStore.getTravelById(travelId.value));
const tieneCotizacion = computed(() => cotizacionStore.hasQuotation(travelId.value));

const cotizacion = computed(() => cotizacionStore.getCotizacionByTravel(travelId.value));
const preciosPublicos = computed(() =>
  cotizacion.value ? cotizacionStore.getPreciosPublicosByQuotation(cotizacion.value.id) : [],
);

const coordinadoresDelViaje = computed(() => {
  const ids = travel.value?.coordinatorIds ?? [];
  return ids.map(id => coordinatorStore.getCoordinatorById(id)).filter(Boolean);
});

async function loadCotizacionData(id: string) {
  await cotizacionStore.fetchByTravel(id);
}

onMounted(() => {
  if (travelId.value) {
    void loadCotizacionData(travelId.value);
  }
});

watch(travelId, (id) => {
  if (id) {
    void loadCotizacionData(id);
  }
});

// Redirect to dashboard if travel not found
watchEffect(() => {
  if (!travel.value && travelId.value) {
    toast.add({
      title: 'Viaje no encontrado',
      description: 'El viaje que buscas no existe',
      color: 'error',
    });
    router.push('/travels/dashboard');
  }
});

// Helper functions
function getStatusColor(status: string): 'primary' | 'secondary' | 'success' | 'info' | 'warning' | 'error' | 'neutral' {
  const colors: Record<string, 'primary' | 'secondary' | 'success' | 'info' | 'warning' | 'error' | 'neutral'> = {
    pending: 'warning',
    confirmed: 'info',
    in_progress: 'primary',
    completed: 'success',
    cancelled: 'error',
  };
  return colors[status] || 'neutral';
}

function getStatusLabel(status: string) {
  const labels: Record<string, string> = {
    pending: 'Pendiente',
    confirmed: 'Confirmado',
    in_progress: 'En Curso',
    completed: 'Completado',
    cancelled: 'Cancelado',
  };
  return labels[status] || status;
}

function formatDate(dateString: string) {
  return new Date(dateString).toLocaleDateString('es-ES', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

function formatCurrency(amount: number) {
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
  }).format(amount);
}

function calculateDuration(inicio: string, fin: string) {
  const start = new Date(inicio);
  const end = new Date(fin);
  const diff = end.getTime() - start.getTime();
  const days = Math.ceil(diff / (1000 * 60 * 60 * 24)) + 1;
  return days;
}

// Actions
function goBack() {
  router.push('/travels/dashboard');
}

function editTravel() {
  if (travel.value) {
    router.push(`/travels/${travel.value.id}/edit`);
  }
}

async function deleteTravel() {
  if (!travel.value)
    return;

  // eslint-disable-next-line no-alert
  const confirmed = confirm(`¿Eliminar el viaje a ${travel.value.destination}? Esta acción no se puede deshacer.`);

  if (confirmed) {
    await travelsStore.deleteTravel(travel.value.id);
    toast.add({
      title: 'Viaje eliminado',
      description: 'El viaje se ha eliminado correctamente',
      color: 'success',
    });
    router.push('/travels/dashboard');
  }
}

// Set page meta
definePageMeta({
  name: 'travel-detail',
  layout: 'default',
});
</script>

<template>
  <div v-if="travel" class="h-full overflow-auto">
    <div class=" mx-auto p-6 space-y-6">
      <!-- Header Actions -->
      <div class="flex items-center justify-between">
        <UButton
          icon="i-lucide-arrow-left"
          label="Volver"
          variant="ghost"
          color="neutral"
          @click="goBack"
        />

        <div class="flex gap-2">
          <UButton
            icon="i-lucide-users"
            label="Viajeros"
            variant="outline"
            color="neutral"
            @click="router.push({ name: 'travel-travelers', params: { id: travel.id } })"
          />
          <UButton
            icon="i-lucide-bed-double"
            label="Habitaciones"
            variant="outline"
            color="neutral"
            @click="router.push({ name: 'travel-habitaciones', params: { id: travel.id } })"
          />
          <UButton
            icon="i-lucide-credit-card"
            label="Ver Pagos"
            variant="outline"
            color="neutral"
            @click="router.push({ name: 'payments-travel', params: { id: travel.id } })"
          />
          <UButton
            icon="i-lucide-file-text"
            variant="outline"
            :color="tieneCotizacion ? 'success' : 'neutral'"
            @click="router.push({ name: 'travel-cotizacion', params: { id: travel.id } })"
          >
            Cotización
            <UBadge
              v-if="tieneCotizacion"
              label="Con cotización"
              color="success"
              variant="subtle"
              size="xs"
              class="ml-1"
            />
          </UButton>
          <UButton
            icon="i-lucide-pencil"
            label="Editar"
            variant="outline"
            @click="editTravel"
          />
          <UButton
            icon="i-lucide-trash-2"
            label="Eliminar"
            color="error"
            variant="outline"
            @click="deleteTravel"
          />
        </div>
      </div>
      <div class="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <UCard class="col-span-1">
          <template #header>
            <!-- Hero Section with Image -->
            <div class="space-y-4">
              <!-- Image -->
              <div
                v-if="travel.imageUrl"
                class="w-full h-64 rounded-lg overflow-hidden bg-muted"
              >
                <img
                  :src="travel.imageUrl"
                  :alt="travel.destination"
                  class="w-full h-full object-cover"
                >
              </div>

              <!-- Title and Status -->
              <div class="flex items-center justify-between gap-4">
                <div class="">
                  <div class="flex items-center gap-2 mb-2">
                    <UIcon
                      name="i-lucide-map-pin"
                      class="w-6 h-6 text-primary"
                    />
                    <h1 class="text-3xl font-bold">
                      {{ travel.destination }}
                    </h1>
                  </div>
                  <!-- Footer Metadata -->
                  <div class="flex flex-col items-start justify-between text-xs text-muted">
                    <div class="flex items-center gap-1">
                      <span class="i-lucide-calendar-plus w-3 h-3" />
                      Creado: {{ formatDate(travel.createdAt) }}
                    </div>
                    <div class="flex items-center gap-1">
                      <span class="i-lucide-calendar-clock w-3 h-3" />
                      Actualizado: {{ formatDate(travel.updatedAt) }}
                    </div>
                  </div>
                </div>
                <!-- ------------------------------------- -->

                <div>
                  <div class="text-sm text-muted mb-1">
                    Coordinadores
                  </div>
                  <div class="flex flex-col gap-1">
                    <div
                      v-for="c in coordinadoresDelViaje"
                      :key="c!.id"
                      class="flex items-center gap-2"
                    >
                      <UIcon name="i-lucide-user-star" class=" w-4 h-4 text-muted shrink-0" />
                      <span class="font-medium">{{ c!.name }}</span>
                    </div>
                    <span
                      v-if="coordinadoresDelViaje.length === 0"
                      class="text-sm text-muted"
                    >Sin coordinador</span>
                  </div>
                </div>

                <div>
                  <div class="text-sm text-muted mb-1">
                    Duración
                  </div>
                  <div class="flex items-center gap-2">
                    <UIcon name="i-lucide-calendar" class="w-4 h-4 text-muted" />
                    <span class="font-medium">
                      {{ calculateDuration(travel.startDate, travel.endDate) }} días
                    </span>
                  </div>
                </div>

                <div>
                  <div class="text-sm text-muted mb-1">
                    Estado
                  </div>
                  <div class="flex items-center gap-2">
                    <UBadge
                      :color="getStatusColor(travel.status)"
                      variant="subtle"
                      size="lg"
                    >
                      {{ getStatusLabel(travel.status) }}
                    </UBadge>
                  </div>
                </div>

                <!-- -----------------------------------  -->
              </div>
            </div>
          </template>
          <template #default>
            <div class="flex items-start justify-between gap-4">
              <div class="flex-1">
                <div class="flex items-center gap-2 mb-2">
                  <RichContent
                    :html="travel.description"
                    class="text-muted"
                  />
                </div>
              </div>
            </div>
          </template>
          <template #footer>
            <!-- Key Info Grid -->
            <div class="grid grid-cols-3 gap-4 pt-4" />
          </template>
        </UCard>

        <UCard class="col-span-1">
          <!-- Dates Section -->
          <section id="dates" class="mb-6">
            <TheSeparator
              size="lg"
              text="Fechas del Viaje"
              icon="i-lucide-calendar-days"
            />
            <div class="grid grid-cols-2 gap-4">
              <div class="p-4 bg-elevated rounded-lg">
                <div class="text-sm text-muted mb-1">
                  Fecha de Inicio
                </div>
                <div class="text-lg font-medium">
                  {{ formatDate(travel.startDate) }}
                </div>
              </div>
              <div class="p-4 bg-elevated rounded-lg">
                <div class="text-sm text-muted mb-1">
                  Fecha de Fin
                </div>
                <div class="text-lg font-medium">
                  {{ formatDate(travel.endDate) }}
                </div>
              </div>
            </div>
          </section>

          <!-- Public Prices Section -->
          <section id="public-prices">
            <TheSeparator
              size="lg"
              text="Precios al Público"
              icon="i-lucide-tag"
            />
            <template v-if="preciosPublicos.length > 0">
              <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div
                  v-for="precio in preciosPublicos"
                  :key="precio.id"
                  class="p-4 bg-elevated rounded-lg flex items-start justify-between gap-4"
                >
                  <div class="flex-1 min-w-0">
                    <div class="font-medium">
                      {{ precio.priceType }}
                    </div>
                    <div class="text-sm text-muted mt-0.5">
                      {{ precio.description }}
                    </div>
                    <div v-if="precio.roomType || precio.ageGroup" class="flex items-center gap-2 mt-1.5">
                      <UBadge
                        v-if="precio.roomType"
                        :label="precio.roomType"
                        color="neutral"
                        variant="subtle"
                        size="xs"
                      />
                      <UBadge
                        v-if="precio.ageGroup"
                        :label="precio.ageGroup"
                        color="neutral"
                        variant="subtle"
                        size="xs"
                      />
                    </div>
                    <div v-if="precio.notes" class="text-xs text-muted mt-1.5 italic">
                      {{ precio.notes }}
                    </div>
                  </div>
                  <div class="text-right shrink-0">
                    <div class="text-xs text-muted mb-0.5">
                      Por persona
                    </div>
                    <div class="text-lg font-bold text-primary">
                      {{ formatCurrency(precio.pricePerPerson) }}
                    </div>
                  </div>
                </div>
              </div>
            </template>

            <div v-else class="p-8 text-center bg-elevated rounded-lg">
              <span class="i-lucide-tag w-12 h-12 text-muted mx-auto mb-2 block opacity-50" />
              <p class="text-muted font-medium mb-1">
                Sin precios al público
              </p>
              <p class="text-sm text-muted">
                Agrega los precios en la sección de
                <UButton
                  variant="link"
                  color="primary"
                  size="xs"
                  class="px-0"
                  label="Cotización"
                  @click="router.push({ name: 'travel-cotizacion', params: { id: travel.id } })"
                />
                para que aparezcan aquí.
              </p>
            </div>
          </section>
          <!-- Buses Section -->
          <section id="buses" class="mb-6">
            <TheSeparator
              size="xl"
              text="Autobuses"
              icon="i-lucide-bus"
            />
            <TravelBusesSection
              :travel-id="travelId"
            />
          </section>

          <!-- Internal Notes Section -->
          <section
            v-if="travel.internalNotes"
            id="notas"
          >
            <TheSeparator
              size="xl"
              text="Notas Internas"
              icon="i-lucide-sticky-note"
            />
            <div class="p-4 bg-elevated rounded-lg">
              <p class="text-sm whitespace-pre-wrap">
                {{ travel.internalNotes }}
              </p>
            </div>
          </section>
        </UCard>
      </div>

      <div class="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <!-- Itinerary Section -->
        <section id="itinerary">
          <UCard class="col-span-1">
            <TheSeparator
              size="xl"
              text="Itinerario"
              icon="i-lucide-route"
            />
            <div v-if="travel.itinerary.length > 0" class="mb-6">
              <div class="space-y-4">
                <div
                  v-for="(activity, index) in travel.itinerary"
                  :key="activity.id"
                  class="relative pl-8"
                >
                  <!-- Timeline dot and line -->
                  <div class="absolute left-0 top-0 flex flex-col items-center">
                    <div class="w-4 h-4 rounded-full bg-primary border-2 border-background" />
                    <div
                      v-if="index < travel.itinerary.length - 1"
                      class="w-0.5 h-full bg-default mt-1"
                    />
                  </div>

                  <TravelActivityCard :activity="activity" class="mb-2" />
                </div>
              </div>
            </div>
            <div v-else class="mb-6">
              <div class="p-8 text-center bg-elevated rounded-lg">
                <span class="i-lucide-calendar-x w-12 h-12 text-muted mx-auto mb-2" />
                <p class="text-muted">
                  No hay actividades programadas en el itinerario
                </p>
              </div>
            </div>
          </UCard>
        </section>
        <!-- Services Section -->
        <section id="servicies">
          <UCard class="col-span-1">
            <TheSeparator
              size="xl"
              text="Servicios"
              icon="i-lucide-briefcase"
            />

            <TravelServiciosSection
              :travel-id="travelId"
            />
          </UCard>
        </section>
      </div>
      <!-- Gallery Section -->
      <UCard>
        <TheSeparator
          size="xl"
          text="Galería"
          icon="i-lucide-images"
        />
        <TravelGallerySection :travel-id="travelId" />
      </UCard>
    </div>
  </div>
</template>

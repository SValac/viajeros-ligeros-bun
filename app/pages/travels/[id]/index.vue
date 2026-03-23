<script setup lang="ts">
const route = useRoute();
const router = useRouter();
const toast = useToast();
const travelsStore = useTravelsStore();

// Get travel ID from route params
const travelId = computed(() => route.params.id as string);

// Get travel data from store
const travel = computed(() => travelsStore.getTravelById(travelId.value));

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
    'pendiente': 'warning',
    'confirmado': 'info',
    'en-curso': 'primary',
    'completado': 'success',
    'cancelado': 'error',
  };
  return colors[status] || 'neutral';
}

function getStatusLabel(status: string) {
  const labels: Record<string, string> = {
    'pendiente': 'Pendiente',
    'confirmado': 'Confirmado',
    'en-curso': 'En Curso',
    'completado': 'Completado',
    'cancelado': 'Cancelado',
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
  return new Intl.NumberFormat('es-ES', {
    style: 'currency',
    currency: 'EUR',
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
  const confirmed = confirm(`¿Eliminar el viaje a ${travel.value.destino}? Esta acción no se puede deshacer.`);

  if (confirmed) {
    travelsStore.deleteTravel(travel.value.id);
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
  layout: 'default',
});
</script>

<template>
  <div v-if="travel" class="h-full overflow-auto">
    <div class="max-w-5xl mx-auto p-6 space-y-6">
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

      <!-- Main Card -->
      <UCard>
        <!-- Hero Section with Image -->
        <template #header>
          <div class="space-y-4">
            <!-- Image -->
            <div
              v-if="travel.imagenUrl"
              class="w-full h-64 rounded-lg overflow-hidden bg-muted"
            >
              <img
                :src="travel.imagenUrl"
                :alt="travel.destino"
                class="w-full h-full object-cover"
              >
            </div>

            <!-- Title and Status -->
            <div class="flex items-start justify-between gap-4">
              <div class="flex-1">
                <div class="flex items-center gap-2 mb-2">
                  <span class="i-lucide-map-pin w-6 h-6 text-primary" />
                  <h1 class="text-3xl font-bold">
                    {{ travel.destino }}
                  </h1>
                </div>
                <pre class="text-muted">
                  {{ travel.descripcion }}
                </pre>
              </div>

              <UBadge
                :color="getStatusColor(travel.estado)"
                variant="subtle"
                size="lg"
              >
                {{ getStatusLabel(travel.estado) }}
              </UBadge>
            </div>

            <!-- Key Info Grid -->
            <div class="grid grid-cols-3 gap-4 pt-4 border-t border-default">
              <div>
                <div class="text-sm text-muted mb-1">
                  Cliente
                </div>
                <div class="flex items-center gap-2">
                  <span class="i-lucide-user w-4 h-4 text-muted" />
                  <span class="font-medium">{{ travel.cliente }}</span>
                </div>
              </div>

              <div>
                <div class="text-sm text-muted mb-1">
                  Duración
                </div>
                <div class="flex items-center gap-2">
                  <span class="i-lucide-calendar w-4 h-4 text-muted" />
                  <span class="font-medium">
                    {{ calculateDuration(travel.fechaInicio, travel.fechaFin) }} días
                  </span>
                </div>
              </div>

              <div>
                <div class="text-sm text-muted mb-1">
                  Precio Total
                </div>
                <div class="flex items-center gap-2">
                  <span class="i-lucide-euro w-4 h-4 text-muted" />
                  <span class="font-medium text-lg">
                    {{ formatCurrency(travel.precio) }}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </template>

        <!-- Dates Section -->
        <div class="mb-6">
          <h2 class="text-xl font-semibold mb-4 flex items-center gap-2">
            <span class="i-lucide-calendar-days w-5 h-5" />
            Fechas del Viaje
          </h2>
          <div class="grid grid-cols-2 gap-4">
            <div class="p-4 bg-elevated rounded-lg">
              <div class="text-sm text-muted mb-1">
                Fecha de Inicio
              </div>
              <div class="text-lg font-medium">
                {{ formatDate(travel.fechaInicio) }}
              </div>
            </div>
            <div class="p-4 bg-elevated rounded-lg">
              <div class="text-sm text-muted mb-1">
                Fecha de Fin
              </div>
              <div class="text-lg font-medium">
                {{ formatDate(travel.fechaFin) }}
              </div>
            </div>
          </div>
        </div>

        <!-- Itinerary Section -->
        <div v-if="travel.itinerario.length > 0" class="mb-6">
          <h2 class="text-xl font-semibold mb-4 flex items-center gap-2">
            <span class="i-lucide-route w-5 h-5" />
            Itinerario
          </h2>

          <div class="space-y-4">
            <div
              v-for="(activity, index) in travel.itinerario"
              :key="activity.id"
              class="relative pl-8"
            >
              <!-- Timeline dot and line -->
              <div class="absolute left-0 top-0 flex flex-col items-center">
                <div class="w-4 h-4 rounded-full bg-primary border-2 border-background" />
                <div
                  v-if="index < travel.itinerario.length - 1"
                  class="w-0.5 h-full bg-default mt-1"
                />
              </div>

              <!-- Activity Card -->
              <UCard class="mb-2">
                <div class="flex items-start justify-between gap-4">
                  <div class="flex-1">
                    <div class="flex items-center gap-2 mb-2">
                      <UBadge color="primary" variant="subtle">
                        Día {{ activity.dia }}
                      </UBadge>
                      <span v-if="activity.hora" class="text-sm text-muted flex items-center gap-1">
                        <span class="i-lucide-clock w-3 h-3" />
                        {{ activity.hora }}
                      </span>
                    </div>
                    <h3 class="font-semibold text-lg mb-1">
                      {{ activity.titulo }}
                    </h3>
                    <p class="text-muted text-sm mb-2">
                      {{ activity.descripcion }}
                    </p>
                    <div v-if="activity.ubicacion" class="flex items-center gap-1 text-sm text-muted">
                      <span class="i-lucide-map-pin w-3 h-3" />
                      {{ activity.ubicacion }}
                    </div>
                  </div>
                </div>
              </UCard>
            </div>
          </div>
        </div>

        <div v-else class="mb-6">
          <h2 class="text-xl font-semibold mb-4 flex items-center gap-2">
            <span class="i-lucide-route w-5 h-5" />
            Itinerario
          </h2>
          <div class="p-8 text-center bg-elevated rounded-lg">
            <span class="i-lucide-calendar-x w-12 h-12 text-muted mx-auto mb-2" />
            <p class="text-muted">
              No hay actividades programadas en el itinerario
            </p>
          </div>
        </div>

        <!-- Services Section -->
        <div class="mb-6">
          <h2 class="text-xl font-semibold mb-4 flex items-center gap-2">
            <span class="i-lucide-package w-5 h-5" />
            Servicios
          </h2>

          <div v-if="travel.servicios.length > 0" class="grid grid-cols-2 gap-3">
            <div
              v-for="service in travel.servicios"
              :key="service.id"
              class="p-4 bg-elevated rounded-lg flex items-start gap-3"
            >
              <div class="shrink-0 mt-0.5">
                <span
                  v-if="service.incluido"
                  class="i-lucide-check-circle w-5 h-5 text-success"
                />
                <span
                  v-else
                  class="i-lucide-x-circle w-5 h-5 text-error"
                />
              </div>
              <div class="flex-1 min-w-0">
                <div class="font-medium mb-0.5">
                  {{ service.nombre }}
                </div>
                <div v-if="service.descripcion" class="text-sm text-muted">
                  {{ service.descripcion }}
                </div>
                <div class="text-xs mt-1" :class="service.incluido ? 'text-success' : 'text-muted'">
                  {{ service.incluido ? 'Incluido' : 'No incluido' }}
                </div>
              </div>
            </div>
          </div>

          <div v-else class="p-8 text-center bg-elevated rounded-lg">
            <span class="i-lucide-package-x w-12 h-12 text-muted mx-auto mb-2" />
            <p class="text-muted">
              No hay servicios definidos para este viaje
            </p>
          </div>
        </div>

        <!-- Buses Section -->
        <div class="mb-6">
          <h2 class="text-xl font-semibold mb-4 flex items-center gap-2">
            <span class="i-lucide-bus w-5 h-5" />
            Autobuses
          </h2>
          <TravelBusList
            :travel-id="travelId"
            :editable="false"
          />
        </div>

        <!-- Internal Notes Section -->
        <div v-if="travel.notasInternas" class="mb-6">
          <h2 class="text-xl font-semibold mb-4 flex items-center gap-2">
            <span class="i-lucide-sticky-note w-5 h-5" />
            Notas Internas
          </h2>
          <div class="p-4 bg-elevated rounded-lg">
            <p class="text-sm whitespace-pre-wrap">
              {{ travel.notasInternas }}
            </p>
          </div>
        </div>

        <!-- Footer Metadata -->
        <template #footer>
          <div class="flex items-center justify-between text-xs text-muted">
            <div class="flex items-center gap-1">
              <span class="i-lucide-calendar-plus w-3 h-3" />
              Creado: {{ formatDate(travel.createdAt) }}
            </div>
            <div class="flex items-center gap-1">
              <span class="i-lucide-calendar-clock w-3 h-3" />
              Actualizado: {{ formatDate(travel.updatedAt) }}
            </div>
          </div>
        </template>
      </UCard>
    </div>
  </div>
</template>

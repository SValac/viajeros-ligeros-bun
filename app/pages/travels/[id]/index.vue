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
const tieneCotizacion = computed(() => cotizacionStore.hasCotizacion(travelId.value));

const cotizacion = computed(() => cotizacionStore.getCotizacionByTravel(travelId.value));
const preciosPublicos = computed(() =>
  cotizacion.value ? cotizacionStore.getPreciosPublicosByCotizacion(cotizacion.value.id) : [],
);

const coordinadoresDelViaje = computed(() => {
  const ids = travel.value?.coordinadorIds ?? [];
  return ids.map(id => coordinatorStore.getCoordinatorById(id)).filter(Boolean);
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
                <RichContent
                  :html="travel.descripcion"
                  class="text-muted"
                />
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
                  Coordinadores
                </div>
                <div class="flex flex-col gap-1">
                  <div
                    v-for="c in coordinadoresDelViaje"
                    :key="c!.id"
                    class="flex items-center gap-2"
                  >
                    <span class="i-lucide-user-star w-4 h-4 text-muted shrink-0" />
                    <span class="font-medium">{{ c!.nombre }}</span>
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
                  <span class="i-lucide-calendar w-4 h-4 text-muted" />
                  <span class="font-medium">
                    {{ calculateDuration(travel.fechaInicio, travel.fechaFin) }} días
                  </span>
                </div>
              </div>

              <div>
                <div class="text-sm text-muted mb-1">
                  Precio Proveedores
                </div>
                <div class="flex items-center gap-2">
                  <span class="i-lucide-dollar-sign w-4 h-4 text-muted" />
                  <span class="font-medium text-lg">
                    {{ formatCurrency(travel.precio) }}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </template>

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
                    {{ precio.tipo }}
                  </div>
                  <div class="text-sm text-muted mt-0.5">
                    {{ precio.descripcion }}
                  </div>
                  <div v-if="precio.tipoHabitacion || precio.grupoEdad" class="flex items-center gap-2 mt-1.5">
                    <UBadge
                      v-if="precio.tipoHabitacion"
                      :label="precio.tipoHabitacion"
                      color="neutral"
                      variant="subtle"
                      size="xs"
                    />
                    <UBadge
                      v-if="precio.grupoEdad"
                      :label="precio.grupoEdad"
                      color="neutral"
                      variant="subtle"
                      size="xs"
                    />
                  </div>
                  <div v-if="precio.notas" class="text-xs text-muted mt-1.5 italic">
                    {{ precio.notas }}
                  </div>
                </div>
                <div class="text-right shrink-0">
                  <div class="text-xs text-muted mb-0.5">
                    Por persona
                  </div>
                  <div class="text-lg font-bold text-primary">
                    {{ formatCurrency(precio.precioPorPersona) }}
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

        <!-- Itinerary Section -->
        <section id="itinerary">
          <TheSeparator
            size="xl"
            text="Itinerario"
            icon="i-lucide-route"
          />
          <div v-if="travel.itinerario.length > 0" class="mb-6">
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
            <div class="p-8 text-center bg-elevated rounded-lg">
              <span class="i-lucide-calendar-x w-12 h-12 text-muted mx-auto mb-2" />
              <p class="text-muted">
                No hay actividades programadas en el itinerario
              </p>
            </div>
          </div>
        </section>

        <!-- Services Section -->
        <section id="servicies">
          <TheSeparator
            size="xl"
            text="Servicios"
            icon="i-lucide-briefcase"
          />
          <TravelServiciosSection
            :travel-id="travelId"
          />
        </section>

        <!-- Buses Section -->
        <section id="buses" class="mb-6">
          <TheSeparator
            size="xl"
            text="Autobuses"
            icon="i-lucide-bus"
          />
          <TravelBusList
            :travel-id="travelId"
            :editable="false"
          />
        </section>

        <!-- Internal Notes Section -->
        <section
          v-if="travel.notasInternas"
          id="notas"
        >
          <TheSeparator
            size="xl"
            text="Notas Internas"
            icon="i-lucide-sticky-note"
          />
          <div class="p-4 bg-elevated rounded-lg">
            <p class="text-sm whitespace-pre-wrap">
              {{ travel.notasInternas }}
            </p>
          </div>
        </section>

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

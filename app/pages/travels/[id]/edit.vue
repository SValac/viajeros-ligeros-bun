<script setup lang="ts">
import type { TravelFormData } from '~/types/travel';

const route = useRoute();
const router = useRouter();
const travelsStore = useTravelsStore();
const toast = useToast();

// Obtener el ID del viaje desde la ruta
const travelId = route.params.id as string;

// Obtener el viaje del store
const travel = computed(() => travelsStore.getTravelById(travelId));

// Si el viaje no existe, redirigir al dashboard
onMounted(() => {
  if (!travel.value) {
    toast.add({
      title: 'Viaje no encontrado',
      description: 'El viaje que intentas editar no existe',
      color: 'error',
      icon: 'i-lucide-alert-circle',
    });
    router.push('/travels/dashboard');
  }
});

// Handlers
function handleSubmit(data: TravelFormData) {
  const success = travelsStore.updateTravel(travelId, data);

  if (success) {
    toast.add({
      title: 'Viaje actualizado',
      description: `El viaje a ${data.destino} ha sido actualizado exitosamente`,
      color: 'success',
      icon: 'i-lucide-check-circle',
    });

    // Navegar de vuelta al dashboard
    router.push('/travels/dashboard');
  }
  else {
    toast.add({
      title: 'Error al actualizar',
      description: 'No se pudo actualizar el viaje',
      color: 'error',
      icon: 'i-lucide-alert-circle',
    });
  }
}

function handleCancel() {
  router.push('/travels/dashboard');
}
</script>

<template>
  <div
    v-if="travel"
    class="container mx-auto p-6 max-w-4xl"
  >
    <!-- Header -->
    <div class="mb-6">
      <div class="flex items-center gap-3 mb-2">
        <UButton
          icon="i-lucide-arrow-left"
          variant="ghost"
          color="neutral"
          size="sm"
          to="/travels/dashboard"
        />
        <h1 class="text-3xl font-bold">
          Editar Viaje
        </h1>
      </div>
      <p class="text-muted text-sm">
        Destino: {{ travel.destino }}
      </p>
    </div>

    <!-- Formulario -->
    <UCard class="mb-6">
      <TravelForm
        :travel="travel"
        @submit="handleSubmit"
        @cancel="handleCancel"
      />
    </UCard>

    <!-- Servicios -->
    <UCard class="mb-6">
      <template #header>
        <div class="flex items-center gap-2">
          <span class="i-lucide-briefcase w-5 h-5 text-muted" />
          <h2 class="font-semibold text-lg">
            Servicios
          </h2>
        </div>
      </template>
      <TravelServiciosSection :travel-id="travelId" />
    </UCard>

    <!-- Autobuses -->
    <UCard>
      <template #header>
        <div class="flex items-center gap-2">
          <span class="i-lucide-bus w-5 h-5 text-muted" />
          <h2 class="font-semibold text-lg">
            Autobuses
          </h2>
        </div>
      </template>
      <TravelBusesSection :travel-id="travelId" :editable="true" />
    </UCard>
  </div>

  <!-- Loading state mientras se verifica el viaje -->
  <div
    v-else
    class="container mx-auto p-6 max-w-4xl"
  >
    <div class="flex items-center justify-center py-12">
      <div class="text-center">
        <div class="i-lucide-loader-circle w-8 h-8 mx-auto mb-4 animate-spin" />
        <p class="text-muted">
          Cargando viaje...
        </p>
      </div>
    </div>
  </div>
</template>

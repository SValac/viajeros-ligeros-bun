<script setup lang="ts">
import type { TravelFormData } from '~/types/travel';

const router = useRouter();
const travelsStore = useTravelsStore();
const toast = useToast();

// Handlers
async function handleSubmit(data: TravelFormData) {
  const newTravel = await travelsStore.addTravel(data);

  toast.add({
    title: 'Viaje creado',
    description: `El viaje a ${newTravel.destination} ha sido creado exitosamente`,
    color: 'success',
    icon: 'i-lucide-check-circle',
  });

  // Navegar de vuelta al dashboard
  router.push('/travels/dashboard');
}

function handleCancel() {
  router.push('/travels/dashboard');
}
</script>

<template>
  <div class="container mx-auto  ">
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
          Nuevo Viaje
        </h1>
      </div>
      <p class="text-muted text-sm">
        Completa la información del viaje, itinerario y servicios incluidos
      </p>
    </div>

    <!-- Formulario -->
    <UCard>
      <TravelForm
        @submit="handleSubmit"
        @cancel="handleCancel"
      />
    </UCard>
  </div>
</template>

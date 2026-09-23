<script setup lang="ts">
import type { TravelService } from '~/types/travel';

type Props = {
  travelId: string;
};

const { travelId } = defineProps<Props>();

const travelsStore = useTravelsStore();
const toast = useToast();

const travel = computed(() => travelsStore.getTravelById(travelId));
const services = computed(() => travel.value?.services ?? []);

async function handleUpdate(newServices: TravelService[]) {
  const ok = await travelsStore.updateTravel(travelId, { services: newServices });

  if (ok) {
    toast.add({ title: 'Servicios guardados', color: 'success', icon: 'i-lucide-check-circle' });
  }
  else {
    toast.add({ title: 'Error al guardar servicios', color: 'error', icon: 'i-lucide-alert-circle' });
  }
}
</script>

<template>
  <TravelServiceList
    :model-value="services"
    @update:model-value="handleUpdate"
  />
</template>

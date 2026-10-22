<script setup lang="ts">
import { useActionToast } from '~/composables/use-action-toast';

const props = defineProps<{
  travelId: string;
}>();

const store = useTravelMediaStore();
const { runWithToast } = useActionToast();

const media = computed(() => store.getMediaByTravel(props.travelId));

async function loadMedia() {
  await runWithToast(() => store.fetchForTravel(props.travelId), {
    error: 'No se pudo cargar la galería',
    errorFallback: 'Recarga la página',
  });
}

onMounted(loadMedia);
</script>

<template>
  <div class="space-y-6">
    <TravelGalleryViewer
      :media="media"
      :travel-id="travelId"
      editable
    />
    <USeparator />
    <TravelGalleryUpload
      :travel-id="travelId"
      @uploaded="loadMedia"
    />
  </div>
</template>

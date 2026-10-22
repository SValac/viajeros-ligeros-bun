<script setup lang="ts">
const props = defineProps<{
  travelId: string;
}>();

const store = useTravelMediaStore();

const media = computed(() => store.getMediaByTravel(props.travelId));
const isLoaded = computed(() => store.isLoadedFor(props.travelId));
const loadError = shallowRef<unknown>(null);

// The error shows in LoadState: as the error with Reintentar, or above the gallery if it had loaded
async function loadMedia() {
  loadError.value = null;
  try {
    await store.fetchForTravel(props.travelId);
  }
  catch (e) {
    loadError.value = e;
  }
}

onMounted(loadMedia);
</script>

<template>
  <div class="space-y-6">
    <LoadState
      :is-loaded="isLoaded"
      :load-error="loadError"
      label="la galería"
      skeleton="cards"
      @retry="loadMedia"
    >
      <TravelGalleryViewer
        :media="media"
        :travel-id="travelId"
        editable
      />
    </LoadState>
    <USeparator />
    <TravelGalleryUpload
      :travel-id="travelId"
      @uploaded="loadMedia"
    />
  </div>
</template>

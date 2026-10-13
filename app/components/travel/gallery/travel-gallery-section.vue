<script setup lang="ts">
const props = defineProps<{
  travelId: string;
}>();

const store = useTravelMediaStore();

const media = computed(() => store.getMediaByTravel(props.travelId));

onMounted(async () => {
  await store.fetchForTravel(props.travelId);
});

async function onUploaded() {
  await store.fetchForTravel(props.travelId);
}
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
      @uploaded="onUploaded"
    />
  </div>
</template>

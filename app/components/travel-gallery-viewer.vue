<script setup lang="ts">
import type { TravelMedia } from '~/types/travel-media';

const props = defineProps<{
  media: TravelMedia[];
  editable?: boolean;
  travelId: string;
}>();

const store = useTravelMediaStore();

const lightboxOpen = ref(false);
const lightboxIndex = ref(0);
const carouselRef = ref();

const lightboxItem = computed(() => props.media[lightboxIndex.value]);

function openLightbox(index: number) {
  lightboxIndex.value = index;
  lightboxOpen.value = true;
}

watch(lightboxOpen, (open) => {
  if (open) {
    nextTick(() => {
      carouselRef.value?.emblaApi?.scrollTo(lightboxIndex.value, true);
    });
  }
});

async function confirmDelete(item: TravelMedia) {
  await store.removeMedia(item.id, item.storagePath, props.travelId);
  if (lightboxOpen.value && props.media.length === 0) {
    lightboxOpen.value = false;
  }
}
</script>

<template>
  <div>
    <div
      v-if="media.length > 0"
      class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3"
    >
      <div
        v-for="(item, index) in media"
        :key="item.id"
        class="relative group rounded-lg overflow-hidden bg-elevated aspect-square cursor-pointer"
        @click="openLightbox(index)"
      >
        <video
          v-if="item.mediaType === 'video'"
          :src="item.publicUrl"
          class="w-full h-full object-cover pointer-events-none"
          preload="metadata"
          muted
        />
        <img
          v-else
          :src="item.publicUrl"
          :alt="item.caption ?? `Imagen ${index + 1}`"
          class="w-full h-full object-cover"
          loading="lazy"
        >

        <div class="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-end justify-between p-2">
          <UBadge
            :icon="item.mediaType === 'video' ? 'i-lucide-video' : 'i-lucide-image'"
            color="neutral"
            variant="solid"
            size="xs"
          />
          <UButton
            v-if="editable"
            icon="i-lucide-trash-2"
            color="error"
            variant="solid"
            size="xs"
            @click.stop="confirmDelete(item)"
          />
        </div>
      </div>
    </div>

    <div
      v-else
      class="p-8 text-center bg-elevated rounded-lg"
    >
      <span class="i-lucide-images w-12 h-12 text-muted mx-auto mb-2 block opacity-50" />
      <p class="text-muted">
        No hay fotos ni videos en la galería
      </p>
    </div>

    <!-- Lightbox -->
    <UModal
      v-model:open="lightboxOpen"
      :ui="{ content: 'max-w-4xl bg-black' }"
    >
      <template #content>
        <div class="relative">
          <UCarousel
            ref="carouselRef"
            :items="media"
            arrows
            dots
            :prev="{ color: 'neutral', variant: 'ghost', class: 'text-white hover:text-white hover:bg-white/20 dark:text-white dark:hover:bg-white/20' }"
            :next="{ color: 'neutral', variant: 'ghost', class: 'text-white hover:text-white hover:bg-white/20 dark:text-white dark:hover:bg-white/20' }"
            :ui="{
              viewport: 'h-[80vh]',
              container: 'h-full',
              item: 'basis-full h-full',
              prev: 'absolute start-2 sm:start-2 top-1/2 -translate-y-1/2',
              next: 'absolute end-2 sm:end-2 top-1/2 -translate-y-1/2',
              dots: 'absolute inset-x-0 bottom-2',
            }"
            @select="lightboxIndex = $event"
          >
            <template #default="{ item }">
              <div class="flex items-center justify-center h-full w-full px-12">
                <video
                  v-if="item.mediaType === 'video'"
                  :src="item.publicUrl"
                  controls
                  class="w-full h-full object-contain"
                />
                <img
                  v-else
                  :src="item.publicUrl"
                  :alt="item.caption ?? ''"
                  class="w-full h-full object-contain"
                >
              </div>
            </template>
          </UCarousel>

          <div
            v-if="lightboxItem?.caption"
            class="bg-black/60 text-white text-sm px-4 py-2 text-center"
          >
            {{ lightboxItem.caption }}
          </div>

          <div class="text-white/60 text-xs text-right px-4 py-1 bg-black/40">
            {{ lightboxIndex + 1 }} / {{ media.length }}
          </div>
        </div>
      </template>
    </UModal>
  </div>
</template>

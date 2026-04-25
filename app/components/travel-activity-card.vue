<script setup lang="ts">
import type { TravelActivity } from '~/types/travel';

// Props
type Props = {
  activity: TravelActivity;
};

const props = defineProps<Props>();

const googleMapsUrl = computed(() => {
  if (!props.activity.mapLocation)
    return null;
  const { lat, lng } = props.activity.mapLocation;
  return `https://www.google.com/maps?q=${lat},${lng}`;
});
</script>

<template>
  <UCard
    :ui="{
      header: 'sm:p-2',
      body: 'sm:py-2 sm:px-4',
    }"
  >
    <template #header>
      <div class="flex flex-col md:flex-row items-center justify-between gap-2 relative pr-8 pl-4">
        <div class="font-semibold text-base">
          {{ activity.title }}
        </div>
        <div class="flex items-center gap-2 text-sm text-muted">
          <UIcon name="i-lucide-calendar-days" class="w-4 h-4 shrink-0" />
          <span class="font-medium">Día {{ activity.day }}</span>
          <span
            v-if="activity.time"
            class="flex items-center gap-1"
          >
            <UIcon name="i-lucide-clock" class="w-3.5 h-3.5" />
            {{ activity.time }}
          </span>
        </div>
        <!-- Slot de acciones en la esquina superior derecha -->
        <div
          v-if="$slots.actions"
          class="absolute top-0 right-0 z-10"
        >
          <slot name="actions" />
        </div>
      </div>
    </template>
    <div class="flex flex-col-reverse md:flex-row items-center justify-center gap-4">
      <div class="basis-1/6 shrink-0">
        <!-- Ubicación -->
        <div
          v-if="activity.location || activity.mapLocation"
        >
          <!-- Caso: hay location textual -->
          <template v-if="activity.location">
            <!-- Si hay mapLocation, el texto es un link a Google Maps -->
            <UButton
              v-if="activity.mapLocation"
              as="a"
              :href="googleMapsUrl!"
              target="_blank"
              rel="noopener noreferrer"
              :label="activity.location"
              icon="i-lucide-map-pin"
              variant="outline"
              size="xs"
              color="primary"
              class="flex items-center justify-center w-36"
            />
            <!-- Si no hay mapLocation, texto muted normal -->
            <span
              v-else
              class="flex-1"
            >{{ activity.location }}</span>
          </template>

          <!-- Caso: no hay location pero sí hay mapLocation -->
          <UButton
            v-else-if="activity.mapLocation"
            as="a"
            :href="googleMapsUrl!"
            target="_blank"
            rel="noopener noreferrer"
            label="Ver en mapa"
            variant="soft"
            color="primary"
            size="xs"
            trailing-icon="i-lucide-external-link"
            class="flex items-center justify-center w-36"
          />
        </div>
      </div>

      <!-- Descripción -->
      <div class="flex-1 text-sm text-muted text-pretty">
        {{ activity.description }}
      </div>
    </div>
  </UCard>
</template>

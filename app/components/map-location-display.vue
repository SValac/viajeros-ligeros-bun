<script setup lang="ts">
import type { MapLocation } from '~/types/travel';

type Props = {
  mapLocation?: MapLocation;
};

const props = defineProps<Props>();

// Computed
const googleMapsUrl = computed(() => {
  if (!props.mapLocation?.lat || !props.mapLocation?.lng)
    return null;

  const { lat, lng } = props.mapLocation;
  return `https://www.google.com/maps?q=${lat},${lng}`;
});

const displayAddress = computed(() => {
  if (!props.mapLocation)
    return null;
  if (props.mapLocation.address)
    return props.mapLocation.address;
  return `${props.mapLocation.lat.toFixed(4)}, ${props.mapLocation.lng.toFixed(4)}`;
});

const hasLocation = computed(() => !!props.mapLocation?.lat && !!props.mapLocation?.lng);
</script>

<template>
  <div v-if="hasLocation" class="space-y-3">
    <!-- Título -->
    <h3 class="text-sm font-semibold text-gray-900">
      📍 Ubicación en el mapa
    </h3>

    <!-- Información de ubicación -->
    <div class="bg-linear-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-3">
      <p class="text-sm text-gray-700">
        {{ displayAddress }}
      </p>

      <div class="text-xs text-gray-500 mt-1">
        <span>Lat: {{ mapLocation!.lat.toFixed(6) }}</span>
        <span class="mx-2">•</span>
        <span>Lng: {{ mapLocation!.lng.toFixed(6) }}</span>
      </div>
    </div>

    <!-- Botón "Ver en Google Maps" -->
    <a
      v-if="googleMapsUrl"
      :href="googleMapsUrl"
      target="_blank"
      rel="noopener noreferrer"
      class="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors duration-200"
    >
      <span>🗺️ Ver en Google Maps</span>
      <svg
        class="w-4 h-4"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          stroke-linecap="round"
          stroke-linejoin="round"
          stroke-width="2"
          d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
        />
      </svg>
    </a>
  </div>
</template>

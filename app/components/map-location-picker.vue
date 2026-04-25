<script setup lang="ts">
import type { MapLocation } from '~/types/travel';

type Props = {
  modelValue?: MapLocation;
};

type Emits = {
  (e: 'update:modelValue', value: MapLocation | undefined): void;
};

const props = defineProps<Props>();
const emit = defineEmits<Emits>();

// State
const searchInput = ref('');
const suggestions = ref<any[]>([]);
const selectedSuggestion = ref<any>(null);
const mapContainer = ref<HTMLDivElement>();
// shallowRef: external Google Maps objects don't need deep reactivity
const map = shallowRef<any>(null);
const marker = shallowRef<any>(null);

// Composables
const { loadGoogleMaps, isGoogleMapsLoaded, getGoogleMaps, debounce } = useGoogleMaps();
const googleMapsLoaded = computed(() => isGoogleMapsLoaded());

// Computed
const hasLocation = computed(() => !!props.modelValue?.lat && !!props.modelValue?.lng);
const locationDisplay = computed(() => {
  if (!hasLocation.value)
    return 'No se ha seleccionado ubicación';
  const { lat, lng, address } = props.modelValue!;
  return address || `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
});

// Methods
function initializeMap() {
  if (!googleMapsLoaded.value || !mapContainer.value)
    return;

  const google = getGoogleMaps();
  if (!google)
    return;

  const center = props.modelValue
    ? { lat: props.modelValue.lat, lng: props.modelValue.lng }
    : { lat: 19.43, lng: -99.13 };

  map.value = new google.maps.Map(mapContainer.value, {
    zoom: 15,
    center,
    mapTypeControl: true,
    fullscreenControl: true,
    zoomControl: true,
  });

  if (props.modelValue) {
    createMarker(props.modelValue.lat, props.modelValue.lng);
  }

  map.value.addListener('click', (event: any) => {
    const { lat, lng } = event.latLng;
    updateLocation(lat(), lng());
  });
}

function createMarker(lat: number, lng: number) {
  if (!map.value)
    return;

  const google = getGoogleMaps();
  if (!google)
    return;

  if (marker.value)
    marker.value.setMap(null);

  marker.value = new google.maps.Marker({
    position: { lat, lng },
    map: map.value,
    draggable: true,
  });

  marker.value.addListener('dragend', (event: any) => {
    const { lat, lng } = event.latLng;
    updateLocation(lat(), lng());
  });
}

function updateLocation(lat: number, lng: number) {
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
    console.warn('Coordenadas inválidas:', { lat, lng });
    return;
  }

  if (map.value) {
    map.value.setCenter({ lat, lng });
  }

  createMarker(lat, lng);

  const location: MapLocation = { lat, lng, address: props.modelValue?.address };
  emit('update:modelValue', location);

  reverseGeocode(lat, lng);
}

async function reverseGeocode(lat: number, lng: number) {
  if (!googleMapsLoaded.value)
    return;

  const google = getGoogleMaps();
  if (!google)
    return;

  try {
    const geocoder = new google.maps.Geocoder();
    const result = await geocoder.geocode({ location: { lat, lng } });

    if (result.results?.[0]) {
      emit('update:modelValue', {
        lat,
        lng,
        address: result.results[0].formatted_address,
        placeId: result.results[0].place_id,
      });
    }
  }
  catch (error) {
    console.warn('Error en reverse geocoding:', error);
  }
}

const handleSearchInput = debounce(async (query: string) => {
  if (!query.trim() || !googleMapsLoaded.value) {
    suggestions.value = [];
    return;
  }

  const google = getGoogleMaps();
  if (!google)
    return;

  try {
    // TODO: migrate to AutocompleteSuggestion.fetchAutocompleteSuggestions() — AutocompleteService
    // is deprecated for new customers since March 2025 and will no longer receive bug fixes.
    // Migration guide: https://developers.google.com/maps/documentation/javascript/places-migration-overview
    const service = new google.maps.places.AutocompleteService();
    const result = await service.getPlacePredictions({ input: query });
    suggestions.value = result.predictions || [];
  }
  catch (error) {
    console.warn('Error en autocomplete:', error);
    suggestions.value = [];
  }
}, 300);

async function selectSuggestion(suggestion: any) {
  if (!googleMapsLoaded.value)
    return;

  const google = getGoogleMaps();
  if (!google)
    return;

  searchInput.value = suggestion.description;
  selectedSuggestion.value = suggestion;
  suggestions.value = [];

  try {
    const service = new google.maps.places.PlacesService(map.value || document.createElement('div'));

    service.getDetails(
      {
        placeId: suggestion.place_id,
        fields: ['geometry', 'formatted_address', 'place_id'],
      },
      (place: any) => {
        if (place?.geometry?.location) {
          const lat = place.geometry.location.lat();
          const lng = place.geometry.location.lng();

          updateLocation(lat, lng);

          emit('update:modelValue', {
            lat,
            lng,
            address: place.formatted_address,
            placeId: suggestion.place_id,
          });
        }
      },
    );
  }
  catch (error) {
    console.warn('Error obteniendo detalles del lugar:', error);
  }
}

function clearLocation() {
  searchInput.value = '';
  selectedSuggestion.value = null;
  suggestions.value = [];
  if (marker.value)
    marker.value.setMap(null);
  marker.value = null;
  emit('update:modelValue', undefined);
}

// Lifecycle
onMounted(() => {
  if (isGoogleMapsLoaded()) {
    // Maps already loaded (singleton state, e.g., modal reopened) — wait for DOM
    nextTick(() => initializeMap());
  }
  else {
    loadGoogleMaps();
  }
});

onUnmounted(() => {
  if (marker.value) {
    marker.value.setMap(null);
    marker.value = null;
  }
  map.value = null;
});

// Fires when Google Maps finishes loading for the first time
watch(googleMapsLoaded, (loaded) => {
  if (loaded)
    initializeMap();
}, { flush: 'post' });

watch(
  () => props.modelValue,
  (newVal) => {
    if (newVal && !selectedSuggestion.value) {
      searchInput.value = newVal.address || `${newVal.lat}, ${newVal.lng}`;
    }
  },
);
</script>

<template>
  <div class="space-y-4">
    <div class="space-y-2">
      <label class="text-sm font-medium text-gray-700">
        Buscar ubicación en el mapa
      </label>

      <div v-if="!googleMapsLoaded" class="p-3 bg-yellow-50 border border-yellow-200 rounded text-sm text-yellow-800">
        ⚠️ Google Maps no disponible. Asegúrate de tener configurada la API Key.
      </div>

      <template v-else>
        <div class="relative">
          <input
            v-model="searchInput"
            type="text"
            placeholder="Buscar lugar (ej: Hotel, Playa, Restaurante...)"
            class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            @input="handleSearchInput(searchInput)"
          >

          <div
            v-if="suggestions.length > 0"
            class="absolute top-full left-0 right-0 bg-white border border-gray-300 border-t-0 rounded-b-lg shadow-lg z-10 max-h-48 overflow-y-auto"
          >
            <button
              v-for="(suggestion, idx) in suggestions"
              :key="idx"
              type="button"
              class="w-full text-left px-3 py-2 hover:bg-blue-50 border-b last:border-b-0 transition-colors"
              @click="selectSuggestion(suggestion)"
            >
              <div class="text-sm font-medium text-gray-900">
                {{ suggestion.structured_formatting?.main_text ?? suggestion.description }}
              </div>
              <div class="text-xs text-gray-500">
                {{ suggestion.structured_formatting?.secondary_text }}
              </div>
            </button>
          </div>
        </div>

        <div class="border border-gray-300 rounded-lg overflow-hidden">
          <div ref="mapContainer" class="w-full h-64 bg-gray-100" />
        </div>

        <div v-if="hasLocation" class="p-3 bg-blue-50 border border-blue-200 rounded text-sm">
          <div class="font-medium text-blue-900">
            Ubicación seleccionada:
          </div>
          <div class="text-blue-800">
            {{ locationDisplay }}
          </div>
          <div class="text-xs text-blue-700 mt-1">
            Lat: {{ modelValue?.lat?.toFixed(6) }} | Lng: {{ modelValue?.lng?.toFixed(6) }}
          </div>
        </div>

        <button
          v-if="hasLocation"
          type="button"
          class="w-full px-3 py-2 bg-red-100 hover:bg-red-200 text-red-800 font-medium rounded-lg transition-colors"
          @click="clearLocation"
        >
          Limpiar ubicación
        </button>
      </template>
    </div>
  </div>
</template>

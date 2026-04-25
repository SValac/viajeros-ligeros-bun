<script setup lang="ts">
import type { MapLocation } from '~/types/travel';

const modelValue = defineModel<MapLocation | undefined>();

// State
const searchInput = shallowRef('');
const suggestions = shallowRef<any[]>([]);
const selectedSuggestion = shallowRef<any>(null);
const mapContainer = useTemplateRef<HTMLDivElement>('mapContainer');
// shallowRef: external Google Maps objects don't need deep reactivity
const map = shallowRef<any>(null);
const marker = shallowRef<any>(null);
const sessionToken = shallowRef<any>(null);

// Composables
const { loadGoogleMaps, isGoogleMapsLoaded, getGoogleMaps, debounce, importPlacesLibrary, importMarkerLibrary, mapId } = useGoogleMaps();
const googleMapsLoaded = computed(() => isGoogleMapsLoaded());

// Computed
const hasLocation = computed(() => !!modelValue.value?.lat && !!modelValue.value?.lng);
const locationDisplay = computed(() => {
  if (!hasLocation.value)
    return 'No se ha seleccionado ubicación';
  const { lat, lng, address } = modelValue.value!;
  return address || `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
});

// Methods
function initializeMap() {
  if (!googleMapsLoaded.value || !mapContainer.value)
    return;

  const google = getGoogleMaps();
  if (!google)
    return;

  const center = modelValue.value
    ? { lat: modelValue.value.lat, lng: modelValue.value.lng }
    : { lat: 19.43, lng: -99.13 };

  map.value = new google.maps.Map(mapContainer.value, {
    zoom: 15,
    center,
    mapId: mapId || 'DEMO_MAP_ID',
    mapTypeControl: true,
    fullscreenControl: true,
    zoomControl: true,
  });

  if (modelValue.value) {
    void createMarker(modelValue.value.lat, modelValue.value.lng).catch((error) => {
      console.warn('Error creando marcador inicial:', error);
    });
  }

  map.value.addListener('click', (event: any) => {
    const { lat, lng } = event.latLng;
    updateLocation(lat(), lng());
  });
}

async function createMarker(lat: number, lng: number) {
  if (!map.value)
    return;

  if (marker.value)
    marker.value.map = null;

  const { AdvancedMarkerElement } = await importMarkerLibrary();
  marker.value = new AdvancedMarkerElement({
    position: { lat, lng },
    map: map.value,
    gmpDraggable: true,
  });

  marker.value.addListener('dragend', () => {
    const position = marker.value?.position;
    if (!position)
      return;
    const lat = typeof position.lat === 'function' ? position.lat() : position.lat;
    const lng = typeof position.lng === 'function' ? position.lng() : position.lng;
    if (typeof lat === 'number' && typeof lng === 'number') {
      updateLocation(lat, lng);
    }
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

  void createMarker(lat, lng).catch((error) => {
    console.warn('Error actualizando marcador:', error);
  });

  const location: MapLocation = { lat, lng, address: modelValue.value?.address };
  modelValue.value = location;

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
      modelValue.value = {
        lat,
        lng,
        address: result.results[0].formatted_address,
        placeId: result.results[0].place_id,
      };
    }
  }
  catch (error) {
    console.warn('Error en reverse geocoding:', error);
  }
}

const handleSearchInput = debounce(async (query: string) => {
  if (!query.trim() || !googleMapsLoaded.value) {
    suggestions.value = [];
    sessionToken.value = null;
    return;
  }

  try {
    const { AutocompleteSuggestion, AutocompleteSessionToken } = await importPlacesLibrary();
    if (!sessionToken.value)
      sessionToken.value = new AutocompleteSessionToken();
    const { suggestions: results } = await AutocompleteSuggestion.fetchAutocompleteSuggestions({
      input: query,
      sessionToken: sessionToken.value,
    });
    suggestions.value = results;
  }
  catch (error) {
    console.warn('Error en autocomplete:', error);
    suggestions.value = [];
  }
}, 300);

async function selectSuggestion(suggestion: any) {
  if (!googleMapsLoaded.value)
    return;

  searchInput.value = suggestion.placePrediction.text?.toString() ?? '';
  suggestions.value = [];

  try {
    const place = suggestion.placePrediction.toPlace();
    await place.fetchFields({ fields: ['location', 'formattedAddress', 'id'] });
    sessionToken.value = null;

    const lat = place.location.lat();
    const lng = place.location.lng();

    updateLocation(lat, lng);

    modelValue.value = {
      lat,
      lng,
      address: place.formattedAddress,
      placeId: place.id,
    };
  }
  catch (error) {
    sessionToken.value = null;
    console.warn('Error obteniendo detalles del lugar:', error);
  }
}

function clearLocation() {
  searchInput.value = '';
  selectedSuggestion.value = null;
  suggestions.value = [];
  sessionToken.value = null;
  if (marker.value)
    marker.value.map = null;
  marker.value = null;
  modelValue.value = undefined;
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
  sessionToken.value = null;
  if (marker.value) {
    marker.value.map = null;
    marker.value = null;
  }
  map.value = null;
});

// Fires when Google Maps finishes loading for the first time
watch(googleMapsLoaded, (loaded) => {
  if (loaded)
    initializeMap();
}, { flush: 'post' });

watch(modelValue, (newVal) => {
  if (newVal && !selectedSuggestion.value) {
    searchInput.value = newVal.address || `${newVal.lat}, ${newVal.lng}`;
  }
});
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
              v-for="suggestion in suggestions"
              :key="suggestion.placePrediction.placeId"
              type="button"
              class="w-full text-left px-3 py-2 hover:bg-blue-50 border-b last:border-b-0 transition-colors"
              @click="selectSuggestion(suggestion)"
            >
              <div class="text-sm font-medium text-gray-900">
                {{ suggestion.placePrediction.mainText?.toString() ?? suggestion.placePrediction.text?.toString() }}
              </div>
              <div class="text-xs text-gray-500">
                {{ suggestion.placePrediction.secondaryText?.toString() }}
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

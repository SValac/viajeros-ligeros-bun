# PLAN: Migración de google.maps.Marker a AdvancedMarkerElement

**Feature**: Migración de Marker legacy a Advanced Marker  
**Status**: Pendiente  
**Fecha**: 2026-04-24  
**Motivación**: `google.maps.Marker` deprecado desde febrero 2024. Requiere `mapId` en el mapa — paso externo bloqueante que diferencia esta migración de la de AutocompleteService.

---

## Objetivo

Reemplazar `google.maps.Marker` por `google.maps.marker.AdvancedMarkerElement` en `map-location-picker.vue`, configurando el `mapId` requerido en Google Cloud Console, variables de entorno y composable.

| Legacy | Nuevo |
|--------|-------|
| `new google.maps.Marker({ draggable: true })` | `new AdvancedMarkerElement({ gmpDraggable: true })` |
| `event.latLng.lat()` en dragend | `marker.position.lat()` en dragend |
| Sin `mapId` en el mapa | `mapId` obligatorio en `new google.maps.Map()` |

---

## Paso bloqueante externo (hacer primero)

Antes de tocar código, crear el Map ID en Google Cloud Console:

1. Ir a [Google Cloud Console → Map IDs](https://console.cloud.google.com/google/maps-apis/maps)
2. Crear un nuevo Map ID:
   - **Map type**: JavaScript
   - **Nombre**: `viajeros-ligeros` (o el que prefieras)
3. Copiar el Map ID generado
4. Añadirlo al `.env` local: `NUXT_PUBLIC_GOOGLE_MAPS_MAP_ID=<id-copiado>`

> Para desarrollo se puede usar `DEMO_MAP_ID` como placeholder temporal, pero **no funciona en producción** — Google lo bloquea en dominios productivos.

---

## Archivos a modificar

| Archivo | Cambio |
|---------|--------|
| `.env.example` | Agregar `NUXT_PUBLIC_GOOGLE_MAPS_MAP_ID` |
| `nuxt.config.ts` | Exponer `googleMapsMapId` en `runtimeConfig.public` |
| `app/composables/use-google-maps.ts` | Exponer `mapId` y agregar `importMarkerLibrary()` |
| `app/components/map-location-picker.vue` | Reemplazar `Marker` por `AdvancedMarkerElement` |

---

## Cambios detallados

### `.env.example`

```bash
# Agregar junto a GOOGLE_MAPS_API_KEY
NUXT_PUBLIC_GOOGLE_MAPS_MAP_ID=       # Map ID de Google Cloud Console (requerido para AdvancedMarkerElement)
```

### `nuxt.config.ts`

```ts
runtimeConfig: {
  public: {
    googleMapsApiKey: '',
    googleMapsMapId: '',   // ← agregar
  },
},
```

### `use-google-maps.ts`

Agregar `importMarkerLibrary` análoga a `importPlacesLibrary`, y exponer `mapId`:

```ts
const mapId = config.public.googleMapsMapId as string;

async function importMarkerLibrary() {
  if (!loaded.value)
    throw new Error('Google Maps no está cargado aún');
  const { AdvancedMarkerElement } =
    await (window as any).google.maps.importLibrary('marker');
  return { AdvancedMarkerElement };
}

return {
  // ... existente
  mapId,
  importMarkerLibrary,
};
```

### `map-location-picker.vue`

#### 1. Importar `mapId` e `importMarkerLibrary` del composable

```ts
const { loadGoogleMaps, isGoogleMapsLoaded, getGoogleMaps, debounce,
        importPlacesLibrary, importMarkerLibrary, mapId } = useGoogleMaps();
```

#### 2. `initializeMap` — agregar `mapId` al mapa

```ts
// ANTES
map.value = new google.maps.Map(mapContainer.value, {
  zoom: 15,
  center,
  mapTypeControl: true,
  fullscreenControl: true,
  zoomControl: true,
});

// DESPUÉS
map.value = new google.maps.Map(mapContainer.value, {
  zoom: 15,
  center,
  mapId: mapId || 'DEMO_MAP_ID',
  mapTypeControl: true,
  fullscreenControl: true,
  zoomControl: true,
});
```

> `mapId || 'DEMO_MAP_ID'` permite desarrollo sin configurar el ID real. Remover el fallback antes de ir a producción o usar variable de entorno obligatoria.

#### 3. `createMarker` — reemplazar `Marker` por `AdvancedMarkerElement`

```ts
// ANTES
function createMarker(lat: number, lng: number) {
  if (!map.value) return;
  const google = getGoogleMaps();
  if (!google) return;

  if (marker.value) marker.value.setMap(null);

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

// DESPUÉS — función se vuelve async
async function createMarker(lat: number, lng: number) {
  if (!map.value) return;

  if (marker.value) marker.value.map = null;

  const { AdvancedMarkerElement } = await importMarkerLibrary();
  marker.value = new AdvancedMarkerElement({
    position: { lat, lng },
    map: map.value,
    gmpDraggable: true,
  });

  marker.value.addListener('dragend', () => {
    const pos = marker.value.position as google.maps.LatLng;
    updateLocation(pos.lat(), pos.lng());
  });
}
```

**Diferencias clave en dragend:**
- Legacy: coordenadas en `event.latLng.lat()` / `event.latLng.lng()`
- Nuevo: coordenadas en `marker.position.lat()` / `marker.position.lng()` — el event no lleva las coords

**Diferencia en cleanup:**
- Legacy: `marker.setMap(null)`
- Nuevo: `marker.map = null` (propiedad directa, no método)

#### 4. Actualizar cleanup en `onUnmounted` y `clearLocation`

```ts
// ANTES
if (marker.value) marker.value.setMap(null);

// DESPUÉS
if (marker.value) marker.value.map = null;
```

---

## Riesgo: `mapId` en producción

| Entorno | `mapId` | Resultado |
|---------|---------|-----------|
| Desarrollo sin config | `DEMO_MAP_ID` (fallback) | Funciona |
| Producción sin config | `DEMO_MAP_ID` (fallback) | Marcador no renderiza |
| Producción con config | Map ID real de Cloud Console | Funciona |

**Mitigación**: Añadir validación de `mapId` en `use-google-maps.ts` con `console.warn` si está vacío en producción:

```ts
if (!mapId && process.env.NODE_ENV === 'production') {
  console.warn('GOOGLE_MAPS_MAP_ID no configurado — AdvancedMarkerElement no funcionará en producción');
}
```

---

## Criterios de aceptación

- [ ] Map ID creado en Google Cloud Console
- [ ] `NUXT_PUBLIC_GOOGLE_MAPS_MAP_ID` en `.env` y `.env.example`
- [ ] `googleMapsMapId` en `nuxt.config.ts`
- [ ] `importMarkerLibrary()` en composable con guard de carga
- [ ] Marcador se muestra al seleccionar ubicación
- [ ] Marcador es draggable y actualiza coordenadas al soltar
- [ ] Click en el mapa crea marcador en posición correcta
- [ ] `marker.map = null` limpia el marcador en `clearLocation` y `onUnmounted`
- [ ] Sin warning de `google.maps.Marker` en consola
- [ ] Sin regresiones en autocomplete ni reverse geocoding
- [ ] Typecheck pasa (`bun run typecheck`)

---

## Nota sobre `DEMO_MAP_ID`

Remover el fallback `|| 'DEMO_MAP_ID'` antes de hacer deploy a producción, o mejor aún, hacer `googleMapsMapId` obligatorio en el schema de variables de entorno del proyecto.

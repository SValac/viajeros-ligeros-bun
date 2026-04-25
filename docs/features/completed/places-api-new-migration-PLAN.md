# PLAN: Migración a Places API (New) — AutocompleteSuggestion

**Feature**: Migración de Places API legacy a Places API (New)  
**Status**: Pendiente  
**Fecha**: 2026-04-24  
**Motivación**: `AutocompleteService` deprecado para nuevos clientes desde marzo 2025; sin corrección de bugs futuros. Migración reduce costo ~84% por sesión de búsqueda.

---

## Objetivo

Reemplazar las tres APIs legacy de Google Places usadas en `map-location-picker.vue` por sus equivalentes modernos, implementando session tokens para optimización de costos.

| Legacy | Nuevo |
|--------|-------|
| `AutocompleteService.getPlacePredictions()` | `AutocompleteSuggestion.fetchAutocompleteSuggestions()` |
| `PlacesService.getDetails()` con callback | `place.fetchFields()` con async/await |
| `google.maps.Marker` | `google.maps.marker.AdvancedMarkerElement` |

---

## Impacto en costos

| Modelo | Costo por 1,000 selecciones |
|--------|-----------------------------|
| **Actual** (legacy, sin session tokens) | ~$31.15 |
| **Nuevo** (con session tokens, Essentials) | ~$5.00 |
| **Ahorro** | **~84%** |

**Por qué:** Con session tokens, todas las requests de autocomplete dentro de una sesión de usuario son gratuitas. Solo se factura el `fetchFields()` final, y solo por los campos solicitados — al pedir únicamente `location`, `formattedAddress` e `id`, se factura al tier Essentials ($5/1000) en lugar del tier Pro ($17/1000) de la API legacy.

---

## Archivos a modificar

| Archivo | Cambio |
|---------|--------|
| `app/components/map-location-picker.vue` | Reemplazar los tres servicios legacy, agregar session token |
| `app/composables/use-google-maps.ts` | Exponer `importPlacesLibrary()` para carga dinámica |

---

## Cambios detallados

### `use-google-maps.ts`

Agregar función que carga las clases de la nueva API mediante `importLibrary`:

```ts
async function importPlacesLibrary() {
  const { AutocompleteSuggestion, AutocompleteSessionToken } =
    await google.maps.importLibrary('places');
  return { AutocompleteSuggestion, AutocompleteSessionToken };
}
```

Exportarla desde el composable. No requiere cambios en la URL del script — `importLibrary` es nativo del SDK ya cargado con `libraries=places`.

---

### `map-location-picker.vue`

#### 1. Nuevo estado: session token

```ts
// shallowRef: objeto opaco de Google, no necesita deep reactivity
const sessionToken = shallowRef<any>(null);
```

#### 2. `handleSearchInput` — reemplazar `AutocompleteService`

```ts
// ANTES
const service = new google.maps.places.AutocompleteService();
const result = await service.getPlacePredictions({ input: query });
suggestions.value = result.predictions || [];

// DESPUÉS
const { AutocompleteSuggestion, AutocompleteSessionToken } = await importPlacesLibrary();
if (!sessionToken.value) sessionToken.value = new AutocompleteSessionToken();
const { suggestions: results } = await AutocompleteSuggestion.fetchAutocompleteSuggestions({
  input: query,
  sessionToken: sessionToken.value,
});
suggestions.value = results;
```

#### 3. `selectSuggestion` — reemplazar `PlacesService.getDetails()` con callback

```ts
// ANTES — callback con PlacesService
const service = new google.maps.places.PlacesService(map.value || document.createElement('div'));
service.getDetails({ placeId: suggestion.place_id, fields: [...] }, (place) => { ... });

// DESPUÉS — async/await con Place.fetchFields()
const place = suggestion.placePrediction.toPlace();
await place.fetchFields({ fields: ['location', 'formattedAddress', 'id'] });
sessionToken.value = null; // sesión cerrada — próxima búsqueda crea token nuevo
const lat = place.location.lat();
const lng = place.location.lng();
emit('update:modelValue', { lat, lng, address: place.formattedAddress, placeId: place.id });
```

#### 4. Template — estructura de datos cambia

```html
<!-- ANTES -->
{{ suggestion.structured_formatting?.main_text ?? suggestion.description }}
{{ suggestion.structured_formatting?.secondary_text }}

<!-- DESPUÉS -->
{{ suggestion.placePrediction.mainText?.toString() ?? suggestion.placePrediction.text?.toString() }}
{{ suggestion.placePrediction.secondaryText?.toString() }}
```

#### 5. `clearLocation` — cerrar sesión al limpiar

```ts
function clearLocation() {
  sessionToken.value = null; // descartar sesión abierta sin selección
  // ... resto del código existente
}
```

#### 6. `google.maps.Marker` → `AdvancedMarkerElement`

```ts
// ANTES
marker.value = new google.maps.Marker({ position, map, draggable: true });

// DESPUÉS
const { AdvancedMarkerElement } = await google.maps.importLibrary('marker');
marker.value = new AdvancedMarkerElement({ position, map });
// Nota: AdvancedMarkerElement requiere mapId en la inicialización del mapa
```

> Nota: `AdvancedMarkerElement` requiere que el mapa se cree con `mapId` configurado en Google Cloud Console. Evaluar si implementar en esta misma iteración o como tarea separada.

---

## Gestión del riesgo: session tokens abiertos

El principal riesgo de la nueva API es dejar una sesión sin cerrar. Una sesión "huérfana" hace que cada request de autocomplete se facture individualmente ($2.83/1000) en lugar de quedar gratuita.

**Escenarios de riesgo y su mitigación:**

| Escenario | Riesgo | Mitigación |
|-----------|--------|------------|
| Usuario escribe y cierra el modal sin seleccionar | Token queda abierto | `clearLocation()` hace `sessionToken.value = null` |
| Usuario borra el input manualmente | Token queda abierto innecesariamente | Si `query` queda vacío, hacer `sessionToken.value = null` en `handleSearchInput` |
| Componente se desmonta con búsqueda activa | Token queda en memoria | `onUnmounted` → `sessionToken.value = null` |
| Error en `fetchFields` | Token queda abierto | Bloque `catch` → `sessionToken.value = null` |

**Implementación del cierre seguro:**

```ts
// En handleSearchInput — si el input queda vacío
if (!query.trim()) {
  suggestions.value = [];
  sessionToken.value = null; // no tiene sentido mantener sesión sin query
  return;
}

// En el catch de selectSuggestion
catch (error) {
  sessionToken.value = null; // evitar sesión huérfana en caso de error
  console.warn('Error obteniendo detalles del lugar:', error);
}

// En onUnmounted
onUnmounted(() => {
  sessionToken.value = null;
  // ... resto del cleanup
});
```

---

## Criterios de aceptación

- [ ] Autocomplete funciona con la nueva API sin warnings en consola
- [ ] Al seleccionar un lugar, la ubicación se actualiza correctamente
- [ ] `sessionToken` se destruye (`null`) después de cada selección exitosa
- [ ] `sessionToken` se destruye al limpiar la ubicación
- [ ] `sessionToken` se destruye al desmontar el componente
- [ ] `sessionToken` se destruye si el input queda vacío
- [ ] `sessionToken` se destruye en caso de error en `fetchFields`
- [ ] El template muestra `mainText` y `secondaryText` correctamente
- [ ] Sin regresiones en la funcionalidad de mapa y geocoding inverso
- [ ] Typecheck pasa (`bun run typecheck`)
- [ ] Lint pasa (`bun run lint:fix`)

---

## Decisión pendiente

`google.maps.Marker` también está deprecated pero requiere configurar `mapId` en Google Cloud Console. Evaluar si se implementa en esta misma iteración o como feature separada: **`migrate-to-advanced-marker`**.

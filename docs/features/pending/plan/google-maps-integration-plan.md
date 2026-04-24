# 📋 PLAN: Integración Google Maps en Travel Activities

**Feature**: Integración de Google Maps en actividades de itinerario  
**Status**: En planificación  
**Fecha**: 2026-04-24

---

## 🎯 Objetivo
Integrar Google Maps (JavaScript API + Places API) para permitir ubicaciones precisas en actividades de itinerario, con manejo de API Key y fallbacks.

---

## 📐 Estrategia General

### Fase 1: Preparación de Datos
- Extender tipo `TravelActivity` con propiedad `mapLocation` (lat, lng, placeId, address)
- Migración Supabase (crear tabla o campo JSONB para `mapLocation`)
- Actualizar DTOs/mappers

### Fase 2: Configuración Google Maps
- Variables de entorno (`GOOGLE_MAPS_API_KEY`)
- Lazy loading de scripts (evitar múltiples cargas)
- Gestión de estado: loading/success/error

### Fase 3: UI - Formulario de Actividad
- Componente de búsqueda con Autocomplete (Places API)
- Mapa interactivo con marcador draggable
- Sincronización bidireccional: búsqueda ↔ mapa
- Modo sin API Key (fallback a text input)

### Fase 4: UI - Card de Actividad
- Mostrar "Ver en Google Maps" si `mapLocation` existe
- Construir URL: `https://www.google.com/maps?q={lat},{lng}`
- Abrir en nueva pestaña

### Fase 5: Manejo de Errores & Performance
- Lazy loading de script + debounce en búsqueda (300ms)
- Validación de coordenadas (-90 a 90 para lat, -180 a 180 para lng)
- Fallbacks si API Key falla o quota excedida

---

## 🏗️ Componentes a Crear/Modificar

| Componente/Archivo | Tipo | Descripción |
|---|---|---|
| `app/types/travel.ts` | Modify | Agregar `mapLocation?` a `TravelActivity` |
| `app/composables/useGoogleMaps.ts` | NEW | Composable para lazy load + estado de API |
| `app/components/map-location-picker.vue` | NEW | Picker con autocomplete + mapa interactivo |
| `app/components/map-location-display.vue` | NEW | Card para mostrar link "Ver en Maps" |
| `activity-form.vue` | Modify | Integrar `map-location-picker` |
| `activity-card.vue` | Modify | Integrar `map-location-display` |
| `use-travel-store.ts` | Modify | Persistencia de `mapLocation` en Supabase |
| `.env.example` | Modify | Agregar `GOOGLE_MAPS_API_KEY` |

---

## 🔄 Decisiones Arquitectónicas

1. **Lazy loading via composable**: No cargar Google Maps a menos que sea necesario (performance)
2. **Componentes separados**: Picker (edit) y Display (view) para separación de concerns
3. **Fallback sin API Key**: Mostrar texto, ocultar mapa/autocomplete
4. **Validación en frontend + backend**: Lat/lng válidos antes de persistir
5. **Retrocompatibilidad**: `mapLocation` es opcional, no rompe actividades existentes

---

## ⚠️ Consideraciones

- API Key debe estar restringida por dominio en Google Cloud
- Debounce en autocomplete es crítico para no exceder cuota
- Error handling debe ser graceful (no romper UI)
- Testing sin API Key es importante

---

## ✅ Criterios de Aceptación
- [ ] Guardar/editar `mapLocation`
- [ ] Autocomplete funciona
- [ ] Mapa interactivo
- [ ] Funciona sin API Key
- [ ] Card muestra link
- [ ] Link abre ubicación correcta
- [ ] Sin errores en consola

# 📋 TASKS: Integración Google Maps en Travel Activities

**Plan de referencia**: `docs/features/pending/plan/google-maps-integration-plan.md`  
**Generado**: 2026-04-24  
**Status**: Por iniciar

---

## 📊 Desglose de Tareas

### ✅ FASE 1: Tipos de datos

#### **T1** - Extender TravelActivity con mapLocation
**Descripción**: Agregar propiedad `mapLocation?` al tipo `TravelActivity`  
**Archivos**: `app/types/travel.ts`  
**Dependencias**: Ninguna  
**Detalles**:
- `mapLocation` es objeto opcional con: `lat: number`, `lng: number`, `placeId?: string`, `address?: string`
- Agregar validador: lat ∈ [-90, 90], lng ∈ [-180, 180]
- Asegurar retrocompatibilidad (actividades sin mapLocation deben funcionar)

---

#### **T2** - Migración Supabase para mapLocation
**Descripción**: Crear migración Supabase para agregar columna JSONB `map_location` a tabla `travel_activities`  
**Archivos**: `supabase/migrations/[timestamp]_add_map_location.sql`  
**Dependencias**: T1 (tipos deben estar definidos)  
**Detalles**:
- Columna `map_location JSONB NULL`
- No renombrar ni modificar columnas existentes
- Crear índice si es necesario para performance

---

### ✅ FASE 2: Composables & Utilidades

#### **T3** - Crear composable useGoogleMaps
**Descripción**: Composable para lazy loading de Google Maps API + gestión de estado  
**Archivos**: `app/composables/useGoogleMaps.ts`  
**Dependencias**: Ninguna  
**Detalles**:
- Lazy load del script `https://maps.googleapis.com/maps/api/js?key={API_KEY}&libraries=places`
- Estados: `loading`, `loaded`, `error`
- Manejar API Key ausente gracefully
- Evitar múltiples cargas del script
- Debounce integrado (300ms) para búsquedas
- Exportar métodos: `loadGoogleMaps()`, `isGoogleMapsLoaded()`, `getGoogleMaps()`

---

### ✅ FASE 3: Componentes de UI

#### **T4** - Crear componente map-location-picker
**Descripción**: Componente interactivo para seleccionar ubicación (autocomplete + mapa)  
**Archivos**: `app/components/map-location-picker.vue`  
**Dependencias**: T3 (useGoogleMaps)  
**Props**: `modelValue?: { lat: number; lng: number; placeId?: string; address?: string }`  
**Emits**: `update:modelValue`  
**Detalles**:
- Input de búsqueda con autocomplete (Places API)
- Mapa interactivo si Google Maps está cargado
- Marcador draggable para editar ubicación
- Sincronización bidireccional: entrada ↔ mapa ↔ marcador
- Sin API Key: solo mostrar input de texto
- Debounce en búsqueda (300ms)
- Mostrar error si API falla
- Botón "Limpiar ubicación"

---

#### **T5** - Crear componente map-location-display
**Descripción**: Componente para mostrar ubicación en card de actividad (link a Google Maps)  
**Archivos**: `app/components/map-location-display.vue`  
**Dependencias**: Ninguna  
**Props**: `mapLocation?: { lat: number; lng: number; address?: string }`  
**Detalles**:
- Solo mostrar si `mapLocation` existe
- Botón "Ver en Google Maps"
- Construir URL: `https://www.google.com/maps?q={lat},{lng}`
- Abrir en nueva pestaña (`target="_blank"`)
- Mostrar dirección si existe
- Responsive (mobile & desktop)

---

### ✅ FASE 4: Integración en Formularios & Cards

#### **T6** - Integrar map-location-picker en activity-form
**Descripción**: Agregar sección "Ubicación en mapa" al formulario de actividad  
**Archivos**: `app/pages/travels/[id]/itinerary/[activityId]/edit.vue` (o similar)  
**Dependencias**: T4 (map-location-picker)  
**Detalles**:
- Agregar después del campo `ubicacion` (text)
- Vincular v-model a `activity.mapLocation`
- Mostrar/ocultar basado en API Key disponible
- Mantener funcional sin API Key
- Validar coordenadas antes de guardar

---

#### **T7** - Integrar map-location-display en activity-card
**Descripción**: Mostrar ubicación en mapa en card de visualización de actividad  
**Archivos**: `app/components/activity-card.vue` (o similar)  
**Dependencias**: T5 (map-location-display)  
**Detalles**:
- Agregar sección si `activity.mapLocation` existe
- Usar componente `map-location-display`
- Responsive layout

---

### ✅ FASE 5: Persistencia en Store

#### **T8** - Actualizar use-travel-store para mapLocation
**Descripción**: Agregar persistencia de `mapLocation` en Supabase via use-travel-store  
**Archivos**: `app/stores/use-travel-store.ts`  
**Dependencias**: T2 (migración Supabase), T1 (tipos)  
**Detalles**:
- Actualizar action `saveActivity()` para persistir `mapLocation`
- Actualizar action `fetchActivityById()` para cargar `mapLocation`
- Actualizar action `updateActivity()` para actualizar `mapLocation`
- Manejar caso: `mapLocation` undefined o null (no sobrescribir)
- Validación: rechazar si coordenadas inválidas

---

### ✅ FASE 6: Configuración & Documentación

#### **T9** - Agregar variables de entorno
**Descripción**: Agregar `GOOGLE_MAPS_API_KEY` a `.env.example` y documentar setup  
**Archivos**: `.env.example`, `docs/setup/google-maps-setup.md`  
**Dependencias**: Ninguna (documentación)  
**Detalles**:
- Agregar `GOOGLE_MAPS_API_KEY=` a `.env.example`
- Documentar pasos en Google Cloud Console:
  - Crear proyecto
  - Habilitar APIs: Maps JavaScript API, Places API
  - Crear API Key
  - Restringir por dominio HTTP
  - Configurar facturación
- Advertencia: no exponer API Key sin restricciones

---

## 🔗 Dependencias de Tareas

```
T1 (TravelActivity type)
├── T2 (Migración Supabase)
│   └── T8 (Persistencia en store)
│       ├── T6 (Integrar en form)
│       └── T7 (Integrar en card)
│
T3 (useGoogleMaps composable)
├── T4 (map-location-picker)
│   └── T6 (Integrar en form)
│
T5 (map-location-display)
└── T7 (Integrar en card)

T9 (Setup docs - sin dependencias)
```

---

## 📦 Ondas de Ejecución

### ⚡ Wave 1 — Parallelizable (sin dependencias)
- T1: Extender TravelActivity type
- T3: Crear useGoogleMaps composable
- T9: Agregar variables de entorno

### ⚡ Wave 2 — Parallelizable (dependen de Wave 1)
- T2: Migración Supabase (depende de T1)
- T4: map-location-picker (depende de T3)
- T5: map-location-display (sin dependencias reales)

### ⚡ Wave 3 — Secuencial (dependen de Wave 2)
- T8: Persistencia en store (depende de T2)

### ⚡ Wave 4 — Parallelizable (dependen de Wave 3)
- T6: Integración en form (depende de T4, T8)
- T7: Integración en card (depende de T5)

---

## ✅ Criterios de Aceptación Generales

- [ ] Todas las tareas completadas
- [ ] Sin errores de TypeScript
- [ ] Sin warnings en consola
- [ ] Funciona con API Key
- [ ] Funciona sin API Key (graceful degradation)
- [ ] Tests unitarios para composables
- [ ] Actividades existentes no se rompen

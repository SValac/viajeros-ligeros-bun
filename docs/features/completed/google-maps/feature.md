# 🧩 Feature: Integración de ubicación precisa con Google Maps en actividades de itinerario

---

## 📌 Contexto actual
La aplicación web permite gestionar viajes locales en autobuses.  
Cada viaje tiene un **itinerario** compuesto por múltiples **actividades**.

Cada actividad actualmente contiene:
- Día
- Título
- Hora
- Ubicación (string descriptivo)
- Descripción

### ⚠️ Problema actual
La ubicación es solo texto, lo que dificulta encontrar el lugar exacto en mapas.

---

## 🎯 Objetivo de la feature
Permitir asociar a cada actividad una **ubicación precisa usando Google Maps**, mejorando la experiencia del usuario para encontrar fácilmente los lugares.

---

## 🧱 Cambios requeridos

---

### 1. Modelo de datos

#### 1.1 Modificar entidad `TravelActivity`

Agregar nueva propiedad:

```ts
mapLocation?: {
  lat: number;
  lng: number;
  placeId?: string;
  address?: string;
}
```

#### 1.2 Validaciones

- `lat` y `lng` deben ser numéricos válidos  
- Rango válido:
  - `lat`: -90 a 90  
  - `lng`: -180 a 180  
- `mapLocation` es opcional (retrocompatibilidad)

#### 1.3 Persistencia

Actualizar:

- Base de datos (campo JSON o columnas separadas)
- DTOs / Interfaces
- Mappers (backend ↔ frontend)

---

### 2. UI - Formulario de actividad

#### 2.1 Crear sección "Ubicación en mapa"

Agregar debajo del campo `ubicacion`.

**Componentes:**
- Input de búsqueda
- Contenedor de mapa
- Botón para limpiar ubicación

---

#### 2.2 Implementar Autocomplete (Places API)

**Comportamiento:**
- Input con sugerencias en tiempo real

Al seleccionar:
- Obtener:
  - `lat`
  - `lng`
  - `placeId`
  - `address`
- Guardar en `mapLocation`

---

#### 2.3 Implementar mapa interactivo

Mostrar mapa si existe API Key

Permitir:
- Click para colocar marcador
- Drag del marcador

**Eventos:**
- `onClick` → actualizar lat/lng
- `onDragEnd` → actualizar lat/lng

---

#### 2.4 Sincronización UI

- Si usuario selecciona lugar:
  - Centrar mapa
  - Mostrar marcador

- Si usuario edita manualmente:
  - Actualizar marcador

---

#### 2.5 Modo sin API Key

Si `GOOGLE_MAPS_API_KEY` no existe:

**Ocultar:**
- Mapa
- Autocomplete

**Mostrar mensaje opcional:**
> "Ubicación en mapa no disponible"

**Mantener funcional:**
- Campo `location`

---

#### 2.6 Guardado

Al guardar actividad:
- Incluir `mapLocation` solo si existe
- No sobrescribir si no se usa

---

### 3. UI - Card de actividad

#### 3.1 Crear sección "Ubicación en mapa"

Mostrar solo si `mapLocation` existe.

---

#### 3.2 Mostrar contenido

Opciones:
- Botón: **"Ver en Google Maps"**
- (Opcional futuro) mini mapa embed

---

#### 3.3 Redirección

Construir URL:

```
https://www.google.com/maps?q={lat},{lng}
```

Ejemplo:

```
https://www.google.com/maps?q=19.2452,-103.7241
```

---

#### 3.4 Comportamiento

- Click abre en nueva pestaña
- Debe funcionar en:
  - Desktop
  - Mobile (abre app si está instalada)

---

### 4. Integración con Google Maps

#### 4.1 APIs a utilizar

- Google Maps JavaScript API
- Google Places API

---

#### 4.2 Carga de scripts

- Implementar lazy loading
- Evitar múltiples cargas

**Manejar estado:**
- `loading`
- `success`
- `error`

---

#### 4.3 Manejo de errores

**Casos:**
- API Key inválida
- Límite de cuota excedido
- Fallo de red

**Fallback:**
- Desactivar mapa
- No romper UI

---

### 5. Configuración

#### 5.1 Variables de entorno

```
GOOGLE_MAPS_API_KEY=
```

---

#### 5.2 Configuración Google Cloud

**Pasos requeridos:**
- Crear proyecto
- Habilitar APIs:
  - Maps JavaScript API
  - Places API
- Crear API Key
- Restringir API Key:
  - HTTP referrers (dominio)
- Configurar facturación

---

#### 5.3 Seguridad

- No exponer API Key sin restricciones
- Usar restricciones por dominio

---

### 6. Performance

- Lazy load del script
- Debounce en búsqueda (300ms recomendado)
- Evitar renders innecesarios
- Reutilizar instancia de mapa si aplica

---

### 7. Testing

#### 7.1 Casos funcionales

- Crear actividad con ubicación desde mapa
- Editar actividad existente
- Eliminar ubicación
- Abrir link de Google Maps

---

#### 7.2 Casos edge

- Sin API Key
- API falla
- Coordenadas inválidas
- Actividad sin `mapLocation`

---

### 8. Criterios de aceptación

- [ ] Se puede guardar `mapLocation`
- [ ] Autocomplete funciona con API Key
- [ ] Mapa interactivo funcional
- [ ] Funciona sin API Key
- [ ] Card muestra link a Maps
- [ ] Link abre ubicación correcta
- [ ] No hay errores en consola

---

### 9. Futuras mejoras

- Mapa embebido en card
- Vista global del itinerario en mapa
- Rutas entre actividades
- Sugerencias inteligentes de lugares
- Cache de lugares seleccionados

---
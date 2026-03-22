# Feature: Filtrar Catálogos por Ubicación y Categoría

**Archivo:** `docs/features/completed/filter-catalogs-feature.md`
**Rama:** `feature/filter-catalogs-by`
**Estado:** COMPLETADA
**Fecha de creación del plan:** 2026-03-22
**Fecha de implementación:** 2026-03-22

---

## 1. Análisis del Estado Actual

### 1.1 Lo que ya existe

El proyecto cuenta con un sistema de catálogo de proveedores completamente funcional. A continuación se detalla lo existente:

**Tipos (`/app/types/provider.ts`):**
- `ProviderCategory` — union type con 6 valores: `guias`, `transporte`, `hospedaje`, `operadores-autobus`, `comidas`, `otros`
- `ProviderLocation` — objeto con campos `ciudad: string`, `estado: string`, `pais: string` (todos requeridos)
- `Provider` — modelo principal que ya incluye `ubicacion: ProviderLocation`
- `ProviderFilters` — tipo declarado pero **sin uso activo en el store ni en las páginas**: `{ categoria?: ProviderCategory; activo?: boolean; searchTerm?: string; }`

**Store (`/app/stores/use-provider-store.ts`):**
- `allProviders` — todos los proveedores ordenados alfabéticamente, sin filtrado
- `getProvidersByCategory(categoria)` — getter funcional pero solo devuelve activos de UNA categoría
- No existe ningún getter que combine filtros de categoría + ubicación + búsqueda de texto
- No existe estado reactivo para filtros activos en el store

**Páginas:**
- `/app/pages/providers/index.vue` — dashboard general: muestra `providerStore.allProviders` en una `UTable` sin ningún control de filtro en la UI
- `/app/pages/providers/[categoria].vue` — página dinámica por categoría: usa `getProvidersByCategory` y muestra solo activos; tampoco tiene filtro de ubicación

**Componentes:**
- `provider-form.vue` — formulario CRUD completo con campo de ubicación (ciudad/estado/país)
- `provider-selector.vue` — selector con filtro por categoría (solo para uso en servicios de viaje, no para el dashboard)
- `the-sidebar.vue` — ya tiene enlaces directos a cada categoría como sub-ítems de navegación

### 1.2 Brechas identificadas

| Necesidad | Estado actual |
|---|---|
| Filtrar tabla por categoría en `index.vue` | No existe, solo hay tarjetas de estadística |
| Filtrar tabla por ubicación (ciudad/estado/pais) | No existe en ninguna página |
| Búsqueda de texto libre | No existe |
| Mostrar filtros activos como chips eliminables | No existe |
| Limpiar todos los filtros con un botón | No existe |
| Getter combinado en el store | Solo existe `getProvidersByCategory` (un criterio, solo activos) |
| Tipo `ProviderFilters` con campo de ubicación | El tipo actual no incluye campos de ubicación |

### 1.3 Lo que NO hay que tocar

- La lógica de CRUD (`addProvider`, `updateProvider`, `deleteProvider`, `toggleProviderStatus`) — intacta
- El componente `provider-selector.vue` — es para servicios de viaje, no para el dashboard
- Los tipos base `Provider`, `ProviderContact`, `ProviderLocation` — ya están bien definidos
- La página `[categoria].vue` — ya actúa como un filtro de navegación; se puede mejorar agregando filtro de ubicación secundario

---

## 2. Diseño de Componentes Nuevos

### 2.1 `provider-filter-bar.vue` (nuevo componente central)

**Ruta:** `/app/components/provider-filter-bar.vue`

**Responsabilidad:** Barra de filtros reutilizable que emite un objeto `ProviderFilters` cada vez que el usuario modifica cualquier criterio. Solo presenta la UI; la lógica de filtrado vive en el store.

**Props:**
```ts
type Props = {
  modelValue: ProviderFilters;
  availableCiudades: string[];   // lista dinámica derivada del store
  availableEstados: string[];    // lista dinámica derivada del store
  showCategoryFilter?: boolean;  // false en [categoria].vue donde la categoría es fija
};
```

**Emits:**
```ts
emit('update:modelValue', filters: ProviderFilters)
```

**Estructura visual:**
```
[ 🔍 Buscar por nombre... ] [ Categoría ▼ ] [ Ciudad ▼ ] [ Estado ▼ ] [ Limpiar filtros × ]
```

**Controles internos:**
- `UInput` con icono `i-lucide-search` — búsqueda de texto libre (debounce de 300ms con `watchDebounced` de VueUse si está disponible, si no, con `setTimeout` manual)
- `USelect` para categoría (solo visible si `showCategoryFilter !== false`)
- `USelect` para ciudad — opciones derivadas de `availableCiudades` prop, con opción "Todas las ciudades"
- `USelect` para estado — opciones derivadas de `availableEstados` prop, con opción "Todos los estados"
- `UButton` con `variant="ghost"` e icono `i-lucide-x` para limpiar todo — deshabilitado si no hay filtros activos

### 2.2 `provider-active-filters.vue` (nuevo componente de chips)

**Ruta:** `/app/components/provider-active-filters.vue`

**Responsabilidad:** Mostrar los filtros activos como chips/badges eliminables individualmente. Permite ver de un vistazo qué filtros están aplicados y eliminar uno sin limpiar el resto.

**Props:**
```ts
type Props = {
  filters: ProviderFilters;
  resultCount: number; // cuántos proveedores coinciden
};
```

**Emits:**
```ts
emit('remove-filter', key: keyof ProviderFilters)
emit('clear-all')
```

**Estructura visual (cuando hay filtros activos):**
```
Mostrando 3 de 6 proveedores   [Guías ×]  [Ciudad de México ×]  [Limpiar todo]
```

**Lógica:** Solo se renderiza si al menos un campo de `filters` tiene valor. Muestra etiquetas legibles por humano (ej: `'guias'` → `'Guías'`) usando los mismos mapas de `getCategoryLabel` que ya existen en las páginas.

---

## 3. Cambios al Store de Pinia

### 3.1 Nuevos campos de estado en `use-provider-store.ts`

Agregar estado reactivo para los filtros activos directamente en el store:

```ts
// Estado de filtros (nuevo)
const activeFilters = ref<ProviderFilters>({});
```

### 3.2 Getter `filteredProviders` (nuevo computed principal)

Este getter reemplaza el uso directo de `allProviders` en las páginas del dashboard:

```ts
const filteredProviders = computed(() => {
  let result = [...providers.value];

  // Filtro por estado activo (por defecto solo activos)
  if (activeFilters.value.activo !== undefined) {
    result = result.filter(p => p.activo === activeFilters.value.activo);
  }
  else {
    result = result.filter(p => p.activo);
  }

  // Filtro por categoría
  if (activeFilters.value.categoria) {
    result = result.filter(p => p.categoria === activeFilters.value.categoria);
  }

  // Filtro por ciudad
  if (activeFilters.value.ciudad) {
    result = result.filter(
      p => p.ubicacion.ciudad.toLowerCase() === activeFilters.value.ciudad!.toLowerCase(),
    );
  }

  // Filtro por estado/provincia
  if (activeFilters.value.estado) {
    result = result.filter(
      p => p.ubicacion.estado.toLowerCase() === activeFilters.value.estado!.toLowerCase(),
    );
  }

  // Filtro por búsqueda de texto libre (nombre o descripción)
  if (activeFilters.value.searchTerm) {
    const term = activeFilters.value.searchTerm.toLowerCase();
    result = result.filter(
      p =>
        p.nombre.toLowerCase().includes(term)
        || p.descripcion?.toLowerCase().includes(term)
        || p.contacto.nombre?.toLowerCase().includes(term),
    );
  }

  return result.sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'));
});
```

### 3.3 Getters derivados para opciones de filtro (nuevos)

```ts
// Ciudades únicas de proveedores activos (para poblar el USelect de ciudad)
const availableCiudades = computed(() =>
  [...new Set(providers.value.filter(p => p.activo).map(p => p.ubicacion.ciudad))].sort(),
);

// Estados únicos de proveedores activos (para poblar el USelect de estado)
const availableEstados = computed(() =>
  [...new Set(providers.value.filter(p => p.activo).map(p => p.ubicacion.estado))].sort(),
);

// Conteo de resultados filtrados
const filteredCount = computed(() => filteredProviders.value.length);

// Indica si hay algún filtro activo (para habilitar/deshabilitar "Limpiar")
const hasActiveFilters = computed(() =>
  Object.values(activeFilters.value).some(v => v !== undefined && v !== ''),
);
```

### 3.4 Actions para gestionar filtros (nuevas)

```ts
function setFilters(filters: ProviderFilters): void {
  activeFilters.value = { ...filters };
}

function updateFilter<K extends keyof ProviderFilters>(
  key: K,
  value: ProviderFilters[K],
): void {
  activeFilters.value = { ...activeFilters.value, [key]: value };
}

function removeFilter(key: keyof ProviderFilters): void {
  const updated = { ...activeFilters.value };
  delete updated[key];
  activeFilters.value = updated;
}

function clearFilters(): void {
  activeFilters.value = {};
}
```

### 3.5 Exposición en el return del store

Agregar al objeto retornado:
```ts
return {
  // ... existentes ...
  activeFilters,
  filteredProviders,
  availableCiudades,
  availableEstados,
  filteredCount,
  hasActiveFilters,
  setFilters,
  updateFilter,
  removeFilter,
  clearFilters,
};
```

---

## 4. Cambios en Tipos TypeScript

### 4.1 Ampliar `ProviderFilters` en `/app/types/provider.ts`

El tipo actual es:
```ts
export type ProviderFilters = {
  categoria?: ProviderCategory;
  activo?: boolean;
  searchTerm?: string;
};
```

Agregar los campos de ubicación que se usarán como filtros:
```ts
export type ProviderFilters = {
  categoria?: ProviderCategory;
  activo?: boolean;
  searchTerm?: string;
  ciudad?: string;   // NUEVO: filtro por ciudad exacta
  estado?: string;   // NUEVO: filtro por estado/provincia exacto
};
```

---

## 5. Cambios en Páginas del Dashboard

### 5.1 `/app/pages/providers/index.vue` (modificar)

**Cambios:**

1. Reemplazar `providerStore.allProviders` por `providerStore.filteredProviders`

2. Agregar estado local para los filtros:
```ts
const filters = computed({
  get: () => providerStore.activeFilters,
  set: (val) => providerStore.setFilters(val),
});
```

3. Limpiar filtros en `onMounted` para evitar estado residual al volver a esta página:
```ts
onMounted(() => {
  providerStore.clearFilters();
});
```

4. Agregar en el template, entre el header y las tarjetas de estadística:
```html
<ProviderFilterBar
  v-model="filters"
  :available-ciudades="providerStore.availableCiudades"
  :available-estados="providerStore.availableEstados"
/>
<ProviderActiveFilters
  :filters="providerStore.activeFilters"
  :result-count="providerStore.filteredCount"
  @remove-filter="providerStore.removeFilter"
  @clear-all="providerStore.clearFilters"
/>
```

5. Actualizar estado vacío diferenciado:
```html
<div v-if="providers.length === 0">
  <template v-if="providerStore.hasActiveFilters">
    No se encontraron proveedores con los filtros aplicados
    <UButton @click="providerStore.clearFilters">Limpiar filtros</UButton>
  </template>
  <template v-else>
    No hay proveedores aún
    <UButton @click="openCreateModal">Agregar Primer Proveedor</UButton>
  </template>
</div>
```

### 5.2 `/app/pages/providers/[categoria].vue` (modificar)

La categoría viene fija por la URL, por lo que el filtro de categoría no se muestra. Solo se agregan los filtros de ubicación y búsqueda.

**Cambios:**

1. Gestionar el ciclo de vida del filtro de categoría:
```ts
onMounted(() => {
  providerStore.loadMockData();
  providerStore.setFilters({ categoria: categoria.value });
});

onUnmounted(() => {
  providerStore.clearFilters();
});

watch(categoria, (newCategoria) => {
  providerStore.updateFilter('categoria', newCategoria);
});
```

2. Agregar `ProviderFilterBar` con `show-category-filter="false"` y `ProviderActiveFilters` en el template.

3. Actualizar el contador del header para reflejar filtros activos.

---

## 6. Orden de Implementación (Fases)

### Fase 1 — Tipos y Store (base, sin UI)

1. Ampliar `ProviderFilters` en `/app/types/provider.ts` — agregar `ciudad?` y `estado?`
2. Agregar en `/app/stores/use-provider-store.ts`:
   - Estado `activeFilters`
   - Computed `filteredProviders`, `availableCiudades`, `availableEstados`, `filteredCount`, `hasActiveFilters`
   - Actions `setFilters`, `updateFilter`, `removeFilter`, `clearFilters`
   - Agregar todos al objeto `return`
3. Ejecutar `bun run typecheck` para validar

**Criterio de aceptación:** El store expone los nuevos getters y actions sin errores de TypeScript.

### Fase 2 — Componente `ProviderFilterBar`

1. Crear `/app/components/provider-filter-bar.vue`
2. Implementar todos los controles con `v-model` interno
3. Emitir `update:modelValue` en cada cambio
4. Agregar debounce 300ms para el campo de búsqueda
5. Ejecutar `bun run lint`

**Criterio de aceptación:** El componente acepta props y emite eventos correctamente.

### Fase 3 — Componente `ProviderActiveFilters`

1. Crear `/app/components/provider-active-filters.vue`
2. Mapear cada key de `ProviderFilters` a una etiqueta legible
3. Implementar visibilidad condicional (solo si `hasActiveFilters`)
4. Emitir `remove-filter` y `clear-all`
5. Ejecutar `bun run lint`

**Criterio de aceptación:** Los chips aparecen al aplicar filtros y desaparecen al limpiarlos.

### Fase 4 — Integración en `index.vue`

1. Cambiar computed `providers` para usar `filteredProviders`
2. Agregar `ProviderFilterBar` y `ProviderActiveFilters` en el template
3. Manejar el estado vacío diferenciado
4. Ejecutar `bun run typecheck && bun run lint`

**Criterio de aceptación:** Los filtros funcionan en combinación y la tabla se actualiza reactivamente.

### Fase 5 — Integración en `[categoria].vue`

1. Agregar `onMounted`/`onUnmounted`/`watch` para gestionar el filtro de categoría
2. Cambiar computed `providers` para usar `filteredProviders`
3. Agregar `ProviderFilterBar` con `show-category-filter="false"`
4. Actualizar contador del header
5. Ejecutar `bun run typecheck && bun run lint`

**Criterio de aceptación:** Al navegar entre categorías, los filtros de ubicación se limpian y el filtro de categoría se actualiza automáticamente.

---

## 7. Consideraciones de UX

### 7.1 Persistencia de filtros durante la navegación

Los filtros **no persisten en `localStorage`**. Se mantienen en memoria durante la sesión pero se resetean al recargar. Al navegar entre sub-páginas dentro de proveedores, los filtros se limpian para evitar estados inconsistentes.

### 7.2 Cómo mostrar filtros activos

- `ProviderActiveFilters` solo se monta si `hasActiveFilters` es `true`
- Cada chip muestra etiqueta legible precedida por el nombre del campo:
  - `Categoría: Guías [×]`
  - `Ciudad: Cancún [×]`
  - `Búsqueda: "hotel" [×]`
- Contador de resultados: `"Mostrando 2 de 6 proveedores"`
- Botón "Limpiar todo" con `variant="ghost"` para no competir visualmente

### 7.3 Formas de limpiar filtros

1. **Un campo individual**: Botón `clearable` de cada `USelect`, o cerrar un chip
2. **Todos los filtros**: Botón "Limpiar filtros" en `ProviderFilterBar` (icono `i-lucide-filter-x`)
3. **Implícitamente**: Al navegar a una página de categoría específica

### 7.4 Estado vacío diferenciado

| Situación | Mensaje | Acción |
|---|---|---|
| Catálogo vacío (sin proveedores) | "No hay proveedores aún. Comienza agregando tu primer proveedor." | Botón "Agregar Primer Proveedor" |
| Sin resultados con filtros activos | "No se encontraron proveedores con los filtros aplicados." | Botón "Limpiar filtros" |
| Sin resultados en categoría + filtros | "No hay {categoría} con los filtros aplicados." | Botón "Limpiar filtros de ubicación" |

### 7.5 Orden de controles en FilterBar

1. Búsqueda de texto (más genérica, más usada)
2. Categoría (dimensión principal)
3. Ciudad (dimensión geográfica primaria)
4. Estado/Provincia (dimensión geográfica secundaria)
5. Botón "Limpiar" (al final)

---

## 8. Posibles Problemas y Mitigaciones

| Problema potencial | Mitigación |
|---|---|
| `[categoria].vue` usa `filteredProviders` pero al montar no ha ejecutado `setFilters` aún | Usar `onBeforeMount` para inicializar `activeFilters` con el valor de `categoria` antes del primer render |
| El filtro de categoría en `[categoria].vue` no se limpia si el usuario navega directo a `index.vue` | En `index.vue`, llamar `providerStore.clearFilters()` en `onMounted` |
| Las opciones de `availableCiudades` no coinciden en capitalización con los valores almacenados | Normalizar la comparación usando `.toLowerCase()` en el getter `filteredProviders` (ya contemplado) |
| El debounce del campo de búsqueda puede causar que el usuario vea resultados desactualizados brevemente | 300ms es estándar; reducir a 150ms si hay quejas de latencia percibida |

---

## 9. Archivos Afectados (Resumen)

### Archivos a crear

1. `/app/components/provider-filter-bar.vue` — barra de filtros reutilizable
2. `/app/components/provider-active-filters.vue` — chips de filtros activos

### Archivos a modificar

1. `/app/types/provider.ts` — ampliar `ProviderFilters` con `ciudad?` y `estado?`
2. `/app/stores/use-provider-store.ts` — agregar estado, getters y actions de filtrado
3. `/app/pages/providers/index.vue` — integrar FilterBar, ActiveFilters y usar `filteredProviders`
4. `/app/pages/providers/[categoria].vue` — integrar FilterBar secundario y gestionar filtro de categoría

### Archivos sin cambios

- `/app/components/provider-form.vue`
- `/app/components/provider-selector.vue`
- `/app/components/the-sidebar.vue`
- `/app/stores/use-travel-store.ts`
- `/app/types/travel.ts`

---

## 10. Checklist de Testing Manual

**Filtro de categoría (en `index.vue`):**
- [ ] Seleccionar "Guías" muestra solo proveedores de esa categoría
- [ ] Seleccionar "Todos" (limpiar select) muestra todos los activos
- [ ] El chip de categoría aparece al seleccionar y desaparece al limpiar

**Filtro de ciudad:**
- [ ] Seleccionar una ciudad muestra solo proveedores de esa ciudad
- [ ] Las ciudades disponibles se actualizan si se agrega un nuevo proveedor
- [ ] Al limpiar ciudad, la tabla vuelve al estado anterior

**Filtro de estado/provincia:**
- [ ] Seleccionar un estado muestra solo proveedores de ese estado
- [ ] Combinar ciudad + estado filtra correctamente (intersección)

**Búsqueda de texto:**
- [ ] Buscar por nombre encuentra el proveedor correcto
- [ ] Buscar por nombre de contacto también funciona
- [ ] Limpiar el campo de búsqueda restaura todos los resultados
- [ ] El debounce funciona (la tabla no se actualiza en cada tecla)

**Combinación de filtros:**
- [ ] Aplicar categoría + ciudad simultáneamente funciona correctamente
- [ ] Aplicar los 4 filtros a la vez filtra correctamente
- [ ] "Limpiar todo" reinicia todos los filtros a la vez

**Estado vacío:**
- [ ] Con filtros sin resultados: muestra mensaje "sin resultados" con botón "Limpiar filtros"
- [ ] Sin proveedores en absoluto: muestra mensaje original "No hay proveedores aún"

**Navegación entre páginas:**
- [ ] Ir de `index` a `/providers/guias` resetea filtros previos
- [ ] Navegar de `/providers/guias` a `/providers/transporte` actualiza la categoría filtrada
- [ ] Regresar de `/providers/guias` a `index` limpia el filtro de categoría

---

---

## 11. Notas de Implementación

### Desviaciones del plan original

- **`[categoria].vue` usa filtros locales en lugar del store**: Se descubrió una condición de carrera entre el plugin de persistencia de Pinia y el ciclo de vida del componente. La solución fue usar `localFilters` (ref local) en la página de categoría, combinado con `getProvidersByCategory` directamente, en lugar de depender de `activeFilters` en el store. La categoría siempre se garantiza desde la URL.

- **`activeFilters` excluido del persist**: Se agregó `pick: ['providers']` al plugin de persistencia para evitar que el estado de filtros (UI transitoria) se restaure entre sesiones y cause interferencias.

- **Opciones de ciudad/estado en `[categoria].vue` son locales**: Se computan desde los proveedores de la categoría actual (no del store global), para mostrar solo ubicaciones relevantes a la categoría.

- **`USelect` con `placeholder` en lugar de opción vacía**: Nuxt UI no permite `value: ''` en items de `SelectItem`. Se eliminaron las opciones "Todas las X" y se usa el prop `placeholder` nativo del componente.

### Archivos creados
- `app/components/provider-filter-bar.vue`
- `app/components/provider-active-filters.vue`

### Archivos modificados
- `app/types/provider.ts`
- `app/stores/use-provider-store.ts`
- `app/pages/providers/index.vue`
- `app/pages/providers/[categoria].vue`

---

*Última actualización: 2026-03-22*
*Rama de implementación: `feature/filter-catalogs-by`*

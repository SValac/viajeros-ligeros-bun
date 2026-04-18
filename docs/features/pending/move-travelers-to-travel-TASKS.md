# Task Breakdown: Mover Travelers dentro del Viaje

**Feature**: Mover travelers dentro del viaje  
**Rama**: `feature/move-travelers-to-travel`  
**Fecha**: 2026-04-18  
**Estado**: ⏳ Pendiente

---

## 📋 Tareas Identificadas

### T1: Crear estructura de directorios anidados
**Estado**: ⏳ Pendiente (Wave 1)

- Crear directorio: `pages/travels/[id]/travelers/`
- Crear directorio: `pages/travels/[id]/travelers/[travelerId]/`
- Asegurar que siga la convención de rutas de Nuxt 4

**Dependencias**: Ninguna  
**Puede ejecutarse en paralelo**: Sí  
**Skills requeridas**: `@.claude/skills/nuxt`, `@.claude/skills/vue`

---

### T2: Mover y refactorizar index.vue de travelers
**Estado**: ⏳ Pendiente (Wave 2)

- Mover `pages/travelers/index.vue` → `pages/travels/[id]/travelers/index.vue`
- Actualizar lógica para recibir `travel_id` como parámetro de ruta
- Actualizar referencias de estado en Pinia
- Cambiar acceso a parámetros: `useRoute().params.id`

**Dependencias**: T1  
**Puede ejecutarse en paralelo**: Sí (con T3)  
**Skills requeridas**: `@.claude/skills/nuxt`, `@.claude/skills/vue`, `@.claude/skills/pinia`

---

### T3: Mover y refactorizar [id].vue de travelers
**Estado**: ⏳ Pendiente (Wave 2)

- Mover `pages/travelers/[id].vue` → `pages/travels/[id]/travelers/[travelerId].vue`
- Actualizar nombres de parámetros: `[id]` → `[travelerId]`
- Actualizar lógica para filtrar por `travel_id` + `travelerId`
- Actualizar referencias en componentes y Pinia

**Dependencias**: T1  
**Puede ejecutarse en paralelo**: Sí (con T2)  
**Skills requeridas**: `@.claude/skills/nuxt`, `@.claude/skills/vue`, `@.claude/skills/pinia`

---

### T4: Actualizar Pinia store de travelers
**Estado**: ⏳ Pendiente (Wave 3)

- Revisar `stores/travelers.ts` (o similar)
- Agregar lógica para filtrar travelers por `travel_id`
- Actualizar acciones que crean/editan/eliminan travelers
- Asegurar que el contexto del viaje se respete
- Actualizar getters para soportar filtrado por viaje

**Dependencias**: T2, T3  
**Puede ejecutarse en paralelo**: Sí (con T5)  
**Skills requeridas**: `@.claude/skills/pinia`, `@.claude/skills/nuxt`

---

### T5: Buscar y actualizar todos los links internos
**Estado**: ⏳ Pendiente (Wave 3)

- Grep: buscar referencias a `/travelers` en toda la codebase
- Actualizar `<NuxtLink to="/travelers">` → `<NuxtLink to="/travels/[id]/travelers">`
- Actualizar `router.push('/travelers')` → `router.push('/travels/[id]/travelers')`
- Buscar en componentes, stores, y pages
- Documentar todos los cambios encontrados

**Dependencias**: T2, T3  
**Puede ejecutarse en paralelo**: Sí (con T4)  
**Skills requeridas**: `@.claude/skills/nuxt`, `@.claude/skills/vue`

---

### T6: Actualizar navegación y breadcrumbs
**Estado**: ⏳ Pendiente (Wave 4)

- Revisar componentes de navegación que apunten a `/travelers`
- Actualizar menús, botones, y flujos de navegación
- Actualizar breadcrumbs para reflejar la nueva estructura anidada
- Asegurar que los links dinámicos incluyan el `travel_id`

**Dependencias**: T5  
**Puede ejecutarse en paralelo**: No  
**Skills requeridas**: `@.claude/skills/nuxt-ui`, `@.claude/skills/vue`

---

### T7: Verificar y actualizar migraciones/scripts
**Estado**: ⏳ Pendiente (Wave 1)

- Buscar en directorio `migraciones/` para referencias a travelers
- Buscar en `scripts/` o `bin/` para referencias a `/travelers`
- Identificar si hay seeding scripts que dependan de la estructura antigua
- Documentar hallazgos y recomendaciones

**Dependencias**: Ninguna  
**Puede ejecutarse en paralelo**: Sí  
**Skills requeridas**: `@.claude/skills/nuxt`

---

### T8: Testing y validación
**Estado**: ⏳ Pendiente (Wave 5)

- Verificar que la nueva ruta funciona: `/travels/[id]/travelers`
- Verificar que travelers se filtran correctamente por viaje
- Verificar que no hay broken links
- Verificar que el estado se mantiene correctamente
- Pruebas de navegación y enlaces dinámicos

**Dependencias**: T6 (todo lo anterior completado)  
**Puede ejecutarse en paralelo**: No  
**Skills requeridas**: `@.claude/skills/nuxt`, `@.claude/skills/vue`

---

## 🔗 Dependency Graph & Execution Waves

```
Wave 1 (Parallelizable - Sin dependencias)
├── T1: Crear estructura de directorios
└── T7: Verificar migraciones/scripts

Wave 2 (Dependen de T1)
├── T2: Mover y refactorizar index.vue
└── T3: Mover y refactorizar [id].vue

Wave 3 (Dependen de T2, T3)
├── T4: Actualizar Pinia store
└── T5: Buscar y actualizar links internos

Wave 4 (Depende de T5)
└── T6: Actualizar navegación y breadcrumbs

Wave 5 (Depende de todo lo anterior)
└── T8: Testing y validación
```

---

## 📊 Resumen

| Métrica | Valor |
|---------|-------|
| Total de tareas | 8 |
| Tareas en Wave 1 | 2 (paralelo) |
| Tareas en Wave 2 | 2 (paralelo) |
| Tareas en Wave 3 | 2 (paralelo) |
| Tareas en Wave 4 | 1 (secuencial) |
| Tareas en Wave 5 | 1 (secuencial) |
| Máximo paralelismo | 4 dev-agents simultáneamente |
| Ruta crítica | T1 → T2/T3 → T4 → T5 → T6 → T8 |

---

## ✅ Criterio de Completitud

Una tarea se considera **completada** cuando:

- Todos los archivos han sido movidos/creados/modificados según especificación
- Los imports y referencias están actualizados
- No hay errores de linting (`bun run lint:fix`)
- El typecheck pasa (`bun run typecheck`)
- La funcionalidad ha sido validada manualmente

---

## 📝 Notas

- Las skills a usar son: `@.claude/skills/nuxt-ui`, `@.claude/skills/nuxt`, `@.claude/skills/vue`, `@.claude/skills/pinia`
- El proyecto usa Nuxt 4, por lo que los cambios de rutas deben seguir las convenciones de Nuxt 4
- Todos los cambios deben estar en la rama `feature/move-travelers-to-travel`

---

## Documentos Relacionados

- [Plan General](./move-travelers-to-travel-PLAN.md) — Estrategia y contexto general

# Plan: Mover Travelers dentro del Viaje

**Feature**: Mover travelers dentro del viaje  
**Rama**: `feature/move-travelers-to-travel`  
**Fecha**: 2026-04-18  
**Estado**: 🔄 En ejecución

---

## Objetivo

Refactorizar la estructura de rutas de manera que los travelers pasen de ser una entidad independiente en `/travelers` a ser anidados dentro de cada viaje en `/travels/[id]/travelers`.

---

## Contexto

Actualmente existe una ruta `/travelers` con `index.vue` y `[id].vue` donde se pueden agregar travelers para todos los viajes. Esta estructura es grande y confusa cuando hay muchos viajes.

**Objetivo del usuario**: Como usuario, quiero que todo lo relacionado a travelers esté dentro del viaje (ej: `/travels/[id]/travelers`) para poder ver solo los travelers de cada viaje.

---

## Estrategia de Alto Nivel

### 1. Reorganización de Rutas
- Eliminar ruta independiente `/travelers`
- Crear nuevas rutas anidadas:
  - `/travels/[id]/travelers` (listado de travelers del viaje)
  - `/travels/[id]/travelers/[travelerId]` (detalle del traveler)
- Mantener compatibilidad con el resto de la aplicación

### 2. Refactorización de Componentes
- Mover `pages/travelers/index.vue` → `pages/travels/[id]/travelers/index.vue`
- Mover `pages/travelers/[id].vue` → `pages/travels/[id]/travelers/[travelerId].vue`
- Actualizar imports y referencias en componentes relacionados

### 3. Lógica de Estado (Pinia)
- Revisar el store de travelers y asegurar que funciona con el nuevo contexto de viaje
- Filtrar travelers por `travel_id`
- Actualizar acciones y getters que dependan de la estructura antigua

### 4. Actualización de Links y Navegación
- Encontrar todos los lugares donde se navega a `/travelers`
- Cambiar a `/travels/[id]/travelers`
- Actualizar breadcrumbs y menús de navegación

### 5. Base de Datos / API
- Verificar que los endpoints de API sigan siendo válidos
- Asegurar que las queries filtren por `travel_id`

---

## Consideraciones Técnicas Principales

- **Ruteo anidado en Nuxt 4**: Asegurar que los parámetros `[id]` y `[travelerId]` se resuelvan correctamente
- **Estado Pinia**: El store debe saber qué viaje estamos visitando (parámetro desde la ruta)
- **Links internos**: Verificar todos los `<NuxtLink>` y rutas hardcodeadas
- **Ciclo de vida**: Actualizar watchers y efectos que dependan de cambios de ruta
- **Migración de datos**: Verificar que no hay datos huérfanos o inconsistencias

---

## Riesgos y Dependencias

### Riesgos
- ⚠️ Posibles breaking changes si hay otras partes de la app que referencian `/travelers`
- ⚠️ Necesidad de verificar migraciones o scripts que interactúen con travelers
- ⚠️ Cambios en rutas pueden afectar bookmarks o enlaces externos

### Dependencias
- El contexto del viaje debe estar siempre disponible en las nuevas rutas
- Pinia store debe estar sincronizado con la navegación

---

## Stack Utilizado

- **Framework**: Nuxt 4
- **UI Framework**: Vue 3 + Nuxt UI
- **State Management**: Pinia
- **Build Tool**: Bun

---

## Documentos Relacionados

- [Task Breakdown](./move-travelers-to-travel-TASKS.md) — Desglose en 8 tareas concretas

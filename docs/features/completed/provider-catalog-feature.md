# Feature: Gestión de Catálogo de Proveedores

## Estado: ✅ COMPLETADA

**Fecha de inicio**: 2026-01-11
**Fecha de completación**: 2026-02-14

---

## 1. OBJETIVO

Implementar un sistema de gestión de catálogo de proveedores que permita:

- Administrar proveedores de servicios (Guías, Transporte, Hospedaje, Agencias de Autobús, Comidas, Otros)
- Vincular proveedores a servicios de viajes
- Gestionar información de contacto de proveedores
- Mantener estado activo/inactivo de proveedores
- Filtrar y buscar proveedores por categoría

## 2. USER STORY

> **Como usuario**, quiero una sección que permita agregar mis propios catálogos de proveedores (ej: Guías, Transporte, Hospedaje, Operadores de autobús, Comidas, y otros que puedan salir más adelante), para así cada vez que agregue un servicio proporcionado por un proveedor, saber quién es el que me está prestando ese servicio.

---

## 3. ARQUITECTURA DE DATOS

### 3.1 Nuevos Tipos TypeScript

**Archivo**: `/app/types/provider.ts` (NUEVO)

```typescript
// Categorías de proveedores (extensible)
export type ProviderCategory =
  | 'guias'
  | 'transporte'
  | 'hospedaje'
  | 'agencias-autobus'
  | 'comidas'
  | 'otros';

// Información de contacto
export type ProviderContact = {
  nombre?: string;
  telefono?: string;
  email?: string;
  notas?: string;
};

// Modelo principal de proveedor
export type Provider = {
  id: string;
  nombre: string;
  categoria: ProviderCategory;
  descripcion?: string;
  contacto: ProviderContact;
  activo: boolean; // Estado activo/inactivo
  createdAt: string;
  updatedAt: string;
};

// Tipo para formulario
export type ProviderFormData = Omit<Provider, 'id' | 'createdAt' | 'updatedAt'> & {
  id?: string;
};

// Tipo para actualización
export type ProviderUpdateData = Omit<Provider, 'id' | 'createdAt' | 'updatedAt'>;

// Filtros para tabla
export type ProviderFilters = {
  categoria?: ProviderCategory;
  activo?: boolean;
  searchTerm?: string;
};
```

### 3.2 Modificación en Tipos de Viaje

**Archivo**: `/app/types/travel.ts` (MODIFICAR)

```typescript
// MODIFICAR TravelService para agregar relación con proveedor
export type TravelService = {
  id: string;
  nombre: string;
  descripcion?: string;
  incluido: boolean;
  providerId?: string; // NUEVO: Vinculación opcional con proveedor
};
```

**Razón de campo opcional**:
- Retrocompatible con servicios existentes
- No todos los servicios requieren proveedor
- Permite adopción gradual

---

## 4. STORE ARCHITECTURE (PINIA)

### 4.1 Store de Proveedores

**Archivo**: `/app/stores/use-provider-store.ts` (NUEVO)

**Patrón**: Composition API (consistente con `use-travel-store.ts`)

**Estado**:
```typescript
const providers = ref<Provider[]>([]);
const loading = ref(false);
const error = ref<string | null>(null);
```

**Getters Computados**:
- `allProviders` - Todos ordenados alfabéticamente
- `activeProviders` - Solo proveedores activos
- `getProviderById(id)` - Buscar por ID
- `getProvidersByCategory(categoria)` - Filtrar por categoría
- `statsByCategory` - Estadísticas por categoría
- `totalProviders` - Conteo total

**Actions**:
- `addProvider(data)` - Crear proveedor
- `updateProvider(id, data)` - Actualizar proveedor
- `deleteProvider(id)` - Eliminar proveedor (hard delete)
- `toggleProviderStatus(id)` - Activar/desactivar

**Persistencia**:
```typescript
persist: {
  key: 'viajeros-ligeros-providers',
  storage: localStorage,
}
```

### 4.2 Estrategia de Stores

**Decisión**: Store separado (no integrado en travel store)

**Razones**:
- Separación de responsabilidades
- Reusabilidad entre features
- Mantenibilidad independiente
- Escalabilidad (features específicas de proveedores)
- Consistente con principio de responsabilidad única

**Comunicación entre stores**:
- Sin dependencias directas
- Composables orquestan la relación
- UI components hacen lookups según necesidad

---

## 5. COMPONENTES

### 5.1 Componentes Nuevos

#### ProviderForm
**Archivo**: `/app/components/provider-form.vue`

**Props**: `provider?: Provider | null`
**Emits**: `submit`, `cancel`

**Campos del formulario**:
1. Nombre (UInput) - Requerido
2. Categoría (USelect) - Requerido
3. Descripción (UTextarea) - Opcional
4. **Sección de Contacto** (UDivider):
   - Nombre de contacto (UInput)
   - Teléfono (UInput type="tel")
   - Email (UInput type="email")
   - Notas (UTextarea)
5. Estado activo (UCheckbox)

**Validación**: Schema Zod con reglas:
- Nombre: 3-100 caracteres
- Categoría: Enum válido
- Descripción: Max 500 caracteres
- Email: Formato válido
- Teléfono: Max 20 caracteres

#### ProviderSelector
**Archivo**: `/app/components/provider-selector.vue`

**Props**: `modelValue?: string`, `categoria?: ProviderCategory`
**Emits**: `update:modelValue`

**Características**:
- USelect con búsqueda
- Botón "+" para agregar proveedor inline
- Filtra por categoría si se especifica
- Muestra icono + nombre + categoría
- Opción "Sin proveedor" para limpiar

#### Provider Dashboard
**Archivo**: `/app/pages/providers/dashboard.vue`

**Características**:
- Header con título y botón "Nuevo Proveedor"
- Cards de estadísticas (6 cards: Total + 5 categorías)
- Filtros: Categoría, Estado, Búsqueda
- Tabla UTable con columnas:
  - Nombre
  - Categoría (UBadge con color)
  - Contacto (nombre + teléfono)
  - Estado (Activo/Inactivo)
  - Acciones (Ver/Editar/Eliminar)
- Modal para formulario CRUD

### 5.2 Componentes a Modificar

#### TravelServiceForm
**Archivo**: `/app/components/travel-service-form.vue` (MODIFICAR)

**Cambios**:
1. Agregar campo `providerId?` al schema Zod
2. Agregar componente `ProviderSelector` al formulario
3. Pre-llenar nombre del servicio basado en proveedor seleccionado

#### TravelServiceList
**Archivo**: `/app/components/travel-service-list.vue` (MODIFICAR)

**Cambios**:
1. Importar `useProviderStore()`
2. Agregar función `getProviderName(providerId)`
3. Mostrar badge con nombre de proveedor si existe

#### TheSidebar
**Archivo**: `/app/components/the-sidebar.vue` (MODIFICAR)

**Cambios**: Actualizar menú de proveedores

---

## 6. FASES DE IMPLEMENTACIÓN

### Fase 1: Sistema Base de Proveedores (PENDIENTE)

**Objetivo**: CRUD completo de proveedores sin integración

**Tareas**:
- Crear `/app/types/provider.ts`
- Crear `/app/stores/use-provider-store.ts`
- Crear `/app/components/provider-form.vue`
- Crear `/app/pages/providers/dashboard.vue`
- Actualizar `/app/components/the-sidebar.vue`
- Agregar datos mock para testing

**Entregable**: Dashboard funcional con tabla y CRUD completo

**Duración estimada**: 2-3 horas

---

### Fase 2: Integración con Servicios ✅ (COMPLETADA)

**Objetivo**: Vincular proveedores a servicios de viajes

**Tareas**:
- ✅ Modificar `/app/types/travel.ts` (agregar `providerId?`)
- ✅ Crear `/app/components/provider-selector.vue`
- ✅ Modificar `/app/components/travel-service-form.vue`
- ✅ Modificar `/app/components/travel-service-list.vue`
- ✅ Probar integración completa

**Entregable**: Servicios vinculados a proveedores

**Fecha de completación**: 2026-02-14

---

## 7. VALIDACIONES Y REGLAS DE NEGOCIO

### 7.1 Validaciones de Formulario (Zod)

- Nombre: 3-100 caracteres
- Categoría: Enum válido
- Descripción: Max 500 caracteres
- Email: Formato válido
- Teléfono: Max 20 caracteres

### 7.2 Reglas de Negocio

1. **Nombres de proveedores**: Únicos dentro de categoría (warning, no bloqueante)
2. **Eliminación**: Soft delete preferido (cambiar `activo: false`)
3. **Proveedores inactivos**: No aparecen en selectores
4. **Contacto mínimo**: Al menos un método de contacto recomendado (warning)
5. **Referencias rotas**: Mostrar gracefully "Proveedor no encontrado"

---

## 8. TESTING

### Manual Checklist

**Provider CRUD**:
- Crear proveedor con todos los campos
- Crear proveedor con campos mínimos
- Editar proveedor existente
- Activar/desactivar proveedor
- Eliminar proveedor
- Filtrar por categoría
- Buscar proveedor

**Integración con Servicios**:
- Agregar servicio con proveedor
- Eliminar proveedor vinculado a servicio
- Ver nombre de proveedor en lista de servicios
- Cambiar proveedor de un servicio

---

## 9. EXTENSIBILIDAD

### Agregar Nueva Categoría

**Proceso**:
1. Actualizar tipo en `/app/types/provider.ts`
2. Agregar opción en `provider-form.vue`
3. Agregar color e icono en helpers
4. TypeScript asegura completeness

### Puntos de Extensión Futuros

1. **Metadata adicional**: Agregar campos a `Provider` (rating, website, dirección)
2. **Jerarquías**: Agregar `parentProviderId` para sub-proveedores
3. **Tags flexibles**: Agregar `tags: string[]` para categorización custom
4. **Analytics**: Trackear uso de proveedores
5. **Multi-contacto**: Cambiar `contacto` a `contactos: ProviderContact[]`

---

## 10. RESUMEN DE IMPLEMENTACIÓN

### Archivos Creados
1. `/app/types/provider.ts` - Tipos TypeScript para proveedores
2. `/app/stores/use-provider-store.ts` - Store Pinia con persistencia
3. `/app/components/provider-form.vue` - Formulario CRUD de proveedores
4. `/app/pages/providers/dashboard.vue` - Dashboard principal de proveedores
5. `/app/pages/providers/[categoria].vue` - Páginas dinámicas por categoría
6. `/app/components/provider-selector.vue` - Selector de proveedores para servicios

### Archivos Modificados
1. `/app/types/travel.ts` - Agregado campo `providerId?` a `TravelService`
2. `/app/components/travel-service-form.vue` - Integrado selector de proveedores
3. `/app/components/travel-service-list.vue` - Muestra badge con nombre de proveedor
4. `/app/components/the-sidebar.vue` - Actualizado menú de navegación

### Funcionalidades Implementadas
- ✅ CRUD completo de proveedores con validación
- ✅ Sistema de categorías (Guías, Transporte, Hospedaje, Operadores, Comidas, Otros)
- ✅ Información de ubicación (ciudad, estado, país)
- ✅ Información de contacto completa
- ✅ Estado activo/inactivo (soft delete)
- ✅ Persistencia en localStorage
- ✅ Dashboard con estadísticas por categoría
- ✅ Páginas dinámicas por categoría
- ✅ Integración completa con servicios de viajes
- ✅ Selector de proveedores con búsqueda
- ✅ Creación inline de proveedores desde servicios
- ✅ Visualización de proveedores vinculados en servicios

### Validaciones y Typecheck
- ✅ TypeScript typecheck passing
- ✅ ESLint passing
- ✅ Convenciones de código respetadas

---

**Última actualización**: 2026-02-14

# 🚀 DEV-AGENT DISPATCH — Feature: Autobuses en Cotización

## 📌 Contexto

**Solicitante**: Usuario principal del proyecto  
**Proyecto**: viajeros-ligeros-bun (Nuxt 4 · Vue 3 · Pinia · Bun)  
**Fecha**: 2026-04-14  
**Prioridad**: ALTA

---

## 🎯 Objetivo

Trasladar la gestión de autobuses de la página `editar viaje` a la página `cotización`, con estructura de **Proveedores → Buses** (similar a hospedaje). Esto permite asociar qué buses de qué agencias se apartaron para cada viaje.

---

## 📊 Plan Estratégico

### Estructura de Datos Esperada

```
Cotización
├── Proveedores (existente)
├── Hospedaje (existente)
├── Buses (NUEVO) ← Tu implementación
│   └── Bus[]
│       ├── id: string
│       ├── cotizacionId: string
│       ├── proveedorId: string (FK → Proveedor)
│       ├── numeroUnidad: string
│       ├── capacidad: number
│       ├── estado: 'apartado' | 'confirmado' | 'pendiente'
│       └── notas?: string
└── Precio al Público (existente)
```

### Decisiones Arquitectónicas

1. **Modelo**: Bus es parte de Cotización, relacionado con Proveedor
2. **Store**: Expandir `useCotizacionStore` con métodos CRUD
3. **Componentes**: 2 nuevos componentes (sección + form modal)
4. **UI**: Usar Nuxt UI (UTable, UModal, UForm, UCard)
5. **Validación**: Zod para esquemas, uniqueness en numeroUnidad por proveedor

---

## 📋 TAREAS — Desglose Completo

### WAVE 1 — Tipos y Store (SIN DEPENDENCIAS — ejecutar en paralelo si es posible)

---

#### **T1: Crear tipos TypeScript para Bus**

**Descripción**: Crear archivo con tipos para Bus y enumeraciones de estado.

**Archivo a crear**: `app/types/bus.ts`

**Contenido esperado**:

```typescript
// app/types/bus.ts

/**
 * Estados posibles de un bus en una cotización
 */
export type BusState = 'apartado' | 'confirmado' | 'pendiente'

/**
 * Interfaz para un Bus apartado en una cotización
 */
export interface Bus {
  id: string
  cotizacionId: string
  proveedorId: string // FK a Proveedor
  numeroUnidad: string // Identificador único del bus (ej: BUS-001)
  capacidad: number // Número de asientos
  estado: BusState
  notas?: string
  createdAt?: Date
  updatedAt?: Date
}

/**
 * Datos para crear un nuevo bus (sin id ni timestamps)
 */
export type CreateBusData = Omit<Bus, 'id' | 'createdAt' | 'updatedAt'>

/**
 * Datos para actualizar un bus (todos opcionales)
 */
export type UpdateBusData = Partial<CreateBusData>
```

**Archivos a modificar**: `app/types/index.ts`

**Cambio esperado**: Agregar exports:
```typescript
export type { Bus, BusState, CreateBusData, UpdateBusData } from './bus'
```

**Criterios de aceptación**:
- ✅ Archivo `app/types/bus.ts` creado
- ✅ Tipos validados con TypeScript
- ✅ Exports agregados en `index.ts`
- ✅ Relación FK `proveedorId` explícita

---

#### **T2: Expandir store de cotización con métodos CRUD para buses**

**Descripción**: Agregar métodos para gestionar buses dentro de `useCotizacionStore`.

**Archivo a modificar**: `app/stores/use-cotizacion-store.ts`

**Cambios esperados**:

1. **Actualizar estado de Cotización** para incluir buses:
```typescript
// En la interfaz Cotización, agregar:
buses: Bus[]
```

2. **Agregar métodos CRUD**:

```typescript
/**
 * Agrega un bus a un proveedor específico dentro de una cotización
 * Validaciones:
 * - Proveedor debe existir en la cotización
 * - numeroUnidad debe ser único por proveedor dentro de la cotización
 */
addBusToProveedor(cotizacionId: string, proveedorId: string, busData: CreateBusData): void {
  const cotizacion = this.cotizaciones.find(c => c.id === cotizacionId)
  if (!cotizacion) throw new Error('Cotización no encontrada')

  // Validar que proveedor existe
  const proveedor = cotizacion.proveedores.find(p => p.id === proveedorId)
  if (!proveedor) throw new Error('Proveedor no encontrado en la cotización')

  // Validar uniqueness de numeroUnidad por proveedor
  const existente = cotizacion.buses?.find(
    b => b.proveedorId === proveedorId && b.numeroUnidad === busData.numeroUnidad
  )
  if (existente) throw new Error('Este número de unidad ya existe para este proveedor')

  // Agregar bus
  if (!cotizacion.buses) cotizacion.buses = []
  cotizacion.buses.push({
    id: generateId(),
    cotizacionId,
    ...busData,
  })
}

/**
 * Actualiza un bus existente
 */
updateBus(busId: string, busData: UpdateBusData): void {
  const bus = this.findBus(busId)
  if (!bus) throw new Error('Bus no encontrado')
  Object.assign(bus, busData)
}

/**
 * Elimina un bus
 */
removeBus(busId: string): void {
  for (const cotizacion of this.cotizaciones) {
    const idx = cotizacion.buses?.findIndex(b => b.id === busId)
    if (idx !== undefined && idx >= 0) {
      cotizacion.buses?.splice(idx, 1)
      return
    }
  }
  throw new Error('Bus no encontrado')
}

/**
 * Obtiene todos los buses de un proveedor en una cotización
 */
getBusesByProveedor(cotizacionId: string, proveedorId: string): Bus[] {
  const cotizacion = this.cotizaciones.find(c => c.id === cotizacionId)
  if (!cotizacion) return []
  return cotizacion.buses?.filter(b => b.proveedorId === proveedorId) ?? []
}

/**
 * Obtiene todos los buses de una cotización
 */
getAllBuses(cotizacionId: string): Bus[] {
  const cotizacion = this.cotizaciones.find(c => c.id === cotizacionId)
  return cotizacion?.buses ?? []
}

/**
 * Obtiene un bus por ID
 */
private findBus(busId: string): Bus | undefined {
  for (const cotizacion of this.cotizaciones) {
    const bus = cotizacion.buses?.find(b => b.id === busId)
    if (bus) return bus
  }
  return undefined
}
```

**Criterios de aceptación**:
- ✅ Métodos CRUD implementados y tipados
- ✅ Validación FK: proveedor existe
- ✅ Validación uniqueness: numeroUnidad es único por proveedor
- ✅ Estado de Cotización incluye array `buses`
- ✅ Manejo de errores apropiado

---

### WAVE 2 — Componentes (Depende de WAVE 1 completada)

---

#### **T3: Crear componente CotizacionBusesSection**

**Descripción**: Componente que muestra tabla de buses agrupados por proveedor.

**Archivo a crear**: `app/components/CotizacionBusesSection.vue`

**Estructura esperada**:

```vue
<script setup lang="ts">
import type { Bus } from '~/types/bus'
import type { Proveedor } from '~/types/proveedor'

interface Props {
  cotizacionId: string
  readonly: boolean
}

interface Emits {
  'agregar-bus': []
}

defineProps<Props>()
const emit = defineEmits<Emits>()

const cotizacionStore = useCotizacionStore()
const toast = useToast()

// Computed: agrupar buses por proveedor
const busesPorProveedor = computed(() => {
  const buses = cotizacionStore.getAllBuses(cotizacionId)
  const cotizacion = cotizacionStore.getCotizacionById(cotizacionId)
  if (!cotizacion) return new Map()

  const grouped = new Map<string, { proveedor: Proveedor; buses: Bus[] }>()

  cotizacion.proveedores.forEach(proveedor => {
    const proveedorBuses = buses.filter(b => b.proveedorId === proveedor.id)
    grouped.set(proveedor.id, { proveedor, buses: proveedorBuses })
  })

  return grouped
})

// Columnas para UTable
const columns = [
  { key: 'numeroUnidad', label: 'Número de Unidad' },
  { key: 'capacidad', label: 'Capacidad' },
  { key: 'estado', label: 'Estado' },
  { key: 'notas', label: 'Notas' },
  { key: 'actions', label: 'Acciones' },
]

function handleDeleteBus(busId: string) {
  cotizacionStore.removeBus(busId)
  toast.add({
    title: 'Autobús eliminado',
    description: 'El autobús ha sido removido exitosamente',
    color: 'success',
  })
}
</script>

<template>
  <UCard>
    <template #header>
      <div class="flex items-center justify-between">
        <h2 class="font-semibold flex items-center gap-2">
          <span class="i-lucide-bus w-5 h-5 text-muted" />
          Autobuses Apartados
        </h2>
        <UButton
          v-if="!readonly"
          icon="i-lucide-plus"
          label="Agregar autobús"
          size="sm"
          @click="$emit('agregar-bus')"
        />
      </div>
    </template>

    <div v-if="busesPorProveedor.size > 0" class="space-y-4">
      <!-- Iterar por cada proveedor -->
      <template v-for="[proveedorId, { proveedor, buses }] of busesPorProveedor" :key="proveedorId">
        <div v-if="buses.length > 0" class="border rounded-lg p-4">
          <!-- Header del proveedor -->
          <h3 class="font-semibold mb-3 flex items-center gap-2">
            <span class="i-lucide-building w-4 h-4 text-muted" />
            {{ proveedor.nombre }}
          </h3>

          <!-- Tabla de buses del proveedor -->
          <UTable :rows="buses" :columns="columns" class="text-sm">
            <template #estado-data="{ row }">
              <UBadge
                :label="row.estado"
                :color="
                  row.estado === 'confirmado'
                    ? 'green'
                    : row.estado === 'apartado'
                      ? 'blue'
                      : 'yellow'
                "
                variant="soft"
              />
            </template>

            <template #actions-data="{ row }">
              <div v-if="!readonly" class="flex gap-1">
                <UButton
                  icon="i-lucide-trash-2"
                  size="xs"
                  variant="ghost"
                  color="red"
                  @click="handleDeleteBus(row.id)"
                />
              </div>
            </template>
          </UTable>
        </div>
      </template>
    </div>

    <!-- Empty state -->
    <div v-else class="text-center py-8">
      <span class="i-lucide-inbox w-12 h-12 text-muted mx-auto mb-3 block" />
      <p class="text-muted text-sm">No hay autobuses apartados aún</p>
    </div>
  </UCard>
</template>
```

**Criterios de aceptación**:
- ✅ Componente renderiza correctamente
- ✅ Buses agrupados por proveedor
- ✅ Tabla con columnas: numeroUnidad, capacidad, estado, notas, acciones
- ✅ Estados con badges coloreados (confirmado: verde, apartado: azul, pendiente: amarillo)
- ✅ Botón "Agregar autobús" emite evento (solo si no readonly)
- ✅ Acción: eliminar bus (solo si no readonly)
- ✅ Empty state cuando no hay buses

---

#### **T4: Crear componente CotizacionBusForm**

**Descripción**: Modal para agregar/editar un bus.

**Archivo a crear**: `app/components/CotizacionBusForm.vue`

**Estructura esperada**:

```vue
<script setup lang="ts">
import { z } from 'zod'
import type { Bus, CreateBusData } from '~/types/bus'

interface Props {
  open: boolean
  cotizacionId: string
  proveedorId?: string
  bus?: Bus
}

interface Emits {
  'update:open': [value: boolean]
  'bus-agregado': []
  'bus-actualizado': []
}

defineProps<Props>()
const emit = defineEmits<Emits>()

const cotizacionStore = useCotizacionStore()
const toast = useToast()

const isEdit = computed(() => !!props.bus)

// Schema Zod
const busSchema = z.object({
  numeroUnidad: z
    .string()
    .min(1, 'Número de unidad es requerido')
    .max(50, 'Máximo 50 caracteres'),
  capacidad: z.number().int('Debe ser un número entero').positive('Debe ser mayor a 0'),
  estado: z.enum(['apartado', 'confirmado', 'pendiente']),
  notas: z.string().max(500, 'Máximo 500 caracteres').optional(),
})

type BusFormSchema = z.infer<typeof busSchema>

const state = reactive<BusFormSchema>({
  numeroUnidad: props.bus?.numeroUnidad ?? '',
  capacidad: props.bus?.capacidad ?? 44,
  estado: props.bus?.estado ?? 'apartado',
  notas: props.bus?.notas ?? '',
})

// Watch para actualizar state cuando cambia el bus prop
watch(
  () => props.bus,
  (newBus) => {
    if (newBus) {
      state.numeroUnidad = newBus.numeroUnidad
      state.capacidad = newBus.capacidad
      state.estado = newBus.estado
      state.notas = newBus.notas ?? ''
    }
  },
)

function handleSubmit() {
  const result = busSchema.safeParse(state)
  if (!result.success) return

  try {
    if (isEdit.value && props.bus) {
      cotizacionStore.updateBus(props.bus.id, result.data)
      toast.add({
        title: 'Autobús actualizado',
        description: 'El autobús ha sido actualizado exitosamente',
        color: 'success',
      })
      emit('bus-actualizado')
    } else {
      cotizacionStore.addBusToProveedor(
        cotizacionId,
        props.proveedorId!,
        result.data as CreateBusData,
      )
      toast.add({
        title: 'Autobús agregado',
        description: 'El autobús ha sido agregado exitosamente',
        color: 'success',
      })
      emit('bus-agregado')
    }

    emit('update:open', false)
  } catch (error) {
    toast.add({
      title: 'Error',
      description: error instanceof Error ? error.message : 'Error al procesar',
      color: 'error',
    })
  }
}
</script>

<template>
  <UModal :open="open" @update:open="$emit('update:open', $event)">
    <template #header>
      <div>{{ isEdit ? 'Editar Autobús' : 'Agregar Autobús' }}</div>
    </template>

    <template #body>
      <UForm
        :schema="busSchema"
        :state="state"
        class="space-y-4"
        @submit="handleSubmit"
      >
        <UFormField label="Número de Unidad" name="numeroUnidad" required>
          <UInput
            v-model="state.numeroUnidad"
            placeholder="Ej. BUS-001"
            type="text"
          />
        </UFormField>

        <UFormField label="Capacidad (asientos)" name="capacidad" required>
          <UInput
            v-model.number="state.capacidad"
            type="number"
            placeholder="Ej. 44"
          />
        </UFormField>

        <UFormField label="Estado" name="estado">
          <USelect
            v-model="state.estado"
            :options="[
              { label: 'Apartado', value: 'apartado' },
              { label: 'Confirmado', value: 'confirmado' },
              { label: 'Pendiente', value: 'pendiente' },
            ]"
          />
        </UFormField>

        <UFormField label="Notas" name="notas">
          <UTextarea
            v-model="state.notas"
            placeholder="Observaciones sobre este autobús..."
            :rows="2"
          />
        </UFormField>

        <div class="flex justify-end gap-3 pt-2">
          <UButton
            type="button"
            variant="ghost"
            color="neutral"
            label="Cancelar"
            @click="$emit('update:open', false)"
          />
          <UButton
            type="submit"
            :label="isEdit ? 'Actualizar' : 'Agregar'"
          />
        </div>
      </UForm>
    </template>
  </UModal>
</template>
```

**Criterios de aceptación**:
- ✅ Modal abre/cierra correctamente
- ✅ Validación Zod en campos (numeroUnidad, capacidad, estado)
- ✅ Modo edición vs creación diferenciado
- ✅ Pre-llena datos en modo edición
- ✅ Toast notifications en éxito/error
- ✅ Manejo de errores (ej: proveedor no existe)

---

### WAVE 3 — Integración (Depende de WAVE 2 completada)

---

#### **T5: Integrar sección en cotizacion.vue**

**Descripción**: Agregar CotizacionBusesSection a la página de cotización.

**Archivo a modificar**: `app/pages/travels/[id]/cotizacion.vue`

**Cambios esperados**:

1. **Importar componentes**:
```typescript
import CotizacionBusesSection from '~/components/CotizacionBusesSection.vue'
import CotizacionBusForm from '~/components/CotizacionBusForm.vue'
```

2. **Agregar estado**:
```typescript
const isAgregarBusModalOpen = shallowRef(false)

function handleBusAgregado() {
  toast.add({
    title: 'Autobús agregado exitosamente',
    color: 'success',
  })
}
```

3. **En el template**, después de `CotizacionHospedajeSection`, agregar:
```vue
<!-- Sección Autobuses -->
<CotizacionBusesSection
  :cotizacion-id="cotizacion.id"
  :readonly="readonly"
  @agregar-bus="isAgregarBusModalOpen = true"
/>
```

4. **Agregar modal** (junto a otros modales existentes):
```vue
<!-- Modal: agregar autobús -->
<CotizacionBusForm
  v-if="cotizacion"
  :open="isAgregarBusModalOpen"
  :cotizacion-id="cotizacion.id"
  @update:open="(v) => isAgregarBusModalOpen = v"
  @bus-agregado="handleBusAgregado"
/>
```

**Ubicación en template**: Entre `CotizacionHospedajeSection` y `CotizacionPrecioPublicoSection`

**Criterios de aceptación**:
- ✅ Componentes importados correctamente
- ✅ Sección renderiza en orden correcto
- ✅ Modal se abre/cierra
- ✅ Datos sincronizados con store
- ✅ Readonly mode respetado

---

#### **T6: Remover TravelBusList de edit.vue**

**Descripción**: Limpiar la página de edición (remover sección de buses).

**Archivo a modificar**: `app/pages/travels/[id]/edit.vue`

**Cambio esperado**: Remover este bloque:
```vue
<!-- Autobuses -->
<UCard class="mt-6">
  <template #header>
    <div class="flex items-center gap-2">
      <span class="i-lucide-bus w-5 h-5" />
      <h2 class="font-semibold">
        Autobuses
      </h2>
    </div>
  </template>
  <TravelBusList
    :travel-id="travelId"
    :editable="true"
  />
</UCard>
```

**Criterios de aceptación**:
- ✅ Componente y UCard removidos
- ✅ No hay imports rotos
- ✅ Página aún se ve bien
- ✅ NOTA: `TravelBusList.vue` puede permanecer en el proyecto si se usa en otro lado

---

## 🛠️ Stack y Skills Disponibles

El proyecto tiene los siguientes skills instalados en `.claude/skills/`:

```
✅ @.claude/skills/nuxt         — Nuxt 4 patterns y APIs
✅ @.claude/skills/nuxt-ui      — Nuxt UI v4 (UButton, UModal, UTable, etc.)
✅ @.claude/skills/pinia        — State management
✅ @.claude/skills/vue          — Vue 3 patterns
✅ @.claude/skills/vue-best-practices
✅ @.claude/skills/vitest       — Testing
```

**Úsalos cuando necesites referencias o ejemplos**.

---

## 📝 Stack del Proyecto

- **Nuxt**: 4.x
- **Vue**: 3.x
- **Pinia**: State management
- **Nuxt UI**: v4 (componentes)
- **TypeScript**: Tipado completo
- **Zod**: Validación de esquemas
- **Bun**: Runtime

---

## 🔗 Referencias en Codebase

**Modelos similares para inspirarte**:

- `app/types/proveedor.ts` — Estructura de tipos similar
- `app/types/hospedaje.ts` — Estructura de tipo hospedaje
- `app/stores/use-cotizacion-store.ts` — Store para expandir
- `app/components/CotizacionHospedajeSection.vue` — Component similar
- `app/components/CotizacionHospedajeForm.vue` — Form modal similar

**Páginas relacionadas**:
- `app/pages/travels/[id]/cotizacion.vue` — Página donde integrar
- `app/pages/travels/[id]/edit.vue` — Página de donde remover

---

## ✅ Orden de Implementación Recomendado

1. **T1** + **T2** (en paralelo si es posible)
   - Tipos y store son independientes

2. **T3** + **T4** (en paralelo si es posible, después de T1+T2)
   - Componentes dependen de tipos/store

3. **T5** → **T6** (secuencial)
   - Integración y limpieza final

---

## 🧪 Testing Recomendado

Después de implementar, verifica:

1. **Crear cotización** → Agregar bus → Debería aparecer en tabla
2. **Editar bus** → Cambiar datos → Debería actualizarse
3. **Eliminar bus** → Remover de tabla → Debería desaparecer
4. **Readonly mode** → Cuando cotización confirmada → Botones deshabilitados
5. **Validaciones**:
   - numeroUnidad duplicado en mismo proveedor → Debe fallar
   - capacidad negativa → Debe fallar
   - Campo requerido vacío → Debe fallar

---

## 📞 Notas para el Dev-Agent

- **Usa TypeScript en todo momento** — evita `any`
- **Sigue el patrón existente** — mira CotizacionHospedajeSection como referencia
- **Componentes reactivos** — usa `computed`, `watch` donde sea necesario
- **Emits tipados** — sigue patrón de emisión existente
- **Manejo de errores** — captura y muestra en toast
- **CSS**: Usa clases Tailwind del proyecto (ver en otros componentes)
- **Imports**: Usa alias `~/` para importes relativos

---

## 🚀 Finalmente

Una vez implementado, haz:

```bash
bun run lint:fix
bun run typecheck
bun run dev
```

Verifica que todo compile sin errores y funcione en el navegador.

**¡Buena suerte! 🎯**

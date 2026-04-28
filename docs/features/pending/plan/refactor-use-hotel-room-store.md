# Refactor: use-hotel-room-store

**Objetivo:** Aplicar el patrón Repository + Domain composables al store de habitaciones.
El store queda como orquestador de estado/cache; la validación de negocio va al dominio;
el acceso a Supabase va al repositorio. Sin cambios en la API pública del store.

**Patrón elegido:** Repository + Domain composables  
**Complejidad:** Media — 2 tablas anidadas (`hotel_rooms` + `hotel_room_types`),
validación de regla de negocio en `updateTotalRooms`  
**Estado:** Pendiente

---

## Rol del asistente

**Modo:** Mentor / Guía de implementación  
**Comportamiento:** Explicar el *por qué* de cada cambio antes de que el usuario
escriba código. No realizar cambios al código a menos que el usuario lo pida
explícitamente. Responder preguntas y adaptar las explicaciones al nivel del usuario.

**Skills a cargar al inicio de la sesión:**

```
@.claude/skills/vue
@.claude/skills/vue-best-practices
@.claude/skills/nuxt
@.claude/skills/pinia
@.claude/skills/supabase
```

**Contexto de referencia:**
- Store ya refactorizado: `app/stores/use-traveler-store.ts`
- Repositorio de referencia: `app/composables/travelers/use-traveler-repository.ts`
- Dominio de referencia: `app/composables/travelers/use-traveler-domain.ts`
- Plan de referencia completado: `docs/features/pending/plan/refactor-use-traveler-store.md`
- Helpers ya extraídos: `app/utils/hotel-room-helpers.ts` (`calculateCostPerPerson`, `calculateTotalRoomsUsed`)

---

## Análisis del store actual

**Archivo:** `app/stores/use-hotel-room-store.ts` (227 líneas)  
**Tablas:** `hotel_rooms` (padre) + `hotel_room_types` (hijos, relación 1:N)

### Lógica de dominio a extraer (Fase 1)

| Función a crear | Origen en store |
|---|---|
| `validateTotalRoomsUpdate(newTotal, usedRooms): string \| null` | validación inline en `updateTotalRooms` (líneas 80-82) |

**Nota:** `calculateCostPerPerson` y `calculateTotalRoomsUsed` ya están en
`utils/hotel-room-helpers.ts` — no moverlos, ya están extraídos.

La función de dominio retorna `string | null`: `null` si es válido, o el
mensaje de error si viola la regla de negocio. El store decide qué hacer con el resultado.

### Acciones con Supabase a mover al repositorio (Fase 2)

| Acción en store | Función en repositorio |
|---|---|
| `fetchAll` | `fetchAll(): Promise<HotelRoomData[]>` |
| `initRoomData` | `insertRoomData(providerId, totalRooms): Promise<HotelRoomData>` |
| `updateTotalRooms` (parte Supabase) | `updateRoomTotal(roomId, total): Promise<{ updatedAt: string, totalRooms: number }>` |
| `addRoomType` | `insertRoomType(roomId, data, costPerPerson): Promise<HotelRoomType>` |
| `updateRoomType` | `updateRoomType(roomTypeId, data, costPerPerson): Promise<HotelRoomType>` |
| `deleteRoomType` | `removeRoomType(roomTypeId): Promise<void>` |

`deleteProviderRooms` permanece en el store — es manipulación de cache local, sin I/O.

---

## Estructura objetivo

```
app/
├── composables/
│   └── hotel-rooms/
│       ├── use-hotel-room-domain.ts      ← validación de reglas de negocio (NUEVO)
│       └── use-hotel-room-repository.ts  ← acceso Supabase (NUEVO)
├── stores/
│   └── use-hotel-room-store.ts           ← orquestación + cache (MODIFICADO)
└── utils/
    └── hotel-room-helpers.ts             ← sin cambios (ya extraído)
```

---

## Fase 1 — Extraer lógica de dominio pura ✅ PENDIENTE

> **Criterio de éxito:** `updateTotalRooms` delega la validación al dominio.

### Pasos

**1.1** Crear `app/composables/hotel-rooms/use-hotel-room-domain.ts`:

```ts
export function validateTotalRoomsUpdate(newTotal: number, usedRooms: number): string | null {
  if (newTotal < usedRooms) {
    return 'El total no puede ser menor a las habitaciones ya configuradas';
  }
  return null;
}
```

**1.2** Actualizar `app/stores/use-hotel-room-store.ts`:
- Importar `validateTotalRoomsUpdate`.
- En `updateTotalRooms`, reemplazar la validación inline por:
  ```ts
  const validationError = validateTotalRoomsUpdate(total, getUsedRoomsByProvider.value(providerId));
  if (validationError) {
    error.value = validationError;
    return false;
  }
  ```

**1.3** Verificación: `bun run typecheck` + `bun run lint:fix`.

---

## Fase 2 — Extraer acceso a Supabase al repositorio ✅ PENDIENTE

> **Criterio de éxito:** store sin ninguna referencia directa a `supabase.from`.

### Pasos

**2.1** Crear `app/composables/hotel-rooms/use-hotel-room-repository.ts`:

```ts
export function useHotelRoomRepository() {
  const supabase = useSupabase();

  async function fetchAll(): Promise<HotelRoomData[]>
  async function insertRoomData(providerId: string, totalRooms: number): Promise<HotelRoomData>
  async function updateRoomTotal(roomId: string, total: number): Promise<{ totalRooms: number; updatedAt: string }>
  async function insertRoomType(roomId: string, data: HotelRoomTypeFormData, costPerPerson: number): Promise<HotelRoomType>
  async function updateRoomType(roomTypeId: string, data: HotelRoomTypeFormData, costPerPerson: number): Promise<HotelRoomType>
  async function removeRoomType(roomTypeId: string): Promise<void>

  return { fetchAll, insertRoomData, updateRoomTotal, insertRoomType, updateRoomType, removeRoomType }
}
```

**Nota importante:** `fetchAll` usa un JOIN (`hotel_rooms` con `hotel_room_types`).
El repositorio aplica ambos mappers y retorna `HotelRoomData[]` ya completo.

**Nota sobre `costPerPerson`:** El cálculo de `costPerPerson` usa `calculateCostPerPerson`
de `hotel-room-helpers`. Esta llamada puede ir en el repositorio (ya que prepara el dato
para insertar) o en el store. Elige repositorio — es preparación de datos para I/O.

**2.2** Actualizar `app/stores/use-hotel-room-store.ts`:
- Agregar `const repository = useHotelRoomRepository()`.
- En cada action, reemplazar el bloque Supabase por la llamada al repositorio.
- `deleteProviderRooms` no toca Supabase — queda intacta.
- `initRoomData`: la guarda `if (hasRoomData.value(providerId)) return` queda en el store
  (es lógica de cache, no de repositorio).
- Eliminar `const supabase = useSupabase()`.

**2.3** Verificación:
- `bun run typecheck` sin errores.
- `bun run lint:fix` limpio.
- Prueba manual: cargar habitaciones, agregar tipo, editar, borrar, actualizar total.
- Verificar que borrar un proveedor limpia las habitaciones en memoria.

---

## Fase 3 — Limpieza final ✅ PENDIENTE

**3.1** Revisar `use-hotel-room-store.ts`: solo estado, getters y actions que llaman
`repository.*` + `deleteProviderRooms` (cache local).

**3.2** Revisar `use-hotel-room-domain.ts`: solo funciones de validación puras.

**3.3** Revisar `use-hotel-room-repository.ts`: solo async I/O, sin estado reactivo.

**3.4** Verificación final: `bun run typecheck` + `bun run lint:fix`.

---

## Decisiones de diseño

| Decisión | Justificación |
|---|---|
| `validateTotalRoomsUpdate` retorna `string \| null` | El store decide cómo mostrar el error; el dominio solo dice si es válido |
| `costPerPerson` se calcula en el repositorio | Es preparación de datos para I/O — el store no debería saber esa fórmula |
| `fetchAll` usa JOIN en el repositorio | La carga de hotel_room_types es parte del fetch — el repositorio los ensambla |
| `deleteProviderRooms` permanece en store | Solo manipula cache local, sin Supabase — no pertenece al repositorio |
| `initRoomData` guarda en store | `hasRoomData` consulta el cache reactivo — el repositorio no tiene acceso a eso |

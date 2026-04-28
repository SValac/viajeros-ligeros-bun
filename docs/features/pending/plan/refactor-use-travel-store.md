# Refactor: use-travel-store

**Objetivo:** Aplicar el patrón Repository + Domain composables al store de viajes.
El store queda como orquestador de estado/cache; la validación de itinerario va al dominio;
el acceso a Supabase va al repositorio. Sin cambios en la API pública del store.

**Patrón elegido:** Repository + Domain composables  
**Complejidad:** Alta — 6 tablas relacionadas (travels, travel_activities, travel_services,
travel_buses, travel_accommodations, travel_coordinators), operaciones de replace
(delete + insert), sub-entities anidadas en el cache  
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

---

## Análisis del store actual

**Archivo:** `app/stores/use-travel-store.ts` (759 líneas)  
**Tablas principales:**
- `travels` — entidad raíz
- `travel_activities` — itinerario (replace completo en update)
- `travel_services` — servicios (replace completo en update)
- `travel_buses` — autobuses del viaje (replace completo en update + CRUD individual)
- `travel_accommodations` — alojamientos (replace completo en update + update individual)
- `travel_coordinators` — coordinadores asignados (replace completo en update)

**Dependencia cross-store:** `useBusStore()` — en `addBusToTravel` puede crear un bus
nuevo en el catálogo si no se proporciona `busId`.

### Lógica de dominio a extraer (Fase 1)

| Función a crear | Origen en store |
|---|---|
| `validateAndMapItinerary(travelId, activities): ItineraryInsert[]` | función privada `mapItineraryForInsert` (líneas 63-91) |

La función actual ya es privada y casi pura — solo necesita ser exportada desde el dominio.
Incluye validación de datos (día, título, descripción, coordenadas) y transformación al formato DB.

Los demás computeds (`allTravels`, `stats`, `totalRevenue`) son derivaciones simples que
quedan en el store.

### Acciones con Supabase a mover al repositorio (Fase 2)

Este store es el más complejo porque `addTravel` y `updateTravel` orquestan múltiples
tablas. El repositorio debe exponer operaciones atómicas por tabla; el store mantiene
la orquestación de múltiples llamadas.

| Operación | Función en repositorio |
|---|---|
| `fetchAll` (con joins) | `fetchAll(): Promise<Travel[]>` |
| Insertar travel | `insertTravel(data): Promise<Tables<'travels'>>` |
| Insertar actividades | `insertActivities(inserts): Promise<TravelActivity[]>` |
| Insertar servicios | `insertServices(travelId, services): Promise<TravelService[]>` |
| Insertar buses | `insertBuses(travelId, buses): Promise<TravelBus[]>` |
| Insertar coordinadores | `insertCoordinators(travelId, ids): Promise<void>` |
| Insertar alojamientos | `insertAccommodations(travelId, data): Promise<TravelAccommodation[]>` |
| Actualizar travel | `updateTravel(id, update): Promise<Tables<'travels'>>` |
| Reemplazar actividades | `replaceActivities(travelId, activities): Promise<TravelActivity[]>` |
| Reemplazar servicios | `replaceServices(travelId, services): Promise<TravelService[]>` |
| Reemplazar buses | `replaceBuses(travelId, buses): Promise<TravelBus[]>` |
| Reemplazar alojamientos | `replaceAccommodations(travelId, data): Promise<TravelAccommodation[]>` |
| Reemplazar coordinadores | `replaceCoordinators(travelId, ids): Promise<void>` |
| Borrar travel | `removeTravel(id): Promise<void>` |
| Insertar bus individual | `insertTravelBus(travelId, data): Promise<TravelBus>` |
| Actualizar bus individual | `updateTravelBus(busId, data): Promise<TravelBus>` |
| Borrar bus individual | `removeTravelBus(busId): Promise<void>` |
| Actualizar alojamiento individual | `updateTravelAccommodation(id, data): Promise<TravelAccommodation>` |

**Nota sobre `replace*`:** El patrón delete + insert que usa el store en `updateTravel`
puede encapsularse en el repositorio como operaciones atómicas de reemplazo.

---

## Estructura objetivo

```
app/
├── composables/
│   └── travels/
│       ├── use-travel-domain.ts      ← validación de itinerario (NUEVO)
│       └── use-travel-repository.ts  ← acceso Supabase (NUEVO)
├── stores/
│   └── use-travel-store.ts           ← orquestación + cache (MODIFICADO)
└── types/
    └── travel.ts                     ← sin cambios
```

---

## Fase 1 — Extraer lógica de dominio pura ✅ PENDIENTE

> **Criterio de éxito:** `mapItineraryForInsert` se convierte en función exportada
> del dominio; el store la importa.

### Pasos

**1.1** Crear `app/composables/travels/use-travel-domain.ts`:

```ts
export function validateAndMapItinerary(
  travelId: string,
  activities: TravelActivity[],
): ItineraryInsert[] {
  // lógica extraída de mapItineraryForInsert
  // valida: day entero positivo, title y description no vacíos, coordenadas en rango
  // lanza Error si hay actividad inválida
}
```

**1.2** Actualizar `app/stores/use-travel-store.ts`:
- Importar `validateAndMapItinerary` del dominio.
- Reemplazar las 2 llamadas a `mapItineraryForInsert` (en `addTravel` y `updateTravel`)
  por `validateAndMapItinerary`.
- Eliminar la función privada `mapItineraryForInsert` del store.

**1.3** Verificación: `bun run typecheck` + `bun run lint:fix`.

---

## Fase 2 — Extraer acceso a Supabase al repositorio ✅ PENDIENTE

> **Criterio de éxito:** store sin ninguna referencia directa a `supabase.from`.

### Recomendación de enfoque

Por la complejidad de este store, se recomienda migrar las acciones en este orden:

1. `fetchAll` — lectura con JOIN
2. `deleteTravel` — más simple
3. `addBusToTravel`, `updateTravelBus`, `removeBusFromTravel` — CRUD de sub-entidad
4. `updateTravelAccommodation` — update de sub-entidad
5. `addTravel` — multi-tabla insert
6. `updateTravel` — la más compleja (replace en 5 tablas)

### Pasos

**2.1** Crear `app/composables/travels/use-travel-repository.ts` con todas las
funciones del repositorio listadas en la sección de análisis.

**2.2** Actualizar `app/stores/use-travel-store.ts` acción por acción:
- El store mantiene toda la lógica de merge/actualización del array `travels`.
- `addTravel`: llama `repository.insertTravel`, luego `repository.insertActivities`,
  etc. — el store ensambla el objeto `Travel` final para el cache.
- `updateTravel`: llama `repository.updateTravel` (si hay campos de travel) y
  `repository.replace*` para cada sub-entidad que cambió.
- `addBusToTravel`: si no hay `busId`, llama primero a `busStore.addBus` (cross-store,
  queda en el store), luego `repository.insertTravelBus`.
- Eliminar `const supabase = useSupabase()` y todos los imports de `TablesUpdate`.

**2.3** Verificación:
- `bun run typecheck` sin errores.
- `bun run lint:fix` limpio.
- Prueba manual completa: crear viaje con itinerario, editar, borrar.
- Verificar actualización de sub-entidades: agregar/editar/borrar bus, editar alojamiento.
- Verificar `addBusToTravel` cuando no se proporciona `busId` (crea en catálogo).

---

## Fase 3 — Limpieza final ✅ PENDIENTE

**3.1** Verificar que `use-travel-store.ts` solo contiene:
- Estado reactivo
- Getters computados (sin lógica de Supabase)
- Actions que orquestan llamadas al repositorio y actualizan el cache
- Coordinación cross-store (`useBusStore` en `addBusToTravel`)

**3.2** Verificar `use-travel-domain.ts`: solo funciones puras, sin Supabase.

**3.3** Verificar `use-travel-repository.ts`: solo async I/O, sin estado reactivo.

**3.4** Verificación final: `bun run typecheck` + `bun run lint:fix` + prueba de regresión completa.

---

## Decisiones de diseño

| Decisión | Justificación |
|---|---|
| `replace*` en repositorio | Encapsula el patrón delete + insert — el store no debe conocer ese detalle de implementación |
| `addTravel` orquesta múltiples llamadas desde el store | La orquestación de qué insertar y en qué orden es lógica de negocio, no de I/O |
| `useBusStore()` permanece en store | Es coordinación cross-store — el repositorio no sabe nada de otros stores |
| `updateLocalAccommodations` no se toca | Es manipulación de cache local, sin I/O — queda en el store tal cual |
| Repositorio retorna tipos de dominio | `TravelActivity[]`, `TravelBus[]`, etc. — el store no mapea filas DB |

## Advertencia

Este es el store más complejo del proyecto. Se recomienda:
1. Tener el store de travelers como referencia mental al lado
2. Migrar acción por acción, haciendo `bun run typecheck` después de cada una
3. No intentar migrar `addTravel` y `updateTravel` en el mismo bloque

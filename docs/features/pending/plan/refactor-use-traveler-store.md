# Refactor: use-traveler-store

**Objetivo:** Separar responsabilidades del store de viajeros aplicando el patrón
Repository + Domain composables. El store queda como orquestador de estado/cache;
la lógica de dominio pura va a un composable dedicado; el acceso a Supabase va a
un composable repositorio. Sin cambios en la API pública del store ni en las páginas.

**Patrón elegido:** Repository + Domain composables  
**Estado:** Fase 1 completada · Fase 2 pendiente

---

## Estructura objetivo

```
app/
├── composables/
│   └── travelers/
│       ├── use-traveler-domain.ts      ← lógica pura de dominio (NUEVO)
│       └── use-traveler-repository.ts  ← acceso Supabase (NUEVO)
├── stores/
│   └── use-traveler-store.ts           ← orquestación + cache (MODIFICADO)
└── types/
    └── traveler.ts                     ← sin cambios
```

---

## ~~Fase 1 — Extraer lógica de dominio pura~~ ✅ COMPLETADA

> **Alcance:** Crear `use-traveler-domain.ts` y consumirlo desde el store.  
> Las llamadas a Supabase permanecen en el store en esta fase.  
> **Criterio de éxito:** misma API pública del store, cero cambios funcionales en UI.

### Pasos

**1.1** Crear `app/composables/travelers/use-traveler-domain.ts` con las siguientes
funciones puras extraídas del store:

| Función | Origen en store actual |
|---|---|
| `validateSeatChangeResult(data): data is TravelerSeatChangeResult` | `isTravelerSeatChangeResult()` |
| `mapSeatChangeError(error): TravelerSeatChangeError` | `toTravelerSeatChangeError()` |
| `groupByRepresentative(travelers, filters?): TravelerWithChildren[]` | lógica inline de `filteredGroupedTravelers` computed |
| `filterTravelers(travelers, filters): Traveler[]` | lógica inline de `filteredTravelers` computed |

Todas las funciones son puras: sin estado reactivo, sin llamadas a Supabase, sin
efectos secundarios.

**1.2** Actualizar `app/stores/use-traveler-store.ts`:
- Instanciar `const domain = useTravelerDomain()` al inicio del store.
- Reemplazar `isTravelerSeatChangeResult` por `domain.validateSeatChangeResult`.
- Reemplazar `toTravelerSeatChangeError` por `domain.mapSeatChangeError`.
- Reemplazar la lógica inline de `filteredGroupedTravelers` por `domain.groupByRepresentative`.
- Reemplazar la lógica inline de `filteredTravelers` por `domain.filterTravelers`.
- Eliminar las funciones privadas `isTravelerSeatChangeResult` y `toTravelerSeatChangeError`
  del archivo del store.

**1.3** Verificación de Fase 1:
- `bun run typecheck` sin errores.
- `bun run lint:fix` limpio.
- Prueba manual: alta, edición, borrado, cambio de asiento, asignación de habitación.

---

## Fase 2 — Extraer acceso a Supabase al repositorio

> **Alcance:** Crear `use-traveler-repository.ts` y delegarle todas las queries/mutaciones
> desde el store. El store pasa a ser orquestador puro de estado.  
> **Dependencia:** Fase 1 completada.  
> **Criterio de éxito:** store sin ninguna referencia directa a `supabase.from` o `supabase.rpc`.

### Pasos

**2.1** Crear `app/composables/travelers/use-traveler-repository.ts` con las siguientes
funciones (sin estado, solo async I/O):

```ts
export function useTravelerRepository() {
  // Queries
  async function fetchAll(): Promise<Traveler[]>
  async function fetchByTravel(travelId: string): Promise<Traveler[]>

  // Mutaciones
  async function insert(data: TravelerFormData): Promise<Traveler>
  async function update(id: string, data: TravelerUpdateData): Promise<Traveler>
  async function remove(id: string): Promise<void>
  async function unlinkCompanions(representativeId: string): Promise<void>

  // RPC / dominio Supabase
  async function changeSeat(params: {
    travelerId: string
    travelBusId: string
    targetSeat: number
  }): Promise<unknown>  // validación del payload queda en use-traveler-domain

  async function assignRoom(travelerId: string, travelAccommodationId: string): Promise<Traveler>
  async function removeFromRoom(travelerId: string): Promise<Traveler>

  return { fetchAll, fetchByTravel, insert, update, remove, unlinkCompanions,
           changeSeat, assignRoom, removeFromRoom }
}
```

Cada función llama a `useSupabase()` internamente, aplica `mapTravelerRowToDomain`
y lanza el error tal cual (el store decide cómo manejarlo).

**2.2** Actualizar `app/stores/use-traveler-store.ts`:
- Agregar `const repository = useTravelerRepository()`.
- En cada action, reemplazar el bloque `supabase.from(...)` por la llamada al
  método equivalente del repositorio.
- Mantener toda la lógica de merging de cache, manejo de `loading`/`error` y
  actualización del array `travelers` dentro del store (el repositorio solo
  retorna datos, no toca estado reactivo).
- Eliminar `const supabase = useSupabase()` del store una vez migradas todas las
  llamadas.

**2.3** Verificación de Fase 2:
- `bun run typecheck` sin errores.
- `bun run lint:fix` limpio.
- El store no debe contener ninguna importación de `useSupabase` ni llamadas
  directas a `.from()` o `.rpc()`.
- Prueba manual completa: mismos escenarios de Fase 1.
- Navegar entre rutas de viaje distintas y confirmar que `watch(travelId)` sigue
  disparando `fetchByTravel` correctamente (sin doble fetch).

---

## Fase 3 — Limpieza final y documentación interna

> **Alcance:** Revisión de código muerto, consistencia de nombres y actualización
> de comentarios/tipos internos. Sin cambios funcionales.  
> **Dependencia:** Fases 1 y 2 completadas.

### Pasos

**3.1** Revisar `app/stores/use-traveler-store.ts`:
- Confirmar que solo contiene: estado reactivo, getters computados (delegando a
  `domain`), acciones que llaman `repository` y actualizan cache, y `setFilters`/
  `clearFilters`.
- Eliminar cualquier función helper privada que haya quedado obsoleta.

**3.2** Revisar `app/composables/travelers/use-traveler-domain.ts`:
- Asegurar que ninguna función importa o referencia Supabase ni estado reactivo
  de Pinia.

**3.3** Revisar `app/composables/travelers/use-traveler-repository.ts`:
- Asegurar que ninguna función modifica estado reactivo; solo retorna datos o
  lanza errores.

**3.4** Verificación de Fase 3:
- `bun run typecheck` sin errores.
- `bun run lint:fix` limpio.
- Prueba de regresión completa en la página de viajeros y páginas de pagos/
  habitaciones que consumen el store.

---

## Decisiones de diseño

| Decisión | Justificación |
|---|---|
| Store mantiene ownership del cache | Evita inconsistencias si en el futuro algún componente consume el repositorio directamente |
| Repositorio no expone estado reactivo | Composable de acceso a datos puro; la reactividad es responsabilidad del store |
| Dominio sin dependencias externas | Funciones puras son trivialmente testeables sin mocks de Supabase |
| API pública del store sin cambios | Las páginas existentes no necesitan modificaciones en ninguna fase |
| Supabase permanece en store durante Fase 1 | Reduce la superficie de cambio de la primera iteración |

## Consideraciones futuras

1. Si se habilita SSR: revisar que `useTravelerRepository` se ejecute solo
   client-side o mediante un endpoint Nitro para evitar leaks de sesión.
2. Aplicar el mismo patrón a otros stores (`use-provider-store`, `use-travels-store`)
   una vez validado con travelers.
3. Si se requiere testing automatizado: los composables de dominio son la capa
   más barata de testear; empezar ahí antes de integración.


# Refactor: use-provider-store

**Objetivo:** Aplicar el patrón Repository + Domain composables al store de proveedores.
El store queda como orquestador de estado/cache; la lógica de filtrado va al dominio;
el acceso a Supabase va al repositorio. Sin cambios en la API pública del store.

**Patrón elegido:** Repository + Domain composables  
**Complejidad:** Media — 1 tabla, filtros multi-criterio, dependencia cross-store  
**Estado:** Completado

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
- Plan de referencia completado: `docs/features/completed/refactor-stores/traveler-store.md`

---

## Análisis del store actual

**Archivo:** `app/stores/use-provider-store.ts` (272 líneas)  
**Tabla:** `providers`  
**Dependencia cross-store:** `useHotelRoomStore()` — llamada en `deleteProvider`

### Lógica de dominio a extraer (Fase 1)

| Función a crear | Origen en store |
|---|---|
| `filterProviders(providers, filters): Provider[]` | lógica inline del computed `filteredProviders` (líneas 61-98) |

Los demás computeds (`allProviders`, `activeProviders`, `statsByCategory`,
`availableCiudades`, `availableEstados`, `hasActiveFilters`) son derivaciones
simples que quedan en el store.

### Acciones con Supabase a mover al repositorio (Fase 2)

| Acción en store | Función en repositorio |
|---|---|
| `fetchAll` | `fetchAll(): Promise<Provider[]>` |
| `addProvider` | `insert(data: ProviderFormData): Promise<Provider>` |
| `updateProvider` | `update(id: string, data: Partial<ProviderUpdateData>): Promise<Provider>` |
| `deleteProvider` | `remove(id: string): Promise<void>` |

`toggleProviderStatus` permanece en el store (orquestación).  
La llamada a `hotelRoomStore.deleteProviderRooms(id)` permanece en el store
(es coordinación cross-store, no I/O de Supabase).

---

## Estructura objetivo

```
app/
├── composables/
│   └── providers/
│       ├── use-provider-domain.ts      ← lógica pura de filtrado (NUEVO)
│       └── use-provider-repository.ts  ← acceso Supabase (NUEVO)
├── stores/
│   └── use-provider-store.ts           ← orquestación + cache (MODIFICADO)
└── types/
    └── provider.ts                     ← sin cambios
```

---

## Fase 1 — Extraer lógica de dominio pura ✅ COMPLETADO

> **Criterio de éxito:** `filteredProviders` computed delega a `filterProviders`.

### Pasos

**1.1** Crear `app/composables/providers/use-provider-domain.ts`:

```ts
export function filterProviders(providers: Provider[], filters: ProviderFilters): Provider[] {
  // lógica de filtrado multi-criterio extraída del computed
  // incluye: active, category, city, state, searchTerm
  // retorna resultado ordenado por nombre
}
```

**1.2** Actualizar `app/stores/use-provider-store.ts`:
- Importar `filterProviders`.
- Reemplazar la lógica inline del computed `filteredProviders` por:
  ```ts
  const filteredProviders = computed(() => filterProviders(providers.value, activeFilters.value));
  ```

**1.3** Verificación: `bun run typecheck` + `bun run lint:fix`.

---

## Fase 2 — Extraer acceso a Supabase al repositorio ✅ COMPLETADO

> **Criterio de éxito:** store sin ninguna referencia directa a `supabase.from`.

### Pasos

**2.1** Crear `app/composables/providers/use-provider-repository.ts`:

```ts
export function useProviderRepository() {
  const supabase = useSupabase();

  async function fetchAll(): Promise<Provider[]>
  async function insert(data: ProviderFormData): Promise<Provider>
  async function update(id: string, data: Partial<ProviderUpdateData>): Promise<Provider>
  async function remove(id: string): Promise<void>

  return { fetchAll, insert, update, remove }
}
```

La traducción de campos anidados (`location.city` → `location_city`,
`contact.name` → `contact_name`) va en `update()` del repositorio.

**2.2** Actualizar `app/stores/use-provider-store.ts`:
- Agregar `const repository = useProviderRepository()`.
- Reemplazar cada bloque Supabase por la llamada equivalente al repositorio.
- En `deleteProvider`: mantener la llamada a `hotelRoomStore.deleteProviderRooms(id)`
  después de `await repository.remove(id)` — esa coordinación cross-store es
  responsabilidad del store.
- Eliminar `const supabase = useSupabase()` y el import de `TablesUpdate`.

**2.3** Verificación:
- `bun run typecheck` sin errores.
- `bun run lint:fix` limpio.
- Prueba manual: alta, edición, borrado de proveedor (verificar que las
  habitaciones del proveedor también se limpian en memoria).
- Prueba de filtros: todos los criterios (categoría, ciudad, estado, búsqueda).

---

## Fase 3 — Limpieza final ✅ COMPLETADO

**3.1** Revisar `use-provider-store.ts`: solo estado, getters y actions que
llaman `repository.*` o coordinan con otros stores.

**3.2** Revisar `use-provider-domain.ts`: solo funciones puras, sin imports de
Supabase ni estado reactivo de Pinia.

**3.3** Revisar `use-provider-repository.ts`: solo async I/O, sin estado reactivo.

**3.4** Verificación final: `bun run typecheck` + `bun run lint:fix`.

---

## Decisiones de diseño

| Decisión | Justificación |
|---|---|
| `filterProviders` en dominio | Multi-criterio con 5 condiciones — lógica de negocio pura, testeable sin Vue |
| `toggleProviderStatus` permanece en store | Orquestación: lee estado actual, llama `update` — no es I/O directo |
| `hotelRoomStore.deleteProviderRooms` permanece en store | Coordinación cross-store es responsabilidad del orquestador, no del repositorio |
| Repositorio retorna `Provider` en `update` | Consistencia con el patrón; el store actualiza el cache con el valor retornado |

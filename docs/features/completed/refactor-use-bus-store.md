# Refactor: use-bus-store

**Objetivo:** Aplicar el patrón Repository + Domain composables al store de autobuses.
El store queda como orquestador de estado/cache; el acceso a Supabase va a un
composable repositorio. Sin cambios en la API pública del store ni en las páginas.

**Patrón elegido:** Repository + Domain composables  
**Complejidad:** Baja — 1 tabla, CRUD simple, sin lógica de dominio compleja  
**Nota:** Este store y `use-coordinator-store` tienen estructura idéntica.
Se pueden refactorizar en la misma sesión.  
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
- Plan de referencia completado: `docs/features/pending/plan/refactor-use-traveler-store.md`

---

## Análisis del store actual

**Archivo:** `app/stores/use-bus-store.ts` (154 líneas)  
**Tabla:** `buses`

### Lógica de dominio a extraer (Fase 1)

Este store no tiene lógica de dominio pura significativa que extraer.
`toggleBusStatus` es orquestación del store (lee estado actual y llama a `updateBus`) — queda en el store.
Los getters computados son simples filtros que no justifican un dominio separado.

**Decisión: Fase 1 se omite** — no hay funciones puras con lógica de negocio que extraer.
El refactor es solo Fase 2 (repositorio).

### Acciones con Supabase a mover al repositorio

| Acción en store | Función en repositorio |
|---|---|
| `fetchAll` | `fetchAll(): Promise<Bus[]>` |
| `addBus` | `insert(data: BusFormData): Promise<Bus>` |
| `updateBus` | `update(id: string, data: Partial<BusUpdateData>): Promise<Bus>` |
| `deleteBus` | `remove(id: string): Promise<void>` |

`toggleBusStatus` queda en el store — es orquestación, no I/O.

---

## Estructura objetivo

```
app/
├── composables/
│   └── buses/
│       └── use-bus-repository.ts     ← acceso Supabase (NUEVO)
├── stores/
│   └── use-bus-store.ts              ← orquestación + cache (MODIFICADO)
└── types/
    └── bus.ts                        ← sin cambios
```

---

## Fase 1 — OMITIDA

No hay lógica de dominio pura significativa que extraer en este store.

---

## Fase 2 — Extraer acceso a Supabase al repositorio ✅ COMPLETADO

> **Criterio de éxito:** store sin ninguna referencia directa a `supabase.from`.

### Pasos

**2.1** Crear `app/composables/buses/use-bus-repository.ts`:

```ts
export function useBusRepository() {
  const supabase = useSupabase();

  async function fetchAll(): Promise<Bus[]>
  async function insert(data: BusFormData): Promise<Bus>
  async function update(id: string, data: Partial<BusUpdateData>): Promise<Bus>
  async function remove(id: string): Promise<void>

  return { fetchAll, insert, update, remove }
}
```

Cada función aplica `mapBusRowToDomain` y lanza el error tal cual.
La traducción de campos (`seatCount` → `seat_count`) va en `update()` del repositorio.

**2.2** Actualizar `app/stores/use-bus-store.ts`:
- Agregar `const repository = useBusRepository()`.
- En `fetchAll`: reemplazar bloque Supabase por `await repository.fetchAll()`.
- En `addBus`: reemplazar bloque Supabase por `await repository.insert(data)`.
- En `updateBus`: reemplazar bloque Supabase por `await repository.update(id, data)`.
- En `deleteBus`: reemplazar bloque Supabase por `await repository.remove(id)`.
- Eliminar `const supabase = useSupabase()` y el import de `TablesUpdate`.

**Nota sobre el manejo de errores en este store:**
`addBus` y `deleteBus` no tienen `try/catch` propio — manejan errores inline.
Al migrar, mantener el mismo comportamiento de retorno (`boolean` vs `throw`).

**2.3** Verificación:
- `bun run typecheck` sin errores.
- `bun run lint:fix` limpio.
- El store no debe contener `useSupabase` ni `.from()`.
- Prueba manual: alta, edición, borrado de autobús, toggle de estado.

---

## Fase 3 — Limpieza final ✅ COMPLETADO

**3.1** Revisar `use-bus-store.ts`: solo debe contener estado, getters computados simples
y actions que llaman `repository.*`.

**3.2** Revisar `use-bus-repository.ts`: solo async I/O, sin estado reactivo.

**3.3** Verificación final: `bun run typecheck` + `bun run lint:fix`.

---

## Decisiones de diseño

| Decisión | Justificación |
|---|---|
| Fase 1 omitida | No hay lógica de dominio pura que extraer — añadir un composable vacío sería sobre-ingeniería |
| `toggleBusStatus` permanece en store | Es orquestación (lee estado, decide, llama update) — no es I/O ni lógica pura |
| Repositorio retorna `Bus` en `update` | Consistencia con el patrón traveler; el store decide qué hacer con el dato |

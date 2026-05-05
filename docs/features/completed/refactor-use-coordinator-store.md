# Refactor: use-coordinator-store

**Objetivo:** Aplicar el patrón Repository + Domain composables al store de coordinadores.
El store queda como orquestador de estado/cache; el acceso a Supabase va a un
composable repositorio. Sin cambios en la API pública del store ni en las páginas.

**Patrón elegido:** Repository + Domain composables  
**Complejidad:** Baja — 1 tabla, CRUD simple, sin lógica de dominio  
**Nota:** Este store y `use-bus-store` tienen estructura idéntica.
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
- Plan de referencia completado: `docs/features/pending/plan/refactor-use-traveler-store.md`
- Si ya hiciste `use-bus-store`, este es structuralmente idéntico.

---

## Análisis del store actual

**Archivo:** `app/stores/use-coordinator-store.ts` (129 líneas)  
**Tabla:** `coordinators`

### Lógica de dominio a extraer (Fase 1)

No hay lógica de dominio pura significativa. Los getters son lookups simples.
`allCoordinators` es un sort por fecha — queda en el store.

**Decisión: Fase 1 se omite** — no hay funciones puras con lógica de negocio que extraer.

### Acciones con Supabase a mover al repositorio

| Acción en store | Función en repositorio |
|---|---|
| `fetchAll` | `fetchAll(): Promise<Coordinator[]>` |
| `addCoordinator` | `insert(data: CoordinatorFormData): Promise<Coordinator>` |
| `updateCoordinator` | `update(id: string, data: CoordinatorUpdateData): Promise<Coordinator>` |
| `deleteCoordinator` | `remove(id: string): Promise<void>` |

---

## Estructura objetivo

```
app/
├── composables/
│   └── coordinators/
│       └── use-coordinator-repository.ts  ← acceso Supabase (NUEVO)
├── stores/
│   └── use-coordinator-store.ts           ← orquestación + cache (MODIFICADO)
└── types/
    └── coordinator.ts                     ← sin cambios
```

---

## Fase 1 — OMITIDA

No hay lógica de dominio pura significativa que extraer en este store.

---

## Fase 2 — Extraer acceso a Supabase al repositorio ✅ COMPLETADO

> **Criterio de éxito:** store sin ninguna referencia directa a `supabase.from`.

### Pasos

**2.1** Crear `app/composables/coordinators/use-coordinator-repository.ts`:

```ts
export function useCoordinatorRepository() {
  const supabase = useSupabase();

  async function fetchAll(): Promise<Coordinator[]>
  async function insert(data: CoordinatorFormData): Promise<Coordinator>
  async function update(id: string, data: CoordinatorUpdateData): Promise<Coordinator>
  async function remove(id: string): Promise<void>

  return { fetchAll, insert, update, remove }
}
```

La traducción de campos (`name` → `name`, `age` → `age`, etc.) va en `update()` del repositorio.

**2.2** Actualizar `app/stores/use-coordinator-store.ts`:
- Agregar `const repository = useCoordinatorRepository()`.
- Reemplazar cada bloque Supabase por la llamada equivalente al repositorio.
- Eliminar `const supabase = useSupabase()` y el import de `TablesUpdate`.

**Nota sobre el manejo de errores en este store:**
A diferencia del store de travelers, `updateCoordinator` retorna `Coordinator | undefined`
(no lanza el error). Mantener ese contrato de retorno en el store después de la migración.

**2.3** Verificación:
- `bun run typecheck` sin errores.
- `bun run lint:fix` limpio.
- El store no debe contener `useSupabase` ni `.from()`.
- Prueba manual: alta, edición, borrado de coordinador.

---

## Fase 3 — Limpieza final ✅ COMPLETADO

**3.1** Revisar `use-coordinator-store.ts`: solo debe contener estado, getters
y actions que llaman `repository.*`.

**3.2** Revisar `use-coordinator-repository.ts`: solo async I/O, sin estado reactivo.

**3.3** Verificación final: `bun run typecheck` + `bun run lint:fix`.

---

## Decisiones de diseño

| Decisión | Justificación |
|---|---|
| Fase 1 omitida | No hay lógica de dominio pura que extraer |
| `updateCoordinator` retorna `Coordinator \| undefined` | El store actual usa `undefined` como señal de error en vez de throw — mantener el contrato existente |
| Repositorio lanza error | El repositorio siempre lanza; el store decide si rethrow o retornar `undefined` |

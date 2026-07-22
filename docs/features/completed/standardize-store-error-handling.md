# Estandarización del manejo de errores en Pinia stores

## Contexto

Durante una auditoría de los stores se identificó que `use-bus-store.ts` y `use-traveler-store.ts`
tienen contratos de retorno inconsistentes entre sí, y algunos patrones son antipatrones que ocultan
errores al caller.

### Problema 1 — `use-bus-store.ts` retorna `boolean`

`updateBus`, `deleteBus` y `toggleBusStatus` atrapan excepciones y retornan `false` en lugar de
relanzar el error. Esto:

- Oculta el detalle del error al caller.
- Obliga al caller a checar `if (success)` en lugar de usar try/catch.
- Es inconsistente con `addBus`, que sí relanza.
- TypeScript no puede forzar que el caller revise el `boolean`.

```ts
// ❌ Antes — bus-store
async function updateBus(id: string, data: Partial<BusUpdateData>): Promise<boolean> {
  try {
    const bus = await repository.update(id, data);
    buses.value[index] = bus;
    return true;
  } catch (e) {
    error.value = '...';
    return false; // ← el caller no sabe qué falló
  }
}

// ✅ Después — bus-store
async function updateBus(id: string, data: Partial<BusUpdateData>): Promise<void> {
  try {
    const bus = await repository.update(id, data);
    buses.value[index] = bus;
  } catch (e) {
    error.value = '...';
    throw e; // ← el caller puede reaccionar
  }
}
```

### Problema 2 — `deleteTraveler` en `use-traveler-store.ts` traga el error

`deleteTraveler` es `Promise<void>` pero no relanza en el catch, por lo que el caller no puede
distinguir éxito de fallo.

```ts
// ❌ Antes — traveler-store
async function deleteTraveler(id: string): Promise<void> {
  try {
    await repository.remove(id);
    travelers.value = travelers.value.filter(t => t.id !== id);
  } catch (e) {
    error.value = '...'; // ← error guardado en estado, pero caller no lo sabe
  }
}

// ✅ Después — traveler-store
async function deleteTraveler(id: string): Promise<void> {
  try {
    await repository.remove(id);
    travelers.value = travelers.value.filter(t => t.id !== id);
  } catch (e) {
    error.value = '...';
    throw e; // ← relanzar para que el caller pueda mostrar un toast de error
  }
}
```

---

## Regla de diseño (a aplicar en todos los stores)

| Caso | Tipo de retorno | En catch |
|---|---|---|
| La operación crea/actualiza algo con dato útil | `Promise<T>` | `throw e` |
| La operación no retorna dato útil (delete, fetch) | `Promise<void>` | `throw e` |
| **Nunca** | `Promise<boolean>` | — |

La excepción es `changeTravelerSeat` que lanza un `TravelerSeatChangeError` tipado — ese patrón
es correcto y no debe modificarse.

---

## Archivos a modificar

### 1. `app/stores/use-bus-store.ts`

Funciones a cambiar:

- `updateBus`: `Promise<boolean>` → `Promise<void>`, eliminar `return true`/`return false`, agregar `throw e` en catch.
- `deleteBus`: `Promise<boolean>` → `Promise<void>`, mismo patrón.
- `toggleBusStatus`: `Promise<boolean>` → `Promise<void>`. Ya delega a `updateBus`, pero hay que
  manejar el caso `!bus` lanzando en lugar de retornar `false`:

```ts
// ✅ toggleBusStatus después
async function toggleBusStatus(id: string): Promise<void> {
  const bus = getBusById.value(id);
  if (!bus) {
    error.value = 'Autobús no encontrado';
    throw new Error('Autobús no encontrado');
  }
  await updateBus(id, { active: !bus.active });
}
```

### 2. `app/stores/use-traveler-store.ts`

Funciones a cambiar:

- `deleteTraveler`: agregar `throw e` en el bloque catch. No cambiar el tipo de retorno (ya es `void`).

---

## Archivos de caller afectados (ajustar después de cambiar los stores)

Estos archivos usan las funciones modificadas y deben actualizarse para eliminar el chequeo de
`boolean` y usar try/catch correctamente.

### `app/components/bus-list.vue`

**`handleFormSubmit`** — ya tiene try/catch, solo eliminar el `if (success)`:

```ts
// ❌ Antes
const success = await busStore.updateBus(editingBus.value.id, data);
if (success) {
  toast.add({ title: 'Unidad actualizada', color: 'primary' });
  closeModal();
}

// ✅ Después
await busStore.updateBus(editingBus.value.id, data);
toast.add({ title: 'Unidad actualizada', color: 'primary' });
closeModal();
```

**`handleDelete`** — no tiene try/catch, agregarlo:

```ts
// ✅ Después
async function handleDelete(bus: Bus) {
  const label = [bus.brand, bus.model].filter(Boolean).join(' ') || 'esta unidad';
  if (confirm(`¿Eliminar ${label}?`)) {
    try {
      await busStore.deleteBus(bus.id);
      toast.add({ title: 'Unidad eliminada', color: 'warning' });
    } catch {
      toast.add({ title: 'Error', description: 'No se pudo eliminar la unidad', color: 'error' });
    }
  }
}
```

**`handleToggleStatus`** — no tiene try/catch, agregarlo:

```ts
// ✅ Después
async function handleToggleStatus(bus: Bus) {
  try {
    await busStore.toggleBusStatus(bus.id);
    toast.add({
      title: 'Estado actualizado',
      description: `La unidad ahora está ${!bus.active ? 'activa' : 'inactiva'}`,
      color: 'primary',
    });
  } catch {
    toast.add({ title: 'Error', description: 'No se pudo actualizar el estado', color: 'error' });
  }
}
```

### `app/pages/travels/[id]/travelers/index.vue`

**`handleDelete`** — el toast siempre se dispara aunque falle; moverlo al bloque try:

```ts
// ❌ Antes — toast fuera del try, se muestra aunque falle
await travelerStore.deleteTraveler(traveler.id);
toast.add({ title: 'Viajero eliminado', ... });

// ✅ Después
async function handleDelete(traveler: Traveler) {
  if (confirm(`¿Estás seguro de eliminar a ${traveler.firstName} ${traveler.lastName}?`)) {
    try {
      await travelerStore.deleteTraveler(traveler.id);
      if (seatChangeContext.value?.travelerId === traveler.id) {
        clearSeatChangeState();
      }
      toast.add({
        title: 'Viajero eliminado',
        description: `${traveler.firstName} ${traveler.lastName} se eliminó correctamente`,
        color: 'warning',
      });
    } catch {
      toast.add({ title: 'Error', description: 'No se pudo eliminar el viajero', color: 'error' });
    }
  }
}
```

---

## Orden de implementación

1. Modificar `use-bus-store.ts` (stores primero, los callers los detecta TypeScript como error)
2. Modificar `use-traveler-store.ts`
3. Modificar `bus-list.vue`
4. Modificar `travelers/index.vue`

---

## Skills requeridos

```
vue-best-practices
pinia
vue-testing-best-practices
```

---

## Validación post-cambio

1. `bun run typecheck` — TypeScript no debe reportar errores nuevos.
2. `bun run lint:fix` — sin warnings nuevos.
3. Verificar manualmente en el navegador:
   - Crear, editar y eliminar un autobús.
   - Activar/desactivar un autobús.
   - Eliminar un viajero con y sin acompañantes.
4. Simular un error de red (desconectar Supabase) y confirmar que el toast de error aparece
   correctamente en lugar del toast de éxito.

---

## Notas adicionales

- **No** modificar `changeTravelerSeat` — ya usa un patrón de error tipado (`TravelerSeatChangeError`) que es correcto.
- **No** modificar los otros stores (`use-cotizacion-store`, etc.) en este PR — ese es un trabajo separado si se detectan los mismos antipatrones.
- La regla `throw e` en catch del store + try/catch en el caller es el contrato estándar que debe aplicarse a todos los stores futuros del proyecto.

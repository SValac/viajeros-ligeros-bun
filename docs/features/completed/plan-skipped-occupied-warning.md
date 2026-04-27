# Plan: Warning cuando habitaciones ocupadas no pueden eliminarse

**TL;DR**: Cambiar `_syncHospedajeToTravel` para retornar `{ skippedOccupied: number }`, propagarlo a través de las 3 acciones del store, y mostrar un toast de advertencia en los 2 componentes de UI.

## Steps

### `app/stores/use-cotizacion-store.ts`

1. Cambiar firma de `_syncHospedajeToTravel` de `Promise<void>` a `Promise<{ skippedOccupied: number }>`
2. Cambiar `return;` en early return a `return { skippedOccupied: 0 };`
3. Agregar `let skippedOccupied = 0;` junto con `toDeleteIds`/`toInsert`
4. En el bloque `desiredCount < existingCount`, agregar `skippedOccupied++` en el `else` del for loop
5. En el bloque "remove groups not in desired state", agregar `skippedOccupied++` en el `else`
6. Cambiar el final de la función a `return { skippedOccupied };`
7. En `addHospedajeQuotation`: capturar resultado del sync → `return { ...newHospedaje, skippedOccupied: addSyncResult.skippedOccupied }`
8. En `updateHospedajeQuotation`: capturar resultado → `return { ...updated, skippedOccupied: updateSyncResult.skippedOccupied }`
9. En `deleteHospedajeQuotation`: cambiar a `Promise<number>`, early returns a `return 0`, capturar resultado y `return deleteSyncResult.skippedOccupied`, catch también `return 0`

### `app/components/cotizacion-hospedaje-tabla.vue`

10. En `guardarEdicion`: después del toast success, agregar toast warning si `updated.skippedOccupied > 0`
11. En `eliminarHospedaje`: capturar el número retornado, agregar toast warning si `skippedOccupied > 0`

### `app/components/cotizacion-hospedaje-form.vue`

12. En `handleSubmit`: después del toast success, agregar toast warning si `response.skippedOccupied > 0`

## Relevant files

- `app/stores/use-cotizacion-store.ts` — función `_syncHospedajeToTravel` + 3 acciones que la llaman
- `app/components/cotizacion-hospedaje-tabla.vue` — `guardarEdicion` + `eliminarHospedaje`
- `app/components/cotizacion-hospedaje-form.vue` — `handleSubmit`

## Verification

1. Editar hospedaje con rooms ocupadas → toast warning aparece con conteo correcto
2. Eliminar hospedaje con rooms ocupadas → toast warning aparece
3. `bun run typecheck` pasa sin errores
4. `bun run lint:fix` pasa sin errores

## Decisions

- El mensaje de advertencia dura 8 segundos (`duration: 8000`) para que el usuario pueda leerlo
- El texto explica qué hacer: "Remueve los viajeros manualmente si deseas liberar esas habitaciones"
- Se usa `color: 'warning'` en el toast de Nuxt UI

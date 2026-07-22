# Código de Acceso al Viaje — Fase 4: Store Pinia

**Objetivo:** Crear `use-travel-access-store.ts`, el store que orquesta el repositorio
y mantiene el código revelado en memoria (nunca persistido).

**Dependencia:** [Fase 3](travel-access-fase3-repository-domain.md) — necesita el
repositorio y el dominio ya creados.
**Estado:** Pendiente

---

## Rol del asistente

**Modo:** Mentor / Guía de implementación
**Comportamiento:** Explicar el *por qué* antes de cada paso. No escribir código
a menos que el usuario lo pida explícitamente. El usuario escribe el código y corre
`bun run typecheck` al terminar.

**Referencia de estilo:** `app/stores/use-travel-media-store.ts` — Pinia setup store
con estado por `travelId`, acciones async con try/catch + toast, mismo patrón a seguir
aquí.

---

## Por qué `revealedCodeByTravel` es clave

El RPC `generate_travel_access_code` devuelve el código en texto plano **una sola
vez** (Fase 2). Si ese valor se guardara en cualquier lugar persistente (localStorage,
Pinia con plugin de persistencia, etc.) dejaría de cumplirse la garantía de "se
muestra una sola vez". Por eso `revealedCodeByTravel` vive **solo en memoria** del
store — se pierde al recargar la página, lo que fuerza naturalmente ese
comportamiento sin lógica adicional.

---

## Diseño de `app/stores/use-travel-access-store.ts`

Pinia setup store (`defineStore('useTravelAccessStore', () => {...})`):

**Estado:**
- `activeCodeByTravel: Record<string, TravelAccessCode | null>` — metadata del código
  activo (sin el texto plano), por viaje.
- `revealedCodeByTravel: Record<string, string | null>` — el código en texto plano,
  solo para el viaje que se acaba de generar en esta sesión de navegador.
- `loading: Ref<boolean>`, `error: Ref<string | null>`.

**Getters:**
- `getActiveCode(travelId)` → `activeCodeByTravel.value[travelId] ?? null`
- `getRevealedCode(travelId)` → `revealedCodeByTravel.value[travelId] ?? null`

**Acciones:**
- `fetchActiveCode(travelId)` — llama al repositorio, guarda en `activeCodeByTravel`.
- `generateCode(travelId)` — llama a `repository.generate`, guarda el resultado en
  ambos maps (`activeCodeByTravel` con la metadata, `revealedCodeByTravel` con el
  código); usa `toTravelAccessCodeError` + `toast.add` en el catch.
- `revokeCode(travelId)` — llama a `repository.revoke`, limpia ambos maps para ese
  `travelId`, toast de confirmación.

La confirmación de "esto invalidará el código actual" antes de regenerar es
responsabilidad del **componente** (Fase 5), no del store — el store solo ejecuta.

---

## Pasos de implementación

**4.1** Crear `app/stores/use-travel-access-store.ts` con el estado/getters/acciones
de arriba, siguiendo el estilo de `use-travel-media-store.ts`.

**4.2** `bun run typecheck` sin errores.

---

## Verificación

- Desde la consola del navegador (con la app corriendo), llamar
  `useTravelAccessStore().generateCode(travelId)` sobre un viaje `published` propio →
  `getRevealedCode(travelId)` devuelve el código; `getActiveCode(travelId)` devuelve
  la metadata (sin `code`).
- Recargar la página y volver a consultar `getRevealedCode(travelId)` → debe devolver
  `null` (confirma que no persiste).
